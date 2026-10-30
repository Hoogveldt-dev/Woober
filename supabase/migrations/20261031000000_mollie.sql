-- Betalen via Mollie Connect for Marketplaces met vertraagde routing (PLAN.md, Betalen).
--
-- Eigenaren betalen per boeking aan het marktplaatsaccount van Woober bij Mollie. Mollie houdt het geld vast; Woober
-- routeert het pas naar de Mollie-organisatie van een uitlater als die zijn saldo laat uitbetalen, of automatisch
-- voordat Mollie het na 90 dagen zelf naar het saldo van Woober zet. Wat niet naar uitlaters gaat (commissie,
-- servicekosten), blijft ongerouteerd en komt zo vanzelf bij Woober.
--
-- Het werk met Mollie zelf (betaling starten, webhook, terugbetalen, routeren, aansluiten) staat in
-- supabase/functions/ en loopt met de service_role. Deze migratie bewaart de toestand en rekent uit wat er
-- terugbetaald en gerouteerd moet worden. Alle functies hier zijn alleen voor de server, behalve mijn_mollie_koppeling().

-- De kolom voor Stripe is niet meer nodig; betalingen staan voortaan in de tabel betalingen
alter table public.boekingen drop column stripe_payment_intent;
-- De eigenaar heeft het deel betaald dat niet met saldo gaat; pas dan kan de uitlater accepteren
alter table public.boekingen add column betaald boolean not null default false;
-- Een fooi telt pas als hij via Mollie is betaald (verwerk_betaling); zelf invullen zou Woober laten bijleggen
drop policy "fooi na afloop" on public.boekingen;
revoke update (fooi) on public.boekingen from authenticated;

-- Betalingen ------------------------------------------------------------------------

create table public.betalingen (
  -- Kenmerk bij Mollie, zoals tr_WDqYK6vllg
  id text primary key check (id ~ '^tr_[A-Za-z0-9]+$'),
  -- Blijft bewaard als het account weg is (fiscale bewaarplicht), net als het grootboek
  boeking_id uuid references public.boekingen (id) on delete set null,
  soort text not null default 'boeking' check (soort in ('boeking', 'fooi')),
  bedrag integer not null check (bedrag > 0),
  methode public.betaalmethode not null,
  status text not null default 'open' check (status in ('open', 'betaald', 'mislukt')),
  terugbetaald integer not null default 0 check (terugbetaald >= 0),
  aangemaakt timestamptz not null default now(),
  betaald_op timestamptz,
  check (terugbetaald <= bedrag)
);
create index on public.betalingen (boeking_id);
alter table public.betalingen enable row level security;
-- De eigenaar ziet de stand van zijn eigen betalingen (bijvoorbeeld na terugkomen van de betaalpagina)
create policy "eigen betalingen" on public.betalingen for select to authenticated
  using (exists (select 1 from public.boekingen b where b.id = boeking_id and b.eigenaar_id = (select auth.uid())));
revoke insert, update, delete on public.betalingen from authenticated, anon;

-- Accepteren kan pas als er betaald is (of als het saldo alles dekt). Bij een boeking voor nu accepteert de
-- uitlater door meteen onderweg te gaan, dus elke stap uit aangevraagd telt, behalve annuleren en weigeren.
create or replace function public.eerst_betaald()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'aangevraagd' and new.status not in ('aangevraagd', 'geannuleerd', 'geweigerd') and new.soort = 'betaald'
     -- totaal is een berekende kolom en in een before-trigger nog leeg; een statuswijziging verandert hem niet
     and old.totaal - old.met_saldo > 0 and not new.betaald then
    raise exception 'De eigenaar heeft nog niet betaald';
  end if;
  return new;
end;
$$;
create trigger eerst_betaald before update of status on public.boekingen for each row execute function public.eerst_betaald();

-- Wat er bij een boeking te betalen is; controleert of de boeking van deze eigenaar is
create or replace function public.betaling_voor(p_boeking uuid, p_eigenaar uuid, p_soort text default 'boeking', p_fooi integer default null)
returns table (bedrag integer, methode public.betaalmethode, omschrijving text)
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.boekingen;
  naam text;
begin
  select * into b from public.boekingen where id = p_boeking;
  if not found or b.eigenaar_id is distinct from p_eigenaar then raise exception 'Deze boeking hoort niet bij jou'; end if;
  select voornaam into naam from public.profielen where id = b.uitlater_id;
  if p_soort = 'fooi' then
    if b.status <> 'afgerond' or b.soort <> 'betaald' then raise exception 'Een fooi kan na afloop'; end if;
    if p_fooi is null or p_fooi < 100 or b.fooi + p_fooi > 5000 then raise exception 'Een fooi is 1 tot 50 euro'; end if;
    return query select p_fooi, b.betaalmethode, format('Woober: fooi voor %s', coalesce(naam, 'je uitlater'));
    return;
  end if;
  if b.soort <> 'betaald' or b.status <> 'aangevraagd' or b.betaald then raise exception 'Deze boeking hoeft nu niet betaald te worden'; end if;
  if b.totaal - b.met_saldo <= 0 then raise exception 'Je saldo dekt deze boeking al'; end if;
  return query select (b.totaal - b.met_saldo)::integer, b.betaalmethode,
    format('Woober: %s met %s', case when b.dienst = 'oppas' then 'oppas' else 'uitlaten' end, coalesce(naam, 'je uitlater'));
end;
$$;

create or replace function public.registreer_betaling(p_id text, p_boeking uuid, p_soort text, p_bedrag integer, p_methode public.betaalmethode)
returns void language sql security definer set search_path = '' as $$
  insert into public.betalingen (id, boeking_id, soort, bedrag, methode) values (p_id, p_boeking, p_soort, p_bedrag, p_methode)
  on conflict (id) do nothing;
$$;

-- Verwerkt de stand die de webhook bij Mollie opvroeg. Onbekende betalingen doen niets.
create or replace function public.verwerk_betaling(p_id text, p_status text, p_terugbetaald integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.betalingen;
  was text;
begin
  if p_status not in ('open', 'betaald', 'mislukt') then raise exception 'Onbekende status %', p_status; end if;
  select status into was from public.betalingen where id = p_id for update;
  if not found then return; end if;
  update public.betalingen
  set status = case when status = 'betaald' then status else p_status end,
      betaald_op = case when p_status = 'betaald' and betaald_op is null then now() else betaald_op end,
      terugbetaald = greatest(terugbetaald, least(bedrag, coalesce(p_terugbetaald, 0)))
  where id = p_id
  returning * into p;
  if p.soort = 'boeking' and p.status = 'betaald' then
    update public.boekingen set betaald = true where id = p.boeking_id and not betaald;
  elsif p.soort = 'fooi' and p.status = 'betaald' and was <> 'betaald' then
    -- De fooi telt pas als hij betaald is; het grootboek boekt hem dan naar de uitlater
    update public.boekingen set fooi = fooi + p.bedrag where id = p.boeking_id;
  elsif p.soort = 'boeking' and p.status = 'mislukt'
     and not exists (select 1 from public.betalingen where boeking_id = p.boeking_id and soort = 'boeking' and status in ('open', 'betaald')) then
    -- Niet betaald en geen andere poging meer: de aanvraag vervalt
    update public.boekingen set status = 'geannuleerd', status_sinds = now() where id = p.boeking_id and status = 'aangevraagd';
  end if;
end;
$$;

-- Hoe elke geslaagde betaling verdeeld wordt: wat Woober houdt voor de boeking (en dus later routeert of zelf
-- krijgt) en wat terug moet naar de eigenaar. Twee keer betaald voor dezelfde boeking: de tweede gaat helemaal terug.
create or replace function public.betaling_verdeling()
returns table (betaling_id text, boeking_id uuid, bedrag integer, terugbetaald integer, behouden integer, definitief boolean, betaald_op timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.boeking_id, p.bedrag, p.terugbetaald,
    (case when p.soort = 'fooi' then p.bedrag
     else greatest(0, least(p.bedrag,
       (case when b.status = 'geweigerd' then 0
             when b.status = 'geannuleerd' then b.annuleringskosten
             else b.totaal - b.met_saldo end)
       - coalesce(sum(p.bedrag) over (partition by p.boeking_id, p.soort order by p.betaald_op, p.id
                                      rows between unbounded preceding and 1 preceding), 0)))
     end)::integer,
    (p.soort = 'fooi' or b.status in ('afgerond', 'geannuleerd', 'geweigerd')),
    p.betaald_op
  from public.betalingen p
  join public.boekingen b on b.id = p.boeking_id
  where p.status = 'betaald';
$$;

-- Wat de server nog moet terugbetalen
create or replace function public.terug_te_betalen()
returns table (betaling_id text, bedrag integer)
language sql stable security definer set search_path = '' as $$
  select betaling_id, (bedrag - behouden - terugbetaald)::integer
  from public.betaling_verdeling()
  where bedrag - behouden - terugbetaald > 0;
$$;

create or replace function public.boek_terugbetaling(p_id text, p_bedrag integer)
returns void language sql security definer set search_path = '' as $$
  update public.betalingen set terugbetaald = least(bedrag, terugbetaald + p_bedrag) where id = p_id;
$$;

-- Routes naar uitlaters --------------------------------------------------------------

-- Koppeling van een uitlater met zijn eigen Mollie-organisatie. Alleen voor de server: de app ziet alleen de status.
create table public.mollie_koppelingen (
  uitlater_id uuid primary key references public.uitlaters (id) on delete cascade,
  -- Willekeurige waarde tijdens het aansluiten (OAuth state); daarna leeg
  staat text unique,
  organisatie_id text unique check (organisatie_id ~ '^org_[A-Za-z0-9]+$'),
  -- Om de stand van het aansluiten bij Mollie op te vragen
  refresh_token text,
  status text not null default 'gestart' check (status in ('gestart', 'gegevens nodig', 'in controle', 'klaar')),
  bijgewerkt timestamptz not null default now()
);
alter table public.mollie_koppelingen enable row level security;
revoke all on public.mollie_koppelingen from authenticated, anon;

-- Een uitbetaling bestaat uit routes uit betalingen van eigenaren, en zo nodig een overboeking van het eigen saldo
-- van Woober (Balance Transfers) voor wat Woober zelf bijlegt: tegoed en kortingen, en een verlengde oppas zolang
-- het extra uur nog niet apart wordt betaald.
create table public.mollie_routes (
  id bigint generated always as identity primary key,
  uitbetaling_id uuid references public.uitbetalingen (id) on delete set null,
  soort text not null default 'route' check (soort in ('route', 'overboeking')),
  betaling_id text references public.betalingen (id),
  check ((soort = 'route') = (betaling_id is not null)),
  bedrag integer not null check (bedrag > 0),
  -- Kenmerk bij Mollie van de route of de overboeking
  extern_id text,
  status text not null default 'gepland' check (status in ('gepland', 'gemaakt', 'mislukt')),
  aangemaakt timestamptz not null default now()
);
create index on public.mollie_routes (betaling_id);
create index on public.mollie_routes (uitbetaling_id);
alter table public.mollie_routes enable row level security;
revoke all on public.mollie_routes from authenticated, anon;

alter table public.uitbetalingen add column automatisch boolean not null default false;

-- Geld in betalingen dat nog naar een uitlater kan: alleen van boekingen die klaar zijn, oudste eerst
create or replace function public.routeerbaar()
returns table (betaling_id text, ruimte integer, betaald_op timestamptz)
language sql stable security definer set search_path = '' as $$
  select v.betaling_id,
    (least(v.behouden, v.bedrag - v.terugbetaald)
     - coalesce((select sum(r.bedrag) from public.mollie_routes r where r.betaling_id = v.betaling_id and r.status in ('gepland', 'gemaakt')), 0))::integer,
    v.betaald_op
  from public.betaling_verdeling() v
  where v.definitief
    and least(v.behouden, v.bedrag - v.terugbetaald)
        > coalesce((select sum(r.bedrag) from public.mollie_routes r where r.betaling_id = v.betaling_id and r.status in ('gepland', 'gemaakt')), 0);
$$;

-- Verdeelt een uitbetaling over betalingen, oudste eerst, zodat geen betaling de 90 dagen van Mollie haalt. Is er
-- minder betaald geld dan de uitlater tegoed heeft (tegoed of korting van Woober), dan komt de rest als overboeking.
-- Al deels gerouteerd (bijvoorbeeld na een fout): alleen de rest wordt gepland. Geeft wat Mollie nog moet doen.
create or replace function public.plan_routes(p_uitbetaling uuid)
returns table (route_id bigint, soort text, betaling_id text, bedrag integer)
language plpgsql security definer set search_path = '' as $$
declare
  u public.uitbetalingen;
  rest integer;
  deel integer;
  r record;
begin
  -- Eén planning tegelijk, zodat niet twee uitbetalingen dezelfde ruimte nemen
  lock table public.mollie_routes in exclusive mode;
  select * into u from public.uitbetalingen where id = p_uitbetaling for update;
  if not found or u.status <> 'aangevraagd' then raise exception 'Deze uitbetaling staat niet open'; end if;
  rest := u.bedrag - coalesce((select sum(x.bedrag) from public.mollie_routes x where x.uitbetaling_id = u.id and x.status in ('gepland', 'gemaakt')), 0);
  for r in select * from public.routeerbaar() order by 3, 1 loop
    exit when rest <= 0;
    deel := least(rest, r.ruimte);
    insert into public.mollie_routes (uitbetaling_id, betaling_id, bedrag) values (u.id, r.betaling_id, deel);
    rest := rest - deel;
  end loop;
  if rest > 0 then
    insert into public.mollie_routes (uitbetaling_id, soort, bedrag) values (u.id, 'overboeking', rest);
  end if;
  return query select x.id, x.soort, x.betaling_id, x.bedrag from public.mollie_routes x where x.uitbetaling_id = u.id and x.status = 'gepland' order by x.id;
end;
$$;

-- Uitkomst van een route bij Mollie. Is alles gerouteerd, dan is de uitbetaling onderweg: Mollie betaalt de uitlater
-- uit volgens het schema dat hij zelf in Mollie kiest.
create or replace function public.route_verwerkt(p_route bigint, p_extern_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  u uuid;
begin
  update public.mollie_routes set status = case when p_extern_id is null then 'mislukt' else 'gemaakt' end, extern_id = p_extern_id
  where id = p_route and status = 'gepland'
  returning uitbetaling_id into u;
  if u is not null and (select coalesce(sum(bedrag), 0) from public.mollie_routes where uitbetaling_id = u and status = 'gemaakt')
     >= (select bedrag from public.uitbetalingen where id = u) then
    update public.uitbetalingen set status = 'onderweg' where id = u and status = 'aangevraagd';
  end if;
end;
$$;

-- Uitbetalingen die de server nu kan routeren: de uitlater is bij Mollie aangesloten
create or replace function public.uitbetalingen_klaar()
returns table (uitbetaling_id uuid, organisatie_id text)
language sql stable security definer set search_path = '' as $$
  select u.id, k.organisatie_id
  from public.uitbetalingen u
  join public.mollie_koppelingen k on k.uitlater_id = u.uitlater_id and k.status = 'klaar' and k.organisatie_id is not null
  where u.status = 'aangevraagd'
  order by u.aangemaakt;
$$;

-- Zet automatisch het hele saldo uit bij uitlaters van wie geld 80 dagen op het saldo staat, en zo nodig bij meer
-- uitlaters zodat geen betaling ouder dan 80 dagen ongerouteerd blijft (Mollie zet het na 90 dagen naar Woober).
create or replace function public.maak_automatische_uitbetalingen()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  achterstand integer;
  w record;
  n integer := 0;
begin
  select coalesce(sum(ruimte), 0) into achterstand from public.routeerbaar() where betaald_op < now() - interval '80 days';
  achterstand := achterstand - coalesce((
    select sum(u.bedrag - coalesce((select sum(r.bedrag) from public.mollie_routes r where r.uitbetaling_id = u.id and r.status in ('gepland', 'gemaakt')), 0))
    from public.uitbetalingen u
    -- Alleen wat de server echt kan routeren, dus van uitlaters die bij Mollie zijn aangesloten
    join public.mollie_koppelingen k on k.uitlater_id = u.uitlater_id and k.status = 'klaar'
    where u.status = 'aangevraagd'), 0);
  for w in
    select s.persoon_id as id, s.saldo, (
      -- Het oudste tegoed dat nog (deels) op het saldo staat
      select min(t.tijd) from (
        select g.tijd, g.bedrag, sum(g.bedrag) over (order by g.tijd desc, g.id desc) as opgeteld
        from public.grootboek g where g.rekening = 'uitlater' and g.persoon_id = s.persoon_id and g.bedrag > 0
      ) t where t.opgeteld - t.bedrag < s.saldo
    ) as oudste
    from (select persoon_id, public.saldo_van(persoon_id) as saldo from public.grootboek
          where rekening = 'uitlater' and persoon_id is not null group by persoon_id) s
    join public.mollie_koppelingen k on k.uitlater_id = s.persoon_id and k.status = 'klaar'
    where s.saldo > 0
    order by 3
  loop
    if achterstand > 0 or w.oudste < now() - interval '80 days' then
      insert into public.uitbetalingen (uitlater_id, bedrag, automatisch) values (w.id, w.saldo, true);
      insert into public.grootboek (gebeurtenis, rekening, persoon_id, bedrag) values ('uitbetaling', 'uitlater', w.id, -w.saldo);
      achterstand := achterstand - w.saldo;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- Aansluiten bij Mollie ------------------------------------------------------------

create or replace function public.start_koppeling(p_uitlater uuid, p_staat text)
returns void language sql security definer set search_path = '' as $$
  insert into public.mollie_koppelingen (uitlater_id, staat) values (p_uitlater, p_staat)
  on conflict (uitlater_id) do update set staat = excluded.staat, bijgewerkt = now();
$$;

create or replace function public.koppeling_van_staat(p_staat text)
returns uuid language sql stable security definer set search_path = '' as $$
  select uitlater_id from public.mollie_koppelingen where staat = p_staat;
$$;

create or replace function public.bewaar_koppeling(p_uitlater uuid, p_organisatie text, p_refresh_token text)
returns void language sql security definer set search_path = '' as $$
  update public.mollie_koppelingen
  set organisatie_id = p_organisatie, refresh_token = p_refresh_token, staat = null, bijgewerkt = now()
  where uitlater_id = p_uitlater;
$$;

-- Stand van het aansluiten bij Mollie; klaar betekent dat Mollie mag uitbetalen, en dan is de rekening geverifieerd
create or replace function public.zet_koppelstatus(p_uitlater uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.mollie_koppelingen set status = p_status, bijgewerkt = now() where uitlater_id = p_uitlater;
  if p_status = 'klaar' then
    update public.uitlaters set uitbetaling_ok = true where id = p_uitlater;
  end if;
end;
$$;

create or replace function public.te_controleren_koppelingen()
returns table (uitlater_id uuid, refresh_token text)
language sql stable security definer set search_path = '' as $$
  select uitlater_id, refresh_token from public.mollie_koppelingen where refresh_token is not null and status <> 'klaar';
$$;

-- Voor de app: hoe ver ben ik met aansluiten bij Mollie? Null als ik nog niet ben begonnen.
create or replace function public.mijn_mollie_koppeling()
returns text language sql stable security definer set search_path = '' as $$
  select status from public.mollie_koppelingen where uitlater_id = (select auth.uid());
$$;

revoke execute on function public.eerst_betaald, public.betaling_voor, public.registreer_betaling, public.verwerk_betaling,
  public.betaling_verdeling, public.terug_te_betalen, public.boek_terugbetaling, public.routeerbaar, public.plan_routes,
  public.route_verwerkt, public.uitbetalingen_klaar, public.maak_automatische_uitbetalingen, public.start_koppeling,
  public.koppeling_van_staat, public.bewaar_koppeling, public.zet_koppelstatus, public.te_controleren_koppelingen
  from public, anon, authenticated;
grant execute on function public.betaling_voor, public.registreer_betaling, public.verwerk_betaling, public.terug_te_betalen,
  public.boek_terugbetaling, public.plan_routes, public.route_verwerkt, public.uitbetalingen_klaar,
  public.maak_automatische_uitbetalingen, public.start_koppeling, public.koppeling_van_staat, public.bewaar_koppeling,
  public.zet_koppelstatus, public.te_controleren_koppelingen
  to service_role;
revoke execute on function public.mijn_mollie_koppeling from public, anon;
grant execute on function public.mijn_mollie_koppeling to authenticated;
