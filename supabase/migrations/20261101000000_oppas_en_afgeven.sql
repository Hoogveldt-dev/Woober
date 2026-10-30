-- Oppas bij de oppas thuis, afspraken over het huis bij oppas bij de eigenaar thuis, en de hond afgeven op een ander
-- punt dan thuis.
--
-- Wie ziet welk adres:
-- * de uitlater ziet het adres van de eigenaar na accepteren, behalve als de hond op een ander punt wordt afgegeven of
--   bij de oppas thuis is;
-- * bij oppas bij de oppas thuis ziet de eigenaar na accepteren het adres van de oppas.

create type public.oppas_plek as enum ('bij_eigenaar', 'bij_oppas');

-- Waar iemand oppast. Wie honden thuis ontvangt, beschrijft het huis en waarom het geschikt is, zonder adres: eigenaren
-- lezen dit al bij het kiezen.
alter table public.uitlaters
  add column oppas_plekken public.oppas_plek[] not null default '{bij_eigenaar}' check (cardinality(oppas_plekken) >= 1),
  add column huis_omschrijving text not null default '' check (char_length(huis_omschrijving) <= 500),
  add column huis_kenmerken text[] not null default '{}' check (huis_kenmerken <@ array['tuin', 'huisdieren', 'kinderen', 'rookvrij']),
  add constraint huis_beschreven check (not ('bij_oppas' = any (oppas_plekken)) or char_length(huis_omschrijving) >= 40);
-- Kolomrechten zoals in de eerste migratie: de uitlater past alleen het eigen profiel aan, niet de verificatie
grant insert (oppas_plekken, huis_omschrijving, huis_kenmerken), update (oppas_plekken, huis_omschrijving, huis_kenmerken)
  on public.uitlaters to authenticated;

alter table public.boekingen
  -- Alleen bij oppas
  add column oppas_plek public.oppas_plek,
  -- Bij oppas bij de eigenaar thuis: waar de camera's hangen, wat de oppas mag gebruiken en wat privé is. De oppas
  -- ziet het al bij het verzoek, zodat die weet waar die aan begint.
  add column camera_waar text not null default '' check (char_length(camera_waar) <= 200),
  add column voorzieningen text[] not null default '{}' check (voorzieningen <@ array['wifi', 'koffie_thee', 'tv', 'koelkast']),
  add column huisregels text not null default '' check (char_length(huisregels) <= 300),
  -- Afgeven op een ander punt dan thuis, bij uitlaten en kennismaken: de eigenaar geeft de hond zelf mee en haalt hem
  -- daar weer op, en de uitlater ziet het adres niet
  add column afgifte text check (char_length(afgifte) between 3 and 150),
  add column afgifte_lat double precision,
  add column afgifte_lng double precision,
  add constraint oppas_plek_alleen_bij_oppas check ((dienst = 'oppas') = (oppas_plek is not null)),
  add constraint camera_beschreven check (not camera_in_huis or char_length(camera_waar) >= 3),
  add constraint afgifte_compleet check ((afgifte is null) = (afgifte_lat is null) and (afgifte is null) = (afgifte_lng is null)),
  add constraint afgifte_alleen_uitlaten check (afgifte is null or (dienst = 'uitlaten' and sleutel = 'thuis'));

drop policy "adres voor uitlater van geaccepteerde boeking" on public.adressen;
create policy "adres voor uitlater van geaccepteerde boeking" on public.adressen for select to authenticated using (
  exists (
    select 1 from public.boekingen b
    where b.eigenaar_id = adressen.gebruiker_id and b.uitlater_id = (select auth.uid())
      and b.status in ('gepland', 'onderweg', 'aangekomen', 'bezig')
      and b.afgifte is null and b.oppas_plek is distinct from 'bij_oppas'
  )
);
create policy "adres van de oppas bij oppas bij de oppas thuis" on public.adressen for select to authenticated using (
  exists (
    select 1 from public.boekingen b
    where b.uitlater_id = adressen.gebruiker_id and b.eigenaar_id = (select auth.uid())
      and b.status in ('gepland', 'onderweg', 'aangekomen', 'bezig') and b.oppas_plek = 'bij_oppas'
  )
);

-- Zelfde regels als in 20261022010000_verdienmodel.sql, met waar de oppas is, de afspraken over het huis en het
-- afgiftepunt erbij
drop function public.vraag_boeking_aan(public.dienst, uuid, uuid[], smallint, timestamptz, public.sleutel, text, public.betaalmethode, boolean, uuid);
create or replace function public.vraag_boeking_aan(
  p_dienst public.dienst,
  p_uitlater uuid,
  p_honden uuid[],
  p_duur smallint,
  p_moment timestamptz,
  p_sleutel public.sleutel,
  p_notitie text,
  p_betaalmethode public.betaalmethode,
  p_camera_in_huis boolean default false,
  p_serie uuid default null,
  p_oppas_plek public.oppas_plek default 'bij_eigenaar',
  p_camera_waar text default '',
  p_voorzieningen text[] default '{}',
  p_huisregels text default '',
  p_afgifte text default null,
  p_afgifte_lat double precision default null,
  p_afgifte_lng double precision default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  u public.uitlaters;
  m public.verdienmodellen := public.actief_verdienmodel();
  toeslag integer;
  gebied text;
  p public.prijs_opbouw;
  thuis boolean := p_dienst = 'oppas' and p_oppas_plek = 'bij_eigenaar';
  bij_oppas boolean := p_dienst = 'oppas' and p_oppas_plek = 'bij_oppas';
  afgifte text := case when p_dienst = 'uitlaten' then nullif(trim(p_afgifte), '') end;
  nieuw uuid;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  if m.id is null then raise exception 'Geen verdienmodel actief'; end if;
  select * into u from public.uitlaters where id = p_uitlater;
  if not found or not public.mag_uitlaten(u) then raise exception 'Deze uitlater kan nu geen boekingen aannemen'; end if;
  if public.is_geblokkeerd(ik, p_uitlater) then raise exception 'Niet mogelijk'; end if;
  if not (p_dienst = any (u.diensten)) then raise exception 'Deze persoon biedt deze dienst niet aan'; end if;
  if p_dienst = 'oppas' and not (coalesce(p_oppas_plek, 'bij_eigenaar') = any (u.oppas_plekken)) then
    raise exception 'Deze oppas past niet op deze plek op';
  end if;
  if bij_oppas and not exists (select 1 from public.adressen where gebruiker_id = p_uitlater) then
    raise exception 'Deze oppas heeft nog geen adres ingevuld';
  end if;
  if thuis and coalesce(p_camera_in_huis, false) and char_length(trim(coalesce(p_camera_waar, ''))) < 3 then
    raise exception 'Vertel waar de camera''s hangen';
  end if;
  if afgifte is not null and (p_afgifte_lat is null or p_afgifte_lng is null) then
    raise exception 'Kies het afgiftepunt op de kaart';
  end if;
  if (p_dienst = 'uitlaten' and p_duur not in (30, 45, 60)) or (p_dienst = 'oppas' and p_duur not in (120, 180, 240, 300)) then
    raise exception 'Ongeldige duur';
  end if;
  if not public.kent_elkaar(ik, p_uitlater) then raise exception 'Plan eerst een kennismaking'; end if;
  if array_length(p_honden, 1) > u.max_honden then raise exception 'Te veel honden voor deze uitlater'; end if;
  if exists (select 1 from unnest(p_honden) h where not exists (select 1 from public.honden where id = h and eigenaar_id = ik)) then
    raise exception 'Onbekende hond';
  end if;
  if p_moment is null and not u.online then raise exception 'Deze uitlater is nu niet online'; end if;

  -- Eén boeking tegelijk per eigenaar, zodat tegoed niet twee keer wordt gebruikt
  perform 1 from public.profielen where id = ik for update;
  toeslag := (array_length(p_honden, 1) - 1) * u.toeslag_extra_hond;
  select left(postcode, 4) into gebied from public.adressen where gebruiker_id = ik;
  p := public.bereken_prijs(m, public.tarief_voor(u, p_dienst, p_duur), toeslag,
                            public.drukte_voor(m, gebied, p_dienst, coalesce(p_moment, now())),
                            public.heeft_plus(ik), public.tegoed_saldo(ik));
  if p.tarief is null then raise exception 'Ongeldige duur'; end if;

  insert into public.boekingen (dienst, eigenaar_id, uitlater_id, hond_ids, duur, moment, serie_id, sleutel, notitie,
                                oppas_plek, camera_in_huis, camera_waar, voorzieningen, huisregels,
                                afgifte, afgifte_lat, afgifte_lng,
                                betaalmethode, verdienmodel_id, tarief, toeslag, drukte_factor, drukte, drukte_uitlater,
                                servicekosten, plus, boekingskosten, korting, commissie)
  values (p_dienst, ik, p_uitlater, p_honden, p_duur, p_moment, p_serie,
          -- Bij de oppas thuis of op een ander punt geeft de eigenaar de hond zelf mee
          case when bij_oppas or afgifte is not null then 'thuis' else p_sleutel end,
          left(coalesce(p_notitie, ''), 300),
          case when p_dienst = 'oppas' then coalesce(p_oppas_plek, 'bij_eigenaar') end,
          thuis and coalesce(p_camera_in_huis, false),
          case when thuis and coalesce(p_camera_in_huis, false) then left(trim(coalesce(p_camera_waar, '')), 200) else '' end,
          case when thuis then coalesce(p_voorzieningen, '{}') else '{}' end,
          case when thuis then left(trim(coalesce(p_huisregels, '')), 300) else '' end,
          afgifte, case when afgifte is not null then p_afgifte_lat end, case when afgifte is not null then p_afgifte_lng end,
          p_betaalmethode, p.verdienmodel_id, p.tarief, p.toeslag,
          p.drukte_factor, p.drukte, p.drukte_uitlater, p.servicekosten, p.plus, p.boekingskosten, p.korting, p.commissie)
  returning id into nieuw;

  if p.korting > 0 then
    insert into public.tegoed_mutaties (eigenaar_id, bedrag, reden, boeking_id) values (ik, -p.korting, 'boeking', nieuw);
  end if;
  insert into public.ophaalcodes (boeking_id, code) values (nieuw, lpad((floor(random() * 9000) + 1000)::text, 4, '0'));
  return nieuw;
end;
$$;

-- Kennismaken kan ook op een openbare plek in plaats van thuis
drop function public.vraag_kennismaking_aan(uuid, timestamptz);
create or replace function public.vraag_kennismaking_aan(
  p_uitlater uuid,
  p_moment timestamptz,
  p_afgifte text default null,
  p_afgifte_lat double precision default null,
  p_afgifte_lng double precision default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  plek text := nullif(trim(p_afgifte), '');
  nieuw uuid;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  if public.is_geblokkeerd(ik, p_uitlater) then raise exception 'Niet mogelijk'; end if;
  if p_moment < now() + interval '1 hour' then raise exception 'Kies een moment minstens een uur vooruit'; end if;
  if plek is not null and (p_afgifte_lat is null or p_afgifte_lng is null) then raise exception 'Kies de plek op de kaart'; end if;
  insert into public.boekingen (soort, eigenaar_id, uitlater_id, hond_ids, duur, moment, afgifte, afgifte_lat, afgifte_lng)
  values ('kennismaking', ik, p_uitlater, (select array_agg(id) from public.honden where eigenaar_id = ik), 30, p_moment,
          plek, case when plek is not null then p_afgifte_lat end, case when plek is not null then p_afgifte_lng end)
  returning id into nieuw;
  return nieuw;
end;
$$;

revoke execute on function public.vraag_boeking_aan, public.vraag_kennismaking_aan from public, anon;
grant execute on function public.vraag_boeking_aan, public.vraag_kennismaking_aan to authenticated;
