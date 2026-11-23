-- Woober: lagere drempel voor uitlaters en oppassen
--
-- * Geen verzekering en geen VOG meer bij de verificatie. De eigenaar blijft aansprakelijk voor schade door de hond
--   (artikel 6:179 BW), ook als iemand anders uitlaat; dat is niet aan Woober om na te vragen. Een VOG kost geld en tijd.
--   Wie mag uitlaten: identiteit en rekening in orde, allebei gecontroleerd door Mollie.
-- * Een account kan vanaf 14 jaar; onder de 18 met toestemming van een ouder of voogd. Die toestemming staat in een
--   eigen tabel, want profielen zijn voor iedereen leesbaar. Alleen de gebruiker zelf en Woober (beheer) zien hem.

-- Verificatie ------------------------------------------------------------------------

create or replace function public.mag_uitlaten(u public.uitlaters)
returns boolean language sql immutable set search_path = '' as $$
  select u.identiteit_ok and u.uitbetaling_ok;
$$;

-- Andere teruggegeven kolommen, dus opnieuw aanmaken
drop function public.beheer_uitlaters();

-- Toestemming van een ouder of voogd ------------------------------------------------------

create table public.toestemming_ouders (
  gebruiker_id uuid primary key references public.profielen (id) on delete cascade,
  gegeven timestamptz not null default now()
);
alter table public.toestemming_ouders enable row level security;
create policy "eigen toestemming lezen" on public.toestemming_ouders for select to authenticated
  using (gebruiker_id = (select auth.uid()));
create policy "eigen toestemming bewaren" on public.toestemming_ouders for insert to authenticated
  with check (gebruiker_id = (select auth.uid()));
revoke all on public.toestemming_ouders from anon;
revoke update, delete, truncate on public.toestemming_ouders from authenticated;

-- Alle uitlaatprofielen, ook nog niet geverifieerde, met e-mailadres en of de uitlater jonger dan 18 is. Alleen voor Woober.
create function public.beheer_uitlaters()
returns table (
  id uuid, voornaam text, email text, plaats text, wijk text, diensten public.dienst[],
  identiteit_ok boolean, uitbetaling_ok boolean, minderjarig boolean, aangemaakt timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  return query
    select u.id, p.voornaam, au.email::text, p.plaats, u.wijk, u.diensten,
           u.identiteit_ok, u.uitbetaling_ok, exists (select 1 from public.toestemming_ouders t where t.gebruiker_id = u.id),
           u.aangemaakt
    from public.uitlaters u
    join public.profielen p on p.id = u.id
    join auth.users au on au.id = u.id
    order by u.aangemaakt desc;
end;
$$;

create or replace function public.beheer_zet_verificatie(p_uitlater uuid, p_stap text, p_aan boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  aantal integer;
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  if p_stap not in ('identiteit', 'uitbetaling') then raise exception 'Onbekende stap'; end if;
  execute format('update public.uitlaters set %I = $1 where id = $2', p_stap || '_ok') using p_aan, p_uitlater;
  -- EXECUTE zet FOUND niet; daarom het aantal rijen
  get diagnostics aantal = row_count;
  if aantal = 0 then raise exception 'Onbekende uitlater'; end if;
end;
$$;

revoke execute on function public.beheer_uitlaters from public, anon;
grant execute on function public.beheer_uitlaters to authenticated;

-- Wat al bewaard was, weg: het waren alleen vinkjes, maar het hoort niet bij Woober
alter table public.uitlaters drop column verzekering_ok, drop column vog_ok;

-- Leeftijd -------------------------------------------------------------------------------

alter table public.uitlaters drop constraint uitlaters_leeftijd_check,
  add constraint uitlaters_leeftijd_check check (leeftijd between 14 and 99);
