-- Woober: teksten die beheerders in de app zelf aanpassen
--
-- De standaardtekst staat in de app (src/lib/teksten.ts). Hier staan alleen de aanpassingen; een rij
-- verwijderen zet de tekst terug naar de standaard. Iedereen mag lezen, ook zonder account, omdat het
-- welkomscherm en de privacyverklaring ook zonder account te zien zijn. Alleen beheerders schrijven.

create table public.teksten (
  sleutel text primary key check (sleutel ~ '^[a-z0-9_.]{2,60}$'),
  waarde text not null check (char_length(waarde) <= 4000),
  gewijzigd timestamptz not null default now(),
  gewijzigd_door uuid default auth.uid() references auth.users (id) on delete set null
);

create or replace function public.tekst_gewijzigd()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.gewijzigd := now();
  new.gewijzigd_door := (select auth.uid());
  return new;
end;
$$;
create trigger tekst_gewijzigd before insert or update on public.teksten
  for each row execute function public.tekst_gewijzigd();

alter table public.teksten enable row level security;
create policy "teksten lezen" on public.teksten for select to anon, authenticated using (true);
create policy "beheerder schrijft teksten" on public.teksten for insert to authenticated with check (public.ben_beheerder());
create policy "beheerder past teksten aan" on public.teksten for update to authenticated using (public.ben_beheerder()) with check (public.ben_beheerder());
create policy "beheerder zet tekst terug" on public.teksten for delete to authenticated using (public.ben_beheerder());
revoke all on public.teksten from anon;
grant select on public.teksten to anon;
revoke all on public.teksten from authenticated;
grant select, insert, update, delete on public.teksten to authenticated;
