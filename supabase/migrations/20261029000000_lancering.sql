-- Woober: klaar voor de start in de pilotstad
--
-- * Akkoord met de gebruiksvoorwaarden: wanneer en welke versie.
-- * Wachtlijst: wie het wil weten zodra Woober in de buurt start.
-- * Melden van een plek van Woober zelf (zonder toevoeger), bijvoorbeeld een café dat dicht is.
-- * Beheer: plekken toevoegen, aanpassen en verbergen; reviews verwijderen; meldingen afhandelen;
--   uitlaters verifiëren; wachtlijst en cijfers inzien. Altijd beoordeeld door een mens.

-- Voorwaarden ------------------------------------------------------------------

alter table public.profielen
  add column voorwaarden_akkoord timestamptz,
  add column voorwaarden_versie text check (char_length(voorwaarden_versie) <= 40);

-- Wachtlijst --------------------------------------------------------------------

create table public.wachtlijst (
  gebruiker_id uuid primary key references public.profielen (id) on delete cascade,
  rol text not null check (rol in ('eigenaar', 'uitlater')),
  aangemaakt timestamptz not null default now()
);
alter table public.wachtlijst enable row level security;
create policy "eigen plek op de wachtlijst" on public.wachtlijst for all to authenticated
  using (gebruiker_id = (select auth.uid())) with check (gebruiker_id = (select auth.uid()));

-- Melden ------------------------------------------------------------------------

-- Een plek van Woober heeft geen toevoeger; ook die moet je kunnen melden. Een nieuwe melding gaat altijd
-- over iemand, een plek of een review. Geen check op de tabel: als een plek later wordt verwijderd,
-- blijft de melding bewaard zonder plek.
alter table public.meldingen alter column gemeld_id drop not null;
drop policy "melding doen" on public.meldingen;
create policy "melding doen" on public.meldingen for insert to authenticated with check (
  melder_id = (select auth.uid()) and (gemeld_id is not null or plek_id is not null or plek_review_id is not null)
);

-- Beheer: plekken, reviews en meldingen -----------------------------------------------

create policy "beheerder leest alle plekken" on public.plekken for select to authenticated using (public.ben_beheerder());
create policy "beheerder past plekken aan" on public.plekken for update to authenticated
  using (public.ben_beheerder()) with check (public.ben_beheerder());
create policy "beheerder verwijdert plekken" on public.plekken for delete to authenticated using (public.ben_beheerder());
-- Er is geen andere update-policy op plekken, dus gewone gebruikers kunnen hiermee niets aanpassen
grant update (soort, naam, omschrijving, kenmerken, regels, plaats, lat, lng, status) on public.plekken to authenticated;

create policy "beheerder verwijdert plekreviews" on public.plek_reviews for delete to authenticated using (public.ben_beheerder());

create policy "beheerder leest meldingen" on public.meldingen for select to authenticated using (public.ben_beheerder());
create policy "beheerder handelt meldingen af" on public.meldingen for update to authenticated
  using (public.ben_beheerder()) with check (public.ben_beheerder());
revoke update on public.meldingen from authenticated;
grant update (status, besluit) on public.meldingen to authenticated;

-- Plek van Woober zelf: meteen gecontroleerd, zonder toevoeger. Bestaat de naam al in die plaats, dan dat id.
create or replace function public.beheer_plek_toevoegen(
  p_soort public.plek_soort, p_naam text, p_omschrijving text, p_kenmerken text[], p_regels text,
  p_plaats text, p_lat double precision, p_lng double precision
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  bestaand uuid;
  nieuw uuid;
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  select id into bestaand from public.plekken where naam = p_naam and plaats = p_plaats limit 1;
  if bestaand is not null then return bestaand; end if;
  insert into public.plekken (soort, naam, omschrijving, kenmerken, regels, plaats, lat, lng, toegevoegd_door, status)
  values (p_soort, p_naam, coalesce(p_omschrijving, ''), coalesce(p_kenmerken, '{}'), coalesce(p_regels, ''), p_plaats, p_lat, p_lng, null, 'gecontroleerd')
  returning id into nieuw;
  return nieuw;
end;
$$;

-- Beheer: uitlaters ----------------------------------------------------------------

-- Alle uitlaatprofielen, ook nog niet geverifieerde, met e-mailadres om contact op te nemen. Alleen voor Woober.
create or replace function public.beheer_uitlaters()
returns table (
  id uuid, voornaam text, email text, plaats text, wijk text, diensten public.dienst[],
  identiteit_ok boolean, verzekering_ok boolean, uitbetaling_ok boolean, vog_ok boolean, aangemaakt timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  return query
    select u.id, p.voornaam, au.email::text, p.plaats, u.wijk, u.diensten,
           u.identiteit_ok, u.verzekering_ok, u.uitbetaling_ok, u.vog_ok, u.aangemaakt
    from public.uitlaters u
    join public.profielen p on p.id = u.id
    join auth.users au on au.id = u.id
    order by u.aangemaakt desc;
end;
$$;

-- Een verificatiestap aan- of uitzetten, na controle door een medewerker
create or replace function public.beheer_zet_verificatie(p_uitlater uuid, p_stap text, p_aan boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  aantal integer;
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  if p_stap not in ('identiteit', 'verzekering', 'uitbetaling', 'vog') then raise exception 'Onbekende stap'; end if;
  execute format('update public.uitlaters set %I = $1 where id = $2', p_stap || '_ok') using p_aan, p_uitlater;
  -- EXECUTE zet FOUND niet; daarom het aantal rijen
  get diagnostics aantal = row_count;
  if aantal = 0 then raise exception 'Onbekende uitlater'; end if;
end;
$$;

-- Beheer: wachtlijst en cijfers ----------------------------------------------------------

create or replace function public.beheer_wachtlijst()
returns table (voornaam text, email text, rol text, postcode text, plaats text, aangemaakt timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  return query
    select p.voornaam, au.email::text, w.rol, a.postcode, coalesce(a.plaats, p.plaats), w.aangemaakt
    from public.wachtlijst w
    join public.profielen p on p.id = w.gebruiker_id
    join auth.users au on au.id = w.gebruiker_id
    left join public.adressen a on a.gebruiker_id = w.gebruiker_id
    order by w.aangemaakt desc;
end;
$$;

create or replace function public.beheer_cijfers()
returns table (
  accounts integer, eigenaren integer, uitlaters integer, uitlaters_geverifieerd integer, honden integer,
  plekken integer, plekken_nieuw integer, plekreviews integer, meldingen_open integer, wachtlijst integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  return query select
    (select count(*)::int from public.profielen),
    (select count(*)::int from public.profielen where rol = 'eigenaar'),
    (select count(*)::int from public.uitlaters),
    (select count(*)::int from public.uitlaters u where public.mag_uitlaten(u)),
    (select count(*)::int from public.honden),
    (select count(*)::int from public.plekken where status <> 'verborgen'),
    (select count(*)::int from public.plekken where status = 'nieuw'),
    (select count(*)::int from public.plek_reviews),
    (select count(*)::int from public.meldingen where status <> 'afgehandeld'),
    (select count(*)::int from public.wachtlijst);
end;
$$;

revoke execute on function public.beheer_plek_toevoegen, public.beheer_uitlaters, public.beheer_zet_verificatie,
  public.beheer_wachtlijst, public.beheer_cijfers from public, anon;
grant execute on function public.beheer_plek_toevoegen, public.beheer_uitlaters, public.beheer_zet_verificatie,
  public.beheer_wachtlijst, public.beheer_cijfers to authenticated;
