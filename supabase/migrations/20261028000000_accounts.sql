-- Woober: echte accounts (aanmelden met e-mail, Apple of Google)
--
-- * Het profiel maakt de app zelf aan na het inloggen, als de gebruiker de aanmelding afmaakt.
-- * Coördinaten van het adres vult straks een serverproces (geocoderen); tot dan mogen ze leeg zijn.
-- * Account verwijderen kan in de app zelf (verplicht in de App Store). Het grootboek blijft bewaard, zonder persoon.

-- Laatst gekozen rol, zodat de app na opnieuw inloggen in dezelfde modus opent
alter table public.profielen add column rol text not null default 'eigenaar' check (rol in ('eigenaar', 'uitlater'));

alter table public.adressen alter column lat drop not null;
alter table public.adressen alter column lng drop not null;

-- Leeftijd van de uitlater, zoals die op het profiel staat. Alleen het getal, geen geboortedatum.
alter table public.uitlaters add column leeftijd smallint check (leeftijd between 18 and 99);
grant insert (leeftijd), update (leeftijd) on public.uitlaters to authenticated;

create or replace function public.verwijder_mijn_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  ik uuid := (select auth.uid());
begin
  if ik is null then raise exception 'Niet ingelogd'; end if;
  -- Verwijdert via on delete cascade ook profiel, adres, honden, uitlaatprofiel, boekingen en berichten
  delete from auth.users where id = ik;
end;
$$;

revoke execute on function public.verwijder_mijn_account from public, anon;
grant execute on function public.verwijder_mijn_account to authenticated;
