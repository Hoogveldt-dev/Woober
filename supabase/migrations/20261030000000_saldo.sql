-- Saldo van uitlaters (de wallet). Wat een uitlater verdient, blijft staan tot hij het zelf laat uitbetalen, in één
-- keer in plaats van na elke wandeling. Hij kan het ook gebruiken om als eigenaar zelf een uitlater of oppas te betalen.
--
-- Het geld zelf blijft bij Mollie, niet bij Woober (zie PLAN.md, Betalen met Mollie Connect): het saldo is wat nog
-- niet naar de uitlater is gerouteerd. Deze migratie houdt bij wat er staat, wat gereserveerd is en wat is gevraagd;
-- het serverproces (supabase/functions/betalingen-verwerken) leest de tabel uitbetalingen. Dezelfde regels staan in
-- src/lib/saldo.ts.

-- Deel van de prijs dat de eigenaar met zijn saldo als uitlater betaalt; de rest gaat via de betaalmethode
alter table public.boekingen add column met_saldo integer not null default 0 check (met_saldo >= 0);

alter table public.grootboek drop constraint grootboek_gebeurtenis_check;
alter table public.grootboek add constraint grootboek_gebeurtenis_check
  check (gebeurtenis in ('afgerond', 'annulering', 'fooi', 'abonnement', 'uitbetaling', 'betaald_met_saldo'));

create table public.uitbetalingen (
  id uuid primary key default gen_random_uuid(),
  -- Blijft bewaard als het account weg is (fiscale bewaarplicht), net als het grootboek
  uitlater_id uuid references public.profielen (id) on delete set null,
  bedrag integer not null check (bedrag > 0),
  status text not null default 'aangevraagd' check (status in ('aangevraagd', 'onderweg', 'betaald', 'mislukt')),
  -- Kenmerk bij de betaalpartner (route of uitbetaling)
  extern_id text,
  aangemaakt timestamptz not null default now()
);
create index on public.uitbetalingen (uitlater_id, aangemaakt);
alter table public.uitbetalingen enable row level security;
create policy "eigen uitbetalingen" on public.uitbetalingen for select to authenticated using (uitlater_id = (select auth.uid()));
revoke insert, update, delete on public.uitbetalingen from authenticated;

-- Saldo: alles op de rekening uitlater in het grootboek (verdiend, uitbetaald, met saldo betaald), min wat nu
-- gereserveerd staat voor eigen boekingen die nog lopen. Bij annuleren vervalt de reservering vanzelf.
create or replace function public.saldo_van(p_persoon uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select (
    coalesce((select sum(bedrag) from public.grootboek where rekening = 'uitlater' and persoon_id = p_persoon), 0)
    - coalesce((select sum(met_saldo) from public.boekingen
                where eigenaar_id = p_persoon and status in ('aangevraagd', 'gepland', 'onderweg', 'aangekomen', 'bezig')), 0)
  )::integer;
$$;

create or replace function public.mijn_saldo()
returns integer language sql stable security definer set search_path = '' as $$
  select public.saldo_van((select auth.uid()));
$$;

-- Uitbetalen kan vanaf 10 euro, of het hele saldo in één keer
create or replace function public.vraag_uitbetaling_aan(p_bedrag integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  beschikbaar integer;
  nieuw uuid;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  -- Ook een slot, zodat twee verzoeken tegelijk niet samen meer dan het saldo opvragen
  perform 1 from public.uitlaters where id = ik and uitbetaling_ok for update;
  if not found then raise exception 'Koppel eerst je rekening'; end if;
  beschikbaar := public.saldo_van(ik);
  if p_bedrag is null or p_bedrag <= 0 then raise exception 'Vul een bedrag in'; end if;
  if p_bedrag > beschikbaar then raise exception 'Zoveel staat er niet op je saldo'; end if;
  if p_bedrag < 1000 and p_bedrag <> beschikbaar then raise exception 'Uitbetalen kan vanaf 10 euro, of je hele saldo'; end if;
  insert into public.uitbetalingen (uitlater_id, bedrag) values (ik, p_bedrag) returning id into nieuw;
  insert into public.grootboek (gebeurtenis, rekening, persoon_id, bedrag) values ('uitbetaling', 'uitlater', ik, -p_bedrag);
  return nieuw;
end;
$$;

-- De eigenaar betaalt (een deel van) een eigen boeking met zijn saldo als uitlater. Kan zolang de boeking niet is
-- begonnen; 0 haalt het weer weg. De prijs verandert niet: de uitlater van de boeking krijgt evenveel.
create or replace function public.betaal_met_saldo(p_boeking uuid, p_bedrag integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  b public.boekingen;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  perform 1 from public.uitlaters where id = ik for update;
  select * into b from public.boekingen where id = p_boeking for update;
  if not found or b.eigenaar_id is distinct from ik or b.soort <> 'betaald' or b.status not in ('aangevraagd', 'gepland') then
    raise exception 'Deze stap kan nu niet';
  end if;
  if p_bedrag is null or p_bedrag < 0 or p_bedrag > b.totaal then raise exception 'Ongeldig bedrag'; end if;
  -- De eigen reservering van deze boeking telt mee als beschikbaar
  if p_bedrag > public.saldo_van(ik) + b.met_saldo then raise exception 'Zoveel staat er niet op je saldo'; end if;
  update public.boekingen set met_saldo = p_bedrag where id = p_boeking;
  return p_bedrag;
end;
$$;

-- Bij het afronden gaat het met saldo betaalde deel van het saldo af; de eigenaar betaalt dat deel dus niet extern.
-- Per boeking blijft het grootboek op nul uitkomen.
create or replace function public.boek_saldo_betaling()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.soort = 'betaald' and new.status = 'afgerond' and old.status <> 'afgerond' and new.met_saldo > 0 then
    insert into public.grootboek (boeking_id, gebeurtenis, rekening, persoon_id, bedrag)
    values (new.id, 'betaald_met_saldo', 'uitlater', new.eigenaar_id, -new.met_saldo),
           (new.id, 'betaald_met_saldo', 'eigenaar', new.eigenaar_id, new.met_saldo);
  end if;
  return new;
end;
$$;
create trigger saldo_betaling after update on public.boekingen for each row execute function public.boek_saldo_betaling();

-- Account verwijderen kan pas als het saldo is uitbetaald, anders raakt een uitlater geld kwijt
create or replace function public.verwijder_mijn_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  if public.saldo_van(ik) > 0 then raise exception 'Laat eerst je saldo uitbetalen, dan kun je je account verwijderen'; end if;
  -- Verwijdert via on delete cascade ook profiel, adres, honden, uitlaatprofiel, boekingen en berichten
  delete from auth.users where id = ik;
end;
$$;

revoke execute on function public.saldo_van, public.boek_saldo_betaling from public, anon, authenticated;
revoke execute on function public.mijn_saldo, public.vraag_uitbetaling_aan, public.betaal_met_saldo, public.verwijder_mijn_account from public, anon;
grant execute on function public.mijn_saldo, public.vraag_uitbetaling_aan, public.betaal_met_saldo, public.verwijder_mijn_account to authenticated;
