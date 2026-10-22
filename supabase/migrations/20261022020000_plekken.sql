-- Woober: plekken voor honden (concept)
--
-- Losloopgebieden, hondvriendelijke stranden en horeca op de kaart, met reviews van gebruikers.
-- Woober beheert de plekken zelf (service_role, nooit vanuit de app). Elke aangemelde gebruiker
-- mag één review per plek schrijven en die aanpassen of verwijderen. Een gemelde review
-- beoordeelt altijd een medewerker.

create type public.plek_soort as enum ('losloop', 'strand', 'horeca');

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
  aangemaakt timestamptz not null default now()
);
create index on public.plekken (soort);

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

-- Een melding kan ook over een review van een plek gaan
alter table public.meldingen add column plek_review_id uuid references public.plek_reviews (id) on delete set null;

alter table public.plekken enable row level security;
alter table public.plek_reviews enable row level security;

create policy "plekken lezen" on public.plekken for select to authenticated using (true);
revoke insert, update, delete on public.plekken from anon, authenticated;

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
