-- Woober: plekken voor honden (concept)
--
-- Losloopgebieden, hondvriendelijke stranden, horeca en andere plekken op de kaart, met reviews van gebruikers.
-- Woober zet plekken klaar (service_role, nooit vanuit de app) en gebruikers voegen er zelf aan toe.
-- Een nieuwe plek van een gebruiker is meteen zichtbaar met de status 'nieuw'; een medewerker zet hem
-- daarna op 'gecontroleerd' of 'verborgen'. Elke aangemelde gebruiker mag één review per plek schrijven
-- en die aanpassen of verwijderen. Gemelde plekken en reviews beoordeelt altijd een medewerker.

create type public.plek_soort as enum ('losloop', 'strand', 'horeca', 'overig');
create type public.plek_status as enum ('nieuw', 'gecontroleerd', 'verborgen');

create table public.plekken (
  id uuid primary key default gen_random_uuid(),
  soort public.plek_soort not null,
  naam text not null check (char_length(naam) between 1 and 80),
  omschrijving text not null default '' check (char_length(omschrijving) <= 500),
  kenmerken text[] not null default '{}',
  -- Regels per seizoen of tijdstip, zoals een strandverbod in de zomer
  regels text not null default '' check (char_length(regels) <= 300),
  plaats text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- Leeg bij plekken van Woober; blijft staan als het account verdwijnt, zonder naam
  toegevoegd_door uuid default auth.uid() references public.profielen (id) on delete set null,
  status public.plek_status not null default 'nieuw',
  aangemaakt timestamptz not null default now()
);
create index on public.plekken (soort);
create index on public.plekken (toegevoegd_door, aangemaakt);

create table public.plek_reviews (
  id uuid primary key default gen_random_uuid(),
  plek_id uuid not null references public.plekken (id) on delete cascade,
  auteur_id uuid not null references public.profielen (id) on delete cascade,
  sterren smallint not null check (sterren between 1 and 5),
  tekst text not null default '' check (char_length(tekst) <= 300),
  aangemaakt timestamptz not null default now(),
  gewijzigd timestamptz not null default now(),
  unique (plek_id, auteur_id)
);
create index on public.plek_reviews (plek_id, aangemaakt desc);

-- Gemiddelde per plek, met de rechten van wie het opvraagt
create view public.plek_scores with (security_invoker = true) as
  select plek_id, round(avg(sterren), 1) as gemiddelde, count(*)::int as aantal
  from public.plek_reviews
  group by plek_id;

create or replace function public.plek_review_gewijzigd()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.gewijzigd := now();
  return new;
end;
$$;
create trigger plek_review_gewijzigd before update on public.plek_reviews
  for each row execute function public.plek_review_gewijzigd();

-- Een melding kan ook over een plek of een review van een plek gaan
alter table public.meldingen
  add column plek_id uuid references public.plekken (id) on delete set null,
  add column plek_review_id uuid references public.plek_reviews (id) on delete set null;

-- Aantal plekken dat iemand de afgelopen dag heeft toegevoegd. Een functie, omdat een policy niet zijn eigen tabel mag lezen.
create or replace function public.plekken_afgelopen_dag(wie uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.plekken where toegevoegd_door = wie and aangemaakt > now() - interval '1 day';
$$;

alter table public.plekken enable row level security;
alter table public.plek_reviews enable row level security;

create policy "plekken lezen" on public.plekken for select to authenticated using (
  toegevoegd_door = (select auth.uid())
  or (status <> 'verborgen' and not public.is_geblokkeerd((select auth.uid()), toegevoegd_door))
);
-- Status en toevoeger bepaalt de database, niet de app; tegen spam hooguit vijf nieuwe plekken per dag
create policy "plek toevoegen" on public.plekken for insert to authenticated with check (
  toegevoegd_door = (select auth.uid())
  and status = 'nieuw'
  and public.plekken_afgelopen_dag((select auth.uid())) < 5
);
create policy "eigen nieuwe plek verwijderen" on public.plekken for delete to authenticated
  using (toegevoegd_door = (select auth.uid()) and status = 'nieuw');
revoke insert, update on public.plekken from anon, authenticated;
grant insert (soort, naam, omschrijving, kenmerken, regels, plaats, lat, lng) on public.plekken to authenticated;

create policy "plekreviews lezen" on public.plek_reviews for select to authenticated
  using (not public.is_geblokkeerd((select auth.uid()), auteur_id));
create policy "eigen plekreview schrijven" on public.plek_reviews for insert to authenticated
  with check (auteur_id = (select auth.uid()));
create policy "eigen plekreview aanpassen" on public.plek_reviews for update to authenticated
  using (auteur_id = (select auth.uid())) with check (auteur_id = (select auth.uid()));
create policy "eigen plekreview verwijderen" on public.plek_reviews for delete to authenticated
  using (auteur_id = (select auth.uid()));
revoke update on public.plek_reviews from authenticated;
grant update (sterren, tekst) on public.plek_reviews to authenticated;
