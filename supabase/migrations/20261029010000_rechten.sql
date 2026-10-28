-- Woober: rechten op functies aanscherpen (beveiligingsadviezen van Supabase)
--
-- * Zonder account roept niemand nog een functie aan. De app leest zonder account alleen de tabel teksten.
-- * Hulpfuncties die in de regels (RLS) staan, moeten ingelogde gebruikers wel kunnen uitvoeren. Ze geven nu
--   alleen nog antwoord over de vrager zelf, zodat niemand via /rest/v1/rpc kan nagaan wie elkaar kent of blokkeert.
--   Overal waar ze gebruikt worden, is de vrager een van de twee; daar verandert niets.
-- * Een vast zoekpad voor de laatste twee functies zonder.

-- Zonder account: geen functies, nu en voor functies die later bijkomen
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges revoke execute on functions from public;

create or replace function public.is_geblokkeerd(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.uid()) in (a, b), false) and exists (
    select 1 from public.blokkades
    where (blokkeerder_id = a and geblokkeerde_id = b) or (blokkeerder_id = b and geblokkeerde_id = a)
  );
$$;

create or replace function public.kent_elkaar(eigenaar uuid, uitlater uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.uid()) in (eigenaar, uitlater), false) and exists (
    select 1 from public.boekingen
    where eigenaar_id = eigenaar and uitlater_id = uitlater and status = 'afgerond'
  );
$$;

create or replace function public.plekken_afgelopen_dag(wie uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.plekken
  where toegevoegd_door = wie and wie = (select auth.uid()) and aangemaakt > now() - interval '1 day';
$$;

alter function public.mag_uitlaten(public.uitlaters) set search_path = '';
alter function public.tarief_voor(public.uitlaters, public.dienst, integer) set search_path = '';
