-- Woober: verdienmodel (concept)
--
-- We beginnen zonder winst: in de fase lancering betalen eigenaren geen servicekosten en houdt Woober geen
-- commissie in. Alles voor een Uber-achtig model staat hier al klaar en gaat aan door een ander model in te
-- plannen; er hoeft dan niets meer gebouwd te worden. Zelfde regels en waarden als src/lib/verdienmodel.ts en
-- src/lib/prijs.ts.
--
-- * verdienmodellen: alle knoppen per fase. Een model dat ooit is ingepland, ligt vast.
-- * verdienmodel_planning: wanneer welk model geldt. Alleen Woober (service_role) plant. Een hogere commissie
--   kan pas 15 dagen na aankondiging ingaan (P2B-verordening, uitlaters zijn zakelijke gebruikers).
-- * bereken_prijs(): de enige plek waar de database een prijs uitrekent.
-- * Elke boeking bewaart het model en de volledige opbouw, zodat een nieuw model niets terugwerkt.
-- * druktefactoren: per gebied (postcode van 4 cijfers) en tijdvak, gezet door een serverproces.
-- * abonnementen (Woober Plus), tegoed, actiecodes en uitnodigingen.
-- * grootboek: elke geldbeweging als regels die samen op nul uitkomen. Basis voor Stripe-afstemming en boekhouding.

-- Modellen en planning ----------------------------------------------------------

create table public.verdienmodellen (
  id text primary key check (id ~ '^[a-z0-9_]{2,30}$'),
  naam text not null,
  omschrijving text not null default '',
  -- Eigenaar: servicekosten als deel van tarief plus drukte, met een minimum en eventueel een maximum
  servicekosten_percentage numeric(5, 4) not null default 0 check (servicekosten_percentage between 0 and 0.5),
  servicekosten_minimum integer not null default 0 check (servicekosten_minimum between 0 and 2000),
  servicekosten_maximum integer check (servicekosten_maximum is null or servicekosten_maximum >= servicekosten_minimum),
  -- Eigenaar: vast bedrag per boeking
  boekingskosten integer not null default 0 check (boekingskosten between 0 and 500),
  -- Uitlater: deel van tarief plus drukte-bonus dat Woober inhoudt
  commissie_percentage numeric(5, 4) not null default 0 check (commissie_percentage between 0 and 0.5),
  drukte_aan boolean not null default false,
  drukte_max_factor numeric(3, 2) not null default 1 check (drukte_max_factor between 1 and 3),
  drukte_deel_uitlater numeric(5, 4) not null default 1 check (drukte_deel_uitlater between 0 and 1),
  plus_aan boolean not null default false,
  plus_prijs_per_maand integer not null default 499 check (plus_prijs_per_maand between 0 and 5000),
  plus_servicekosten_korting numeric(5, 4) not null default 1 check (plus_servicekosten_korting between 0 and 1),
  -- Tegoed betaald door Woober
  welkomsttegoed integer not null default 0 check (welkomsttegoed between 0 and 5000),
  uitnodigingstegoed integer not null default 0 check (uitnodigingstegoed between 0 and 5000),
  aangemaakt timestamptz not null default now()
);

create table public.verdienmodel_planning (
  id bigint generated always as identity primary key,
  model_id text not null references public.verdienmodellen (id),
  geldig_vanaf timestamptz not null,
  aangekondigd timestamptz not null default now(),
  toelichting text not null default ''
);
create index on public.verdienmodel_planning (geldig_vanaf);

insert into public.verdienmodellen (id, naam, omschrijving, servicekosten_percentage, servicekosten_minimum, servicekosten_maximum,
  boekingskosten, commissie_percentage, drukte_aan, drukte_max_factor, drukte_deel_uitlater, plus_aan, welkomsttegoed, uitnodigingstegoed)
values
  ('lancering', 'Lancering', 'Zonder winst om gebruikers binnen te halen', 0, 0, null, 0, 0, false, 1, 1, false, 0, 0),
  ('groei', 'Groei', 'Kleine vergoedingen, Woober Plus en tegoed om te werven', 0.05, 49, null, 0, 0.10, false, 1, 1, true, 500, 500),
  ('volledig', 'Uber-model', 'Servicekosten, boekingskosten, commissie, drukte-toeslag en Woober Plus', 0.10, 99, 500, 49, 0.20, true, 1.5, 0.75, true, 0, 500);

insert into public.verdienmodel_planning (model_id, geldig_vanaf, toelichting) values ('lancering', '2026-01-01', 'Start van Woober');

-- Het model dat nu geldt
create or replace function public.actief_verdienmodel()
returns public.verdienmodellen language sql stable set search_path = '' as $$
  select m.* from public.verdienmodel_planning p join public.verdienmodellen m on m.id = p.model_id
  where p.geldig_vanaf <= now()
  order by p.geldig_vanaf desc, p.id desc
  limit 1;
$$;

-- Niet met terugwerkende kracht, en een hogere commissie pas 15 dagen na aankondiging
create or replace function public.bewaak_planning()
returns trigger language plpgsql set search_path = '' as $$
declare
  huidig public.verdienmodellen := public.actief_verdienmodel();
  nieuw public.verdienmodellen;
begin
  if new.geldig_vanaf < now() then raise exception 'Een verdienmodel geldt nooit met terugwerkende kracht'; end if;
  select * into nieuw from public.verdienmodellen where id = new.model_id;
  if huidig.id is not null and nieuw.commissie_percentage > huidig.commissie_percentage
     and new.geldig_vanaf < now() + interval '15 days' then
    raise exception 'Een hogere commissie kondig je minstens 15 dagen vooraf aan';
  end if;
  return new;
end;
$$;
create trigger bewaak_planning before insert on public.verdienmodel_planning
  for each row execute function public.bewaak_planning();

-- Wat ooit is ingepland verandert niet meer; maak voor nieuwe bedragen een nieuw model
create or replace function public.bevries_verdienmodel()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.verdienmodel_planning where model_id = old.id) then
    raise exception 'Dit model is al ingepland. Maak een nieuw model aan.';
  end if;
  return new;
end;
$$;
create trigger bevries_verdienmodel before update on public.verdienmodellen
  for each row execute function public.bevries_verdienmodel();

-- Drukte ------------------------------------------------------------------------

-- Een serverproces zet de factor uit openstaande aanvragen en het aantal uitlaters dat online is met een
-- werkgebied in dat gebied. Nooit uit posities van uitlaters, en nooit om uitlaters te beoordelen.
create table public.druktefactoren (
  gebied text not null check (gebied ~ '^[1-9][0-9]{3}$'),
  dienst public.dienst not null,
  van timestamptz not null,
  tot timestamptz not null check (tot > van),
  factor numeric(3, 2) not null check (factor between 1 and 3),
  primary key (gebied, dienst, van)
);

create or replace function public.drukte_voor(m public.verdienmodellen, p_gebied text, p_dienst public.dienst, p_moment timestamptz)
returns numeric language sql stable set search_path = '' as $$
  select case when not m.drukte_aan then 1::numeric else least(m.drukte_max_factor, coalesce((
    select max(d.factor) from public.druktefactoren d
    where d.gebied = p_gebied and d.dienst = p_dienst and p_moment >= d.van and p_moment < d.tot
  ), 1)) end;
$$;

-- Abonnement, tegoed, actiecodes en uitnodigingen ---------------------------------

-- Woober Plus. Ontstaat na een geslaagde betaling (webhook van de betaalprovider, service_role).
create table public.abonnementen (
  id uuid primary key default gen_random_uuid(),
  eigenaar_id uuid not null references public.profielen (id) on delete cascade,
  prijs_per_maand integer not null check (prijs_per_maand >= 0),
  start timestamptz not null default now(),
  -- null: loopt door tot opzeggen
  eind timestamptz check (eind is null or eind > start),
  stripe_subscription text
);
create unique index een_lopend_abonnement on public.abonnementen (eigenaar_id) where eind is null;

create or replace function public.heeft_plus(p_eigenaar uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.abonnementen where eigenaar_id = p_eigenaar and start <= now() and (eind is null or eind > now()));
$$;

-- Opzeggen: Plus loopt door tot het einde van de lopende maand
create or replace function public.zeg_plus_op()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  a public.abonnementen;
  maanden integer;
  einde timestamptz;
begin
  select * into a from public.abonnementen where eigenaar_id = (select auth.uid()) and eind is null for update;
  if not found then raise exception 'Je hebt geen lopend abonnement'; end if;
  maanden := extract(year from age(now(), a.start))::integer * 12 + extract(month from age(now(), a.start))::integer + 1;
  einde := a.start + make_interval(months => maanden);
  update public.abonnementen set eind = einde where id = a.id;
  return einde;
end;
$$;

-- Tegoed als lijst van mutaties; het saldo is de som. Betaald door Woober, nooit door de uitlater.
create table public.tegoed_mutaties (
  id bigint generated always as identity primary key,
  eigenaar_id uuid not null references public.profielen (id) on delete cascade,
  bedrag integer not null check (bedrag <> 0),
  reden text not null check (reden in ('welkom', 'uitnodiging', 'actiecode', 'boeking', 'terugboeking', 'correctie')),
  boeking_id uuid references public.boekingen (id) on delete set null,
  promocode text,
  tijd timestamptz not null default now()
);
create index on public.tegoed_mutaties (eigenaar_id);

create or replace function public.tegoed_saldo(p_eigenaar uuid)
returns integer language sql stable set search_path = '' as $$
  select coalesce(sum(bedrag), 0)::integer from public.tegoed_mutaties where eigenaar_id = p_eigenaar;
$$;

-- Welkomsttegoed volgens het model dat geldt bij het aanmelden
create or replace function public.geef_welkomsttegoed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  bedrag integer := coalesce((public.actief_verdienmodel()).welkomsttegoed, 0);
begin
  if bedrag > 0 then
    insert into public.tegoed_mutaties (eigenaar_id, bedrag, reden) values (new.id, bedrag, 'welkom');
  end if;
  return new;
end;
$$;
create trigger welkomsttegoed after insert on public.profielen for each row execute function public.geef_welkomsttegoed();

-- Actiecodes maakt alleen Woober aan. Gebruikers kunnen de lijst niet lezen, alleen een code verzilveren.
create table public.promocodes (
  code text primary key check (code ~ '^[A-Z0-9-]{3,30}$'),
  bedrag integer not null check (bedrag between 1 and 10000),
  geldig_tot timestamptz,
  -- null: onbeperkt
  max_gebruik integer check (max_gebruik is null or max_gebruik > 0),
  alleen_nieuw boolean not null default false,
  aangemaakt timestamptz not null default now()
);

create table public.promocode_gebruik (
  code text not null references public.promocodes (code) on delete cascade,
  eigenaar_id uuid not null references public.profielen (id) on delete cascade,
  tijd timestamptz not null default now(),
  primary key (code, eigenaar_id)
);

create or replace function public.heeft_betaald_geboekt(p_eigenaar uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.boekingen where eigenaar_id = p_eigenaar and soort = 'betaald' and status = 'afgerond');
$$;

create or replace function public.verzilver_code(p_code text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  c text := upper(trim(p_code));
  pc public.promocodes;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  select * into pc from public.promocodes where code = c for update;
  if not found or (pc.geldig_tot is not null and pc.geldig_tot < now()) then raise exception 'Deze code kennen we niet'; end if;
  if exists (select 1 from public.promocode_gebruik where code = c and eigenaar_id = ik) then raise exception 'Deze code heb je al gebruikt'; end if;
  if pc.max_gebruik is not null and (select count(*) from public.promocode_gebruik where code = c) >= pc.max_gebruik then
    raise exception 'Deze code is op';
  end if;
  if pc.alleen_nieuw and public.heeft_betaald_geboekt(ik) then raise exception 'Deze code is alleen voor nieuwe gebruikers'; end if;
  insert into public.promocode_gebruik (code, eigenaar_id) values (c, ik);
  insert into public.tegoed_mutaties (eigenaar_id, bedrag, reden, promocode) values (ik, pc.bedrag, 'actiecode', c);
  return pc.bedrag;
end;
$$;

-- Uitnodigen: allebei tegoed zodra de nieuwe gebruiker de eerste betaalde boeking heeft afgerond
create table public.uitnodigingscodes (
  eigenaar_id uuid primary key references public.profielen (id) on delete cascade,
  code text not null unique
);

create table public.uitnodigingen (
  genodigde_id uuid primary key references public.profielen (id) on delete cascade,
  uitnodiger_id uuid not null references public.profielen (id) on delete cascade,
  beloond boolean not null default false,
  tijd timestamptz not null default now(),
  check (genodigde_id <> uitnodiger_id)
);

create or replace function public.mijn_uitnodigingscode()
returns text language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  c text;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  select code into c from public.uitnodigingscodes where eigenaar_id = ik;
  while c is null loop
    c := 'WOOBER-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.uitnodigingscodes (eigenaar_id, code) values (ik, c);
    exception when unique_violation then
      c := null;
    end;
  end loop;
  return c;
end;
$$;

create or replace function public.gebruik_uitnodiging(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  uitnodiger uuid;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  select eigenaar_id into uitnodiger from public.uitnodigingscodes where code = upper(trim(p_code));
  if uitnodiger is null or uitnodiger = ik then raise exception 'Deze code kennen we niet'; end if;
  if exists (select 1 from public.uitnodigingen where genodigde_id = ik) then raise exception 'Je hebt al een uitnodiging gebruikt'; end if;
  if public.heeft_betaald_geboekt(ik) then raise exception 'Alleen voor nieuwe gebruikers'; end if;
  insert into public.uitnodigingen (genodigde_id, uitnodiger_id) values (ik, uitnodiger);
end;
$$;

-- Bij de eerste afgeronde betaalde boeking; het bedrag volgt het model van dat moment (0 tijdens de lancering)
create or replace function public.beloon_uitnodiging(p_genodigde uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  u public.uitnodigingen;
  bedrag integer := coalesce((public.actief_verdienmodel()).uitnodigingstegoed, 0);
begin
  select * into u from public.uitnodigingen where genodigde_id = p_genodigde and not beloond for update;
  if not found then return; end if;
  update public.uitnodigingen set beloond = true where genodigde_id = p_genodigde;
  if bedrag > 0 then
    insert into public.tegoed_mutaties (eigenaar_id, bedrag, reden) values (u.uitnodiger_id, bedrag, 'uitnodiging'), (p_genodigde, bedrag, 'uitnodiging');
  end if;
end;
$$;

-- Prijs ---------------------------------------------------------------------------

-- Volledige prijsopbouw zoals PrijsOpbouw in src/types.ts
create type public.prijs_opbouw as (
  verdienmodel_id text,
  tarief integer,
  toeslag integer,
  drukte_factor numeric(3, 2),
  drukte integer,
  drukte_uitlater integer,
  servicekosten integer,
  plus boolean,
  boekingskosten integer,
  korting integer,
  totaal integer,
  commissie integer,
  uitbetaling integer
);

-- Zelfde regels als berekenPrijs() in src/lib/prijs.ts. Tarief en toeslag kiest de uitlater; de rest volgt uit het model.
create or replace function public.bereken_prijs(
  m public.verdienmodellen,
  p_tarief integer,
  p_toeslag integer,
  p_drukte_factor numeric,
  p_plus boolean,
  p_tegoed integer
) returns public.prijs_opbouw language plpgsql immutable set search_path = '' as $$
declare
  p public.prijs_opbouw;
  basis integer := p_tarief + p_toeslag;
  zonder_korting integer;
begin
  p.verdienmodel_id := m.id;
  p.tarief := p_tarief;
  p.toeslag := p_toeslag;
  p.drukte_factor := case when m.drukte_aan then least(m.drukte_max_factor, greatest(1, coalesce(p_drukte_factor, 1))) else 1 end;
  p.drukte := round(basis * (p.drukte_factor - 1));
  p.drukte_uitlater := round(p.drukte * m.drukte_deel_uitlater);
  p.plus := coalesce(p_plus, false) and m.plus_aan and m.servicekosten_percentage > 0;
  p.servicekosten := 0;
  if m.servicekosten_percentage > 0 then
    p.servicekosten := greatest(m.servicekosten_minimum, round((basis + p.drukte) * m.servicekosten_percentage));
    if m.servicekosten_maximum is not null then p.servicekosten := least(m.servicekosten_maximum, p.servicekosten); end if;
    if p.plus then p.servicekosten := round(p.servicekosten * (1 - m.plus_servicekosten_korting)); end if;
  end if;
  p.boekingskosten := m.boekingskosten;
  zonder_korting := basis + p.drukte + p.servicekosten + p.boekingskosten;
  p.korting := greatest(0, least(coalesce(p_tegoed, 0), zonder_korting));
  p.totaal := zonder_korting - p.korting;
  p.commissie := round((basis + p.drukte_uitlater) * m.commissie_percentage);
  p.uitbetaling := basis + p.drukte_uitlater - p.commissie;
  return p;
end;
$$;

-- Prijsopbouw bij de boeking. Totaal en uitbetaling rekent de database zelf uit, zodat ze altijd kloppen.
alter table public.boekingen
  add column verdienmodel_id text references public.verdienmodellen (id),
  add column drukte_factor numeric(3, 2) not null default 1,
  add column drukte integer not null default 0,
  add column drukte_uitlater integer not null default 0,
  add column plus boolean not null default false,
  add column boekingskosten integer not null default 0,
  add column korting integer not null default 0,
  add column totaal integer generated always as (tarief + toeslag + drukte + servicekosten + boekingskosten - korting) stored,
  add column uitbetaling integer generated always as (tarief + toeslag + drukte_uitlater - commissie) stored;

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
  p_serie uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  u public.uitlaters;
  m public.verdienmodellen := public.actief_verdienmodel();
  toeslag integer;
  gebied text;
  p public.prijs_opbouw;
  nieuw uuid;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  if m.id is null then raise exception 'Geen verdienmodel actief'; end if;
  select * into u from public.uitlaters where id = p_uitlater;
  if not found or not public.mag_uitlaten(u) then raise exception 'Deze uitlater kan nu geen boekingen aannemen'; end if;
  if public.is_geblokkeerd(ik, p_uitlater) then raise exception 'Niet mogelijk'; end if;
  if not (p_dienst = any (u.diensten)) then raise exception 'Deze persoon biedt deze dienst niet aan'; end if;
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

  insert into public.boekingen (dienst, eigenaar_id, uitlater_id, hond_ids, duur, moment, serie_id, sleutel, notitie, camera_in_huis,
                                betaalmethode, verdienmodel_id, tarief, toeslag, drukte_factor, drukte, drukte_uitlater,
                                servicekosten, plus, boekingskosten, korting, commissie)
  values (p_dienst, ik, p_uitlater, p_honden, p_duur, p_moment, p_serie, p_sleutel, left(coalesce(p_notitie, ''), 300),
          p_dienst = 'oppas' and coalesce(p_camera_in_huis, false), p_betaalmethode, p.verdienmodel_id, p.tarief, p.toeslag,
          p.drukte_factor, p.drukte, p.drukte_uitlater, p.servicekosten, p.plus, p.boekingskosten, p.korting, p.commissie)
  returning id into nieuw;

  if p.korting > 0 then
    insert into public.tegoed_mutaties (eigenaar_id, bedrag, reden, boeking_id) values (ik, -p.korting, 'boeking', nieuw);
  end if;
  insert into public.ophaalcodes (boeking_id, code) values (nieuw, lpad((floor(random() * 9000) + 1000)::text, 4, '0'));
  return nieuw;
end;
$$;

-- Oppas een uur verlengen, met hetzelfde model, dezelfde drukte en hetzelfde tegoed als bij het boeken.
-- In de echte app bevestigt de oppas dit eerst; in dit concept gaat het direct.
create or replace function public.verleng_oppas(p_boeking uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.boekingen;
  u public.uitlaters;
  m public.verdienmodellen;
  p public.prijs_opbouw;
begin
  select * into b from public.boekingen where id = p_boeking for update;
  if not found or b.eigenaar_id is distinct from (select auth.uid()) or b.dienst <> 'oppas'
     or b.status not in ('gepland', 'onderweg', 'aangekomen', 'bezig') then
    raise exception 'Deze stap kan nu niet';
  end if;
  if b.duur + 60 > 720 then raise exception 'Langer dan 12 uur kan niet'; end if;
  select * into u from public.uitlaters where id = b.uitlater_id;
  select * into m from public.verdienmodellen where id = b.verdienmodel_id;
  p := public.bereken_prijs(m, public.tarief_voor(u, 'oppas', b.duur + 60), b.toeslag, b.drukte_factor, b.plus, b.korting);
  update public.boekingen
  set duur = b.duur + 60, tarief = p.tarief, drukte = p.drukte, drukte_uitlater = p.drukte_uitlater,
      servicekosten = p.servicekosten, boekingskosten = p.boekingskosten, korting = p.korting, commissie = p.commissie
  where id = p_boeking;
end;
$$;

-- Grootboek -----------------------------------------------------------------------

create type public.rekening as enum (
  'eigenaar', 'uitlater', 'woober_servicekosten', 'woober_boekingskosten', 'woober_commissie', 'woober_drukte',
  'woober_tegoed', 'woober_abonnementen'
);

-- Alleen voor Woober. Blijft bewaard als een account wordt verwijderd (fiscale bewaarplicht); de persoon wordt dan leeg.
create table public.grootboek (
  id bigint generated always as identity primary key,
  boeking_id uuid references public.boekingen (id) on delete set null,
  gebeurtenis text not null check (gebeurtenis in ('afgerond', 'annulering', 'fooi', 'abonnement')),
  rekening public.rekening not null,
  persoon_id uuid references public.profielen (id) on delete set null,
  bedrag integer not null,
  tijd timestamptz not null default now()
);
create index on public.grootboek (boeking_id);

create or replace function public.boek_in_grootboek()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.soort = 'betaald' and new.status = 'afgerond' and old.status <> 'afgerond' then
    insert into public.grootboek (boeking_id, gebeurtenis, rekening, persoon_id, bedrag)
    select new.id, 'afgerond', r.rekening, r.persoon, r.bedrag
    from (values
      ('eigenaar'::public.rekening, new.eigenaar_id, -new.totaal),
      ('uitlater', new.uitlater_id, new.uitbetaling),
      ('woober_servicekosten', null::uuid, new.servicekosten),
      ('woober_boekingskosten', null, new.boekingskosten),
      ('woober_commissie', null, new.commissie),
      ('woober_drukte', null, new.drukte - new.drukte_uitlater),
      ('woober_tegoed', null, -new.korting)
    ) as r (rekening, persoon, bedrag)
    where r.bedrag <> 0;
    perform public.beloon_uitnodiging(new.eigenaar_id);
  elsif new.soort = 'betaald' and new.status in ('geannuleerd', 'geweigerd') and old.status not in ('geannuleerd', 'geweigerd') then
    -- Gebruikt tegoed komt altijd terug; annuleringskosten gaan volledig naar de uitlater
    if new.korting > 0 then
      insert into public.tegoed_mutaties (eigenaar_id, bedrag, reden, boeking_id) values (new.eigenaar_id, new.korting, 'terugboeking', new.id);
    end if;
    if new.annuleringskosten > 0 then
      insert into public.grootboek (boeking_id, gebeurtenis, rekening, persoon_id, bedrag)
      values (new.id, 'annulering', 'eigenaar', new.eigenaar_id, -new.annuleringskosten),
             (new.id, 'annulering', 'uitlater', new.uitlater_id, new.annuleringskosten);
    end if;
  end if;

  if new.fooi <> old.fooi then
    if new.fooi < old.fooi then raise exception 'Een fooi kun je niet terugdraaien'; end if;
    -- Een fooi gaat volledig naar de uitlater
    insert into public.grootboek (boeking_id, gebeurtenis, rekening, persoon_id, bedrag)
    values (new.id, 'fooi', 'eigenaar', new.eigenaar_id, old.fooi - new.fooi),
           (new.id, 'fooi', 'uitlater', new.uitlater_id, new.fooi - old.fooi);
  end if;
  return new;
end;
$$;
create trigger grootboek after update on public.boekingen for each row execute function public.boek_in_grootboek();

-- Row Level Security ----------------------------------------------------------------

alter table public.verdienmodellen enable row level security;
alter table public.verdienmodel_planning enable row level security;
alter table public.druktefactoren enable row level security;
alter table public.abonnementen enable row level security;
alter table public.tegoed_mutaties enable row level security;
alter table public.promocodes enable row level security;
alter table public.promocode_gebruik enable row level security;
alter table public.uitnodigingscodes enable row level security;
alter table public.uitnodigingen enable row level security;
alter table public.grootboek enable row level security;

-- Modellen, planning en drukte zijn openbaar, zodat de app prijzen en aankondigingen vooraf kan tonen. Wijzigen kan alleen Woober.
create policy "verdienmodellen lezen" on public.verdienmodellen for select to authenticated using (true);
create policy "planning lezen" on public.verdienmodel_planning for select to authenticated using (true);
create policy "drukte lezen" on public.druktefactoren for select to authenticated using (true);
create policy "eigen abonnement" on public.abonnementen for select to authenticated using (eigenaar_id = (select auth.uid()));
create policy "eigen tegoed" on public.tegoed_mutaties for select to authenticated using (eigenaar_id = (select auth.uid()));
create policy "eigen gebruikte codes" on public.promocode_gebruik for select to authenticated using (eigenaar_id = (select auth.uid()));
create policy "eigen uitnodigingscode" on public.uitnodigingscodes for select to authenticated using (eigenaar_id = (select auth.uid()));
create policy "eigen uitnodigingen" on public.uitnodigingen for select to authenticated
  using ((select auth.uid()) in (genodigde_id, uitnodiger_id));
-- promocodes en grootboek: geen policy, dus onzichtbaar voor de app

-- Interne functies niet aanroepbaar vanuit de app
revoke execute on function public.tegoed_saldo, public.heeft_plus, public.beloon_uitnodiging, public.heeft_betaald_geboekt,
  public.geef_welkomsttegoed, public.boek_in_grootboek, public.bewaak_planning, public.bevries_verdienmodel
  from public, anon, authenticated;
grant execute on function public.vraag_boeking_aan, public.verleng_oppas, public.verzilver_code, public.mijn_uitnodigingscode,
  public.gebruik_uitnodiging, public.zeg_plus_op to authenticated;
