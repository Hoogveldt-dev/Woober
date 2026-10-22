-- Woober: eerste databaseschema (concept)
--
-- Nog niet uitgevoerd. Bedoeld voor een eigen Supabase-project in eu-central-1 (Frankfurt),
-- los van Woofer. Zie PLAN.md, hoofdstuk "Van demo naar MVP".
--
-- Uitgangspunten:
-- * Row Level Security op elke tabel. De app gebruikt alleen de publieke sleutel; nooit de service_role.
-- * Statuswijzigingen van boekingen alleen via functies hieronder, zodat prijs, ophaalcode en volgorde kloppen.
-- * Prijzen berekent de database uit het eigen tarief van de uitlater en het actieve verdienmodel
--   (zie de migratie verdienmodel); de app stuurt nooit een bedrag mee.
-- * Adres, ophaalcode en betaalgegevens staan in aparte tabellen, omdat RLS rijen afschermt en geen kolommen.
-- * Locatie alleen tijdens een wandeling, en na 30 dagen weg.

-- Soorten -------------------------------------------------------------------

-- Wat je boekt, zoals ritsoorten bij Uber
create type public.dienst as enum ('uitlaten', 'oppas');
-- Een betaalde boeking (uitlaten of oppas) of een gratis kennismaking
create type public.boeking_soort as enum ('betaald', 'kennismaking');
create type public.boeking_status as enum ('aangevraagd', 'gepland', 'onderweg', 'aangekomen', 'bezig', 'afgerond', 'geannuleerd', 'geweigerd');
create type public.gebeurtenis_soort as enum ('start', 'foto', 'plas', 'poep', 'water', 'eten', 'spelen', 'slapen', 'notitie', 'einde', 'incident');
create type public.vervoer as enum ('lopend', 'fiets', 'auto');
create type public.sleutel as enum ('thuis', 'kastje', 'overhandigd');
create type public.betaalmethode as enum ('ideal', 'applepay', 'kaart');

-- Profielen -----------------------------------------------------------------

-- Wat iedere ingelogde gebruiker van een ander mag zien: voornaam en woonplaats.
create table public.profielen (
  id uuid primary key references auth.users (id) on delete cascade,
  voornaam text not null check (char_length(voornaam) between 1 and 50),
  plaats text not null default '',
  aangemaakt timestamptz not null default now()
);

-- Privé: alleen de gebruiker zelf, en de uitlater van een geaccepteerde boeking.
create table public.adressen (
  gebruiker_id uuid primary key references public.profielen (id) on delete cascade,
  straat_huisnummer text not null,
  postcode text not null check (postcode ~ '^[1-9][0-9]{3} ?[A-Z]{2}$'),
  plaats text not null,
  lat double precision not null,
  lng double precision not null
);

create table public.honden (
  id uuid primary key default gen_random_uuid(),
  eigenaar_id uuid not null references public.profielen (id) on delete cascade,
  naam text not null check (char_length(naam) between 1 and 40),
  ras text not null,
  geboortedatum date not null check (geboortedatum <= current_date),
  grootte text not null check (grootte in ('klein', 'middel', 'groot')),
  energie text not null check (energie in ('rustig', 'gemiddeld', 'energiek')),
  aanlijnen text not null check (aanlijnen in ('altijd', 'losloop-ok')),
  met_honden text not null check (met_honden in ('goed', 'soms', 'liever-niet')),
  karakter text not null default '' check (char_length(karakter) <= 300),
  bijzonderheden text not null default '' check (char_length(bijzonderheden) <= 300),
  dierenarts text not null default '',
  foto_pad text,
  aangemaakt timestamptz not null default now()
);
create index on public.honden (eigenaar_id);

-- Het openbare profiel van een uitlater. Tarief, werkgebied en beschikbaarheid kiest de uitlater zelf.
create table public.uitlaters (
  id uuid primary key references public.profielen (id) on delete cascade,
  wijk text not null default '',
  bio text not null default '' check (char_length(bio) <= 400),
  ervaring text not null default '' check (char_length(ervaring) <= 300),
  professioneel boolean not null default false,
  bedrijfsnaam text,
  diensten public.dienst[] not null default '{uitlaten}' check (array_length(diensten, 1) >= 1),
  -- Uurtarief voor oppas aan huis in centen; 0 als die dienst niet wordt aangeboden
  oppas_per_uur integer not null default 0 check (oppas_per_uur = 0 or oppas_per_uur between 500 and 10000),
  tarief_30 integer not null check (tarief_30 between 500 and 10000),
  tarief_45 integer not null check (tarief_45 between 500 and 10000),
  tarief_60 integer not null check (tarief_60 between 500 and 10000),
  toeslag_extra_hond integer not null default 0 check (toeslag_extra_hond between 0 and 5000),
  -- Nooit meer dan 8 honden per uitlater; gemeenten kunnen strenger zijn.
  max_honden smallint not null default 2 check (max_honden between 1 and 8),
  werkgebied_km numeric(3, 1) not null default 3 check (werkgebied_km between 0.5 and 20),
  vervoer public.vervoer not null default 'fiets',
  -- {"0": ["ochtend", "middag"], ... } met 0 = maandag
  beschikbaarheid jsonb not null default '{}'::jsonb,
  online boolean not null default false,
  -- Afgeronde positie, alleen zolang de uitlater online is
  lat double precision,
  lng double precision,
  -- Alleen te zetten door Woober (service_role), na controle
  identiteit_ok boolean not null default false,
  verzekering_ok boolean not null default false,
  uitbetaling_ok boolean not null default false,
  vog_ok boolean not null default false,
  aangemaakt timestamptz not null default now()
);

-- Privé gegevens van de uitlater: alleen voor de uitlater zelf en Woober.
create table public.uitlaters_prive (
  id uuid primary key references public.uitlaters (id) on delete cascade,
  kvk_nummer text check (kvk_nummer ~ '^[0-9]{8}$'),
  stripe_account_id text,
  polis_pad text
);

-- Boekingen -----------------------------------------------------------------

create table public.series (
  id uuid primary key default gen_random_uuid(),
  eigenaar_id uuid not null references public.profielen (id) on delete cascade,
  uitlater_id uuid not null references public.uitlaters (id) on delete cascade,
  dienst public.dienst not null default 'uitlaten',
  hond_ids uuid[] not null,
  duur smallint not null check (duur in (30, 45, 60, 120, 180, 240, 300)),
  dagen smallint[] not null check (array_length(dagen, 1) between 1 and 7),
  tijd time not null,
  actief boolean not null default true,
  aangemaakt timestamptz not null default now()
);

create table public.boekingen (
  id uuid primary key default gen_random_uuid(),
  soort public.boeking_soort not null default 'betaald',
  dienst public.dienst not null default 'uitlaten',
  eigenaar_id uuid not null references public.profielen (id) on delete cascade,
  uitlater_id uuid not null references public.uitlaters (id) on delete cascade,
  hond_ids uuid[] not null check (array_length(hond_ids, 1) between 1 and 8),
  -- Minuten: 30, 45 of 60 voor uitlaten; bij oppas hele uren, ook na verlengen
  duur smallint not null check (duur in (30, 45, 60) or (duur % 60 = 0 and duur between 60 and 720)),
  -- null betekent: zo snel mogelijk
  moment timestamptz,
  serie_id uuid references public.series (id) on delete set null,
  sleutel public.sleutel not null default 'thuis',
  notitie text not null default '' check (char_length(notitie) <= 300),
  -- Bij oppas: de eigenaar meldt vooraf dat er camera's in huis hangen
  camera_in_huis boolean not null default false,
  betaalmethode public.betaalmethode not null default 'ideal',
  -- Bedragen in centen, berekend door vraag_boeking_aan(); de rest van de prijsopbouw staat in de migratie verdienmodel
  tarief integer not null default 0,
  toeslag integer not null default 0,
  servicekosten integer not null default 0,
  commissie integer not null default 0,
  fooi integer not null default 0 check (fooi between 0 and 5000),
  annuleringskosten integer not null default 0,
  status public.boeking_status not null default 'aangevraagd',
  status_sinds timestamptz not null default now(),
  gestart timestamptz,
  beeindigd timestamptz,
  stripe_payment_intent text,
  aangemaakt timestamptz not null default now(),
  check (eigenaar_id <> uitlater_id)
);
create index on public.boekingen (eigenaar_id, status);
create index on public.boekingen (uitlater_id, status);

-- Privé voor de eigenaar; de uitlater controleert de code via start_wandeling().
create table public.ophaalcodes (
  boeking_id uuid primary key references public.boekingen (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$')
);

-- Alleen tijdens een wandeling of het plasrondje bij oppas, en na 30 dagen verwijderd (zie onderaan).
create table public.wandel_posities (
  id bigint generated always as identity primary key,
  boeking_id uuid not null references public.boekingen (id) on delete cascade,
  tijd timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null
);
create index on public.wandel_posities (boeking_id, tijd);

create table public.wandel_gebeurtenissen (
  id uuid primary key default gen_random_uuid(),
  boeking_id uuid not null references public.boekingen (id) on delete cascade,
  soort public.gebeurtenis_soort not null,
  tekst text check (char_length(tekst) <= 300),
  foto_pad text,
  lat double precision,
  lng double precision,
  tijd timestamptz not null default now()
);
create index on public.wandel_gebeurtenissen (boeking_id, tijd);

-- Vertrouwen en moderatie -----------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  boeking_id uuid not null references public.boekingen (id) on delete cascade,
  auteur_id uuid not null references public.profielen (id) on delete cascade,
  ontvanger_id uuid not null references public.profielen (id) on delete cascade,
  sterren smallint not null check (sterren between 1 and 5),
  tags text[] not null default '{}',
  tekst text not null default '' check (char_length(tekst) <= 300),
  aangemaakt timestamptz not null default now(),
  unique (boeking_id, auteur_id)
);

create table public.berichten (
  id uuid primary key default gen_random_uuid(),
  van_id uuid not null references public.profielen (id) on delete cascade,
  naar_id uuid not null references public.profielen (id) on delete cascade,
  tekst text not null check (char_length(tekst) between 1 and 2000),
  tijd timestamptz not null default now(),
  check (van_id <> naar_id)
);
create index on public.berichten (van_id, naar_id, tijd);

create table public.blokkades (
  blokkeerder_id uuid not null references public.profielen (id) on delete cascade,
  geblokkeerde_id uuid not null references public.profielen (id) on delete cascade,
  aangemaakt timestamptz not null default now(),
  primary key (blokkeerder_id, geblokkeerde_id)
);

-- Meldingen en incidenten worden altijd door een medewerker beoordeeld (Digital Services Act, Wet platformwerk).
create table public.meldingen (
  id uuid primary key default gen_random_uuid(),
  melder_id uuid not null references public.profielen (id) on delete cascade,
  gemeld_id uuid not null references public.profielen (id) on delete cascade,
  boeking_id uuid references public.boekingen (id) on delete set null,
  reden text not null,
  toelichting text not null default '',
  status text not null default 'open' check (status in ('open', 'in behandeling', 'afgehandeld')),
  besluit text,
  aangemaakt timestamptz not null default now()
);

create table public.incidenten (
  id uuid primary key default gen_random_uuid(),
  boeking_id uuid not null references public.boekingen (id) on delete cascade,
  melder_id uuid not null references public.profielen (id) on delete cascade,
  soort text not null,
  aangemaakt timestamptz not null default now()
);

-- Hulpfuncties ----------------------------------------------------------------

create or replace function public.is_geblokkeerd(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blokkades
    where (blokkeerder_id = a and geblokkeerde_id = b) or (blokkeerder_id = b and geblokkeerde_id = a)
  );
$$;

-- Een eerste wandeling kan pas na een afgeronde kennismaking.
create or replace function public.kent_elkaar(eigenaar uuid, uitlater uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boekingen
    where eigenaar_id = eigenaar and uitlater_id = uitlater and status = 'afgerond'
  );
$$;

create or replace function public.is_deelnemer(boeking uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boekingen
    where id = boeking and (select auth.uid()) in (eigenaar_id, uitlater_id)
  );
$$;

create or replace function public.mag_uitlaten(u public.uitlaters)
returns boolean language sql immutable as $$
  select u.identiteit_ok and u.verzekering_ok and u.uitbetaling_ok;
$$;

-- Acties op boekingen ---------------------------------------------------------

-- Tarief van de uitlater zelf: per wandelduur, of uurtarief maal aantal uren bij oppas (zelfde regel als src/lib/prijs.ts)
create or replace function public.tarief_voor(u public.uitlaters, p_dienst public.dienst, p_duur integer)
returns integer language sql immutable as $$
  select case
    when p_dienst = 'oppas' then round(u.oppas_per_uur * p_duur / 60.0)::integer
    when p_duur = 30 then u.tarief_30
    when p_duur = 45 then u.tarief_45
    when p_duur = 60 then u.tarief_60
  end;
$$;

create or replace function public.vraag_kennismaking_aan(p_uitlater uuid, p_moment timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  nieuw uuid;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  if public.is_geblokkeerd(ik, p_uitlater) then raise exception 'Niet mogelijk'; end if;
  if p_moment < now() + interval '1 hour' then raise exception 'Kies een moment minstens een uur vooruit'; end if;
  insert into public.boekingen (soort, eigenaar_id, uitlater_id, hond_ids, duur, moment)
  values ('kennismaking', ik, p_uitlater, (select array_agg(id) from public.honden where eigenaar_id = ik), 30, p_moment)
  returning id into nieuw;
  return nieuw;
end;
$$;

-- Toegestane overgangen. Weigeren en afzeggen door de uitlater hebben geen gevolgen en worden niet geteld.
create or replace function public.wijzig_status(p_boeking uuid, p_naar public.boeking_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
  b public.boekingen;
  ben_uitlater boolean;
  kosten integer := 0;
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  select * into b from public.boekingen where id = p_boeking for update;
  if not found or ik not in (b.eigenaar_id, b.uitlater_id) then raise exception 'Onbekende boeking'; end if;
  ben_uitlater := ik = b.uitlater_id;

  if ben_uitlater and b.status = 'aangevraagd' and p_naar in ('gepland', 'onderweg', 'geweigerd') then
    null;
  elsif ben_uitlater and b.status = 'gepland' and p_naar in ('onderweg', 'geannuleerd') then
    null;
  elsif ben_uitlater and b.status = 'onderweg' and p_naar = 'aangekomen' then
    null;
  elsif ben_uitlater and b.soort = 'kennismaking' and b.status in ('gepland', 'aangekomen') and p_naar = 'afgerond' then
    null;
  elsif ben_uitlater and b.status = 'bezig' and p_naar = 'afgerond' then
    null;
  elsif not ben_uitlater and b.dienst = 'oppas' and b.status = 'bezig' and p_naar = 'afgerond' then
    -- "Ik ben thuis": de eigenaar rondt de oppas af; de geboekte tijd wordt betaald
    null;
  elsif not ben_uitlater and b.status in ('aangevraagd', 'gepland', 'onderweg', 'aangekomen') and p_naar = 'geannuleerd' then
    -- Gratis tot 2 uur van tevoren of zolang de uitlater niet onderweg is; daarna 50% van het tarief voor de uitlater
    if b.status in ('onderweg', 'aangekomen') or (b.status = 'gepland' and b.moment is not null and b.moment < now() + interval '2 hours') then
      kosten := round((b.tarief + b.toeslag) * 0.5);
    end if;
  else
    raise exception 'Deze stap kan nu niet';
  end if;

  update public.boekingen
  set status = p_naar,
      status_sinds = now(),
      annuleringskosten = kosten,
      beeindigd = case when p_naar = 'afgerond' then now() else beeindigd end
  where id = p_boeking;
end;
$$;

-- De uitlater start pas als de eigenaar de juiste ophaalcode heeft gegeven.
create or replace function public.start_wandeling(p_boeking uuid, p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  b public.boekingen;
begin
  select * into b from public.boekingen where id = p_boeking for update;
  if not found or b.uitlater_id is distinct from (select auth.uid()) or b.status <> 'aangekomen' then
    raise exception 'Deze stap kan nu niet';
  end if;
  if not exists (select 1 from public.ophaalcodes where boeking_id = p_boeking and code = p_code) then
    return false;
  end if;
  update public.boekingen set status = 'bezig', status_sinds = now(), gestart = now() where id = p_boeking;
  insert into public.wandel_gebeurtenissen (boeking_id, soort) values (p_boeking, 'start');
  return true;
end;
$$;

-- Row Level Security ----------------------------------------------------------

alter table public.profielen enable row level security;
alter table public.adressen enable row level security;
alter table public.honden enable row level security;
alter table public.uitlaters enable row level security;
alter table public.uitlaters_prive enable row level security;
alter table public.series enable row level security;
alter table public.boekingen enable row level security;
alter table public.ophaalcodes enable row level security;
alter table public.wandel_posities enable row level security;
alter table public.wandel_gebeurtenissen enable row level security;
alter table public.reviews enable row level security;
alter table public.berichten enable row level security;
alter table public.blokkades enable row level security;
alter table public.meldingen enable row level security;
alter table public.incidenten enable row level security;

create policy "profielen lezen" on public.profielen for select to authenticated using (true);
create policy "eigen profiel maken" on public.profielen for insert to authenticated with check (id = (select auth.uid()));
create policy "eigen profiel wijzigen" on public.profielen for update to authenticated using (id = (select auth.uid()));

create policy "eigen adres" on public.adressen for all to authenticated
  using (gebruiker_id = (select auth.uid())) with check (gebruiker_id = (select auth.uid()));
create policy "adres voor uitlater van geaccepteerde boeking" on public.adressen for select to authenticated using (
  exists (
    select 1 from public.boekingen b
    where b.eigenaar_id = adressen.gebruiker_id and b.uitlater_id = (select auth.uid())
      and b.status in ('gepland', 'onderweg', 'aangekomen', 'bezig')
  )
);

create policy "eigen honden" on public.honden for all to authenticated
  using (eigenaar_id = (select auth.uid())) with check (eigenaar_id = (select auth.uid()));
create policy "honden van een verzoek aan mij" on public.honden for select to authenticated using (
  exists (
    select 1 from public.boekingen b
    where b.uitlater_id = (select auth.uid()) and honden.id = any (b.hond_ids)
      and b.status not in ('geannuleerd', 'geweigerd')
  )
);

create policy "uitlaters lezen" on public.uitlaters for select to authenticated
  using (id = (select auth.uid()) or (public.mag_uitlaten(uitlaters) and not public.is_geblokkeerd((select auth.uid()), id)));
create policy "eigen uitlaatprofiel maken" on public.uitlaters for insert to authenticated with check (id = (select auth.uid()));
create policy "eigen uitlaatprofiel wijzigen" on public.uitlaters for update to authenticated using (id = (select auth.uid()));
-- Verificatievelden zijn alleen door Woober te zetten.
revoke insert, update on public.uitlaters from authenticated;
grant insert (id, wijk, bio, ervaring, professioneel, bedrijfsnaam, diensten, oppas_per_uur, tarief_30, tarief_45, tarief_60,
              toeslag_extra_hond, max_honden, werkgebied_km, vervoer, beschikbaarheid) on public.uitlaters to authenticated;
grant update (wijk, bio, ervaring, professioneel, bedrijfsnaam, diensten, oppas_per_uur, tarief_30, tarief_45, tarief_60,
              toeslag_extra_hond, max_honden, werkgebied_km, vervoer, beschikbaarheid, online, lat, lng) on public.uitlaters to authenticated;

create policy "eigen prive" on public.uitlaters_prive for select to authenticated using (id = (select auth.uid()));
create policy "eigen kvk" on public.uitlaters_prive for update to authenticated using (id = (select auth.uid()));
revoke update on public.uitlaters_prive from authenticated;
grant update (kvk_nummer) on public.uitlaters_prive to authenticated;

create policy "eigen series" on public.series for select to authenticated using ((select auth.uid()) in (eigenaar_id, uitlater_id));
create policy "serie stoppen" on public.series for update to authenticated using ((select auth.uid()) in (eigenaar_id, uitlater_id));
revoke update on public.series from authenticated;
grant update (actief) on public.series to authenticated;

-- Boekingen ontstaan en veranderen alleen via de functies hierboven; lezen mogen beide deelnemers.
create policy "eigen boekingen" on public.boekingen for select to authenticated using ((select auth.uid()) in (eigenaar_id, uitlater_id));
revoke insert, update, delete on public.boekingen from authenticated;
grant update (fooi) on public.boekingen to authenticated;
create policy "fooi na afloop" on public.boekingen for update to authenticated
  using (eigenaar_id = (select auth.uid()) and status = 'afgerond');

create policy "eigen ophaalcode" on public.ophaalcodes for select to authenticated using (
  exists (select 1 from public.boekingen b where b.id = ophaalcodes.boeking_id and b.eigenaar_id = (select auth.uid()))
);

create policy "positie tijdens wandeling" on public.wandel_posities for insert to authenticated with check (
  exists (select 1 from public.boekingen b where b.id = boeking_id and b.uitlater_id = (select auth.uid()) and b.status = 'bezig')
);
create policy "posities lezen" on public.wandel_posities for select to authenticated using (public.is_deelnemer(boeking_id));

create policy "gebeurtenis tijdens wandeling" on public.wandel_gebeurtenissen for insert to authenticated with check (
  exists (select 1 from public.boekingen b where b.id = boeking_id and b.uitlater_id = (select auth.uid()) and b.status = 'bezig')
);
create policy "gebeurtenissen lezen" on public.wandel_gebeurtenissen for select to authenticated using (public.is_deelnemer(boeking_id));

create policy "reviews lezen" on public.reviews for select to authenticated using (true);
create policy "review na betaalde wandeling" on public.reviews for insert to authenticated with check (
  auteur_id = (select auth.uid())
  and exists (
    select 1 from public.boekingen b
    where b.id = boeking_id and b.status = 'afgerond' and b.soort = 'betaald'
      and ((b.eigenaar_id = auteur_id and b.uitlater_id = ontvanger_id) or (b.uitlater_id = auteur_id and b.eigenaar_id = ontvanger_id))
  )
);

create policy "eigen berichten" on public.berichten for select to authenticated using ((select auth.uid()) in (van_id, naar_id));
create policy "bericht sturen" on public.berichten for insert to authenticated
  with check (van_id = (select auth.uid()) and not public.is_geblokkeerd(van_id, naar_id));

create policy "eigen blokkades" on public.blokkades for all to authenticated
  using (blokkeerder_id = (select auth.uid())) with check (blokkeerder_id = (select auth.uid()));

create policy "melding doen" on public.meldingen for insert to authenticated with check (melder_id = (select auth.uid()));
create policy "eigen meldingen" on public.meldingen for select to authenticated using (melder_id = (select auth.uid()));

create policy "incident melden" on public.incidenten for insert to authenticated
  with check (melder_id = (select auth.uid()) and public.is_deelnemer(boeking_id));
create policy "incidenten lezen" on public.incidenten for select to authenticated using (public.is_deelnemer(boeking_id));

grant execute on function public.vraag_kennismaking_aan, public.wijzig_status, public.start_wandeling to authenticated;

-- Live meekijken via Supabase Realtime (alleen voor deelnemers, door de RLS hierboven).
-- alter publication supabase_realtime add table public.boekingen, public.wandel_posities, public.wandel_gebeurtenissen, public.berichten;

-- Locatie na 30 dagen verwijderen (vereist de extensie pg_cron in Supabase):
-- select cron.schedule('posities opruimen', '17 3 * * *', $$delete from public.wandel_posities where tijd < now() - interval '30 days'$$);
