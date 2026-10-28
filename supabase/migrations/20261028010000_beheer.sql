-- Woober: beheerders
--
-- Een beheerder (het team) ziet in de app het scherm Beheer, met onder meer het verdienmodel.
-- Beheerder word je alleen via de database (SQL-editor of service_role), nooit vanuit de app:
--   insert into public.beheerders (gebruiker_id) select id from auth.users where email = '...';

create table public.beheerders (
  gebruiker_id uuid primary key references auth.users (id) on delete cascade,
  aangemaakt timestamptz not null default now()
);

alter table public.beheerders enable row level security;
-- Alleen je eigen rij, zodat de app weet of je beheerder bent; wie er nog meer beheerder is, blijft verborgen
create policy "eigen beheerrol" on public.beheerders for select to authenticated using (gebruiker_id = (select auth.uid()));
revoke insert, update, delete on public.beheerders from anon, authenticated;

create or replace function public.ben_beheerder()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.beheerders where gebruiker_id = (select auth.uid()));
$$;

-- Een verdienmodel inplannen. De regels uit bewaak_planning() gelden ook hier: nooit met terugwerkende kracht,
-- en een hogere commissie pas 15 dagen na aankondiging (P2B-verordening).
create or replace function public.plan_verdienmodel(p_model text, p_vanaf timestamptz, p_toelichting text default '')
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  nieuw bigint;
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  if not exists (select 1 from public.verdienmodellen where id = p_model) then raise exception 'Onbekend verdienmodel'; end if;
  insert into public.verdienmodel_planning (model_id, geldig_vanaf, toelichting)
  values (p_model, p_vanaf, coalesce(p_toelichting, ''))
  returning id into nieuw;
  return nieuw;
end;
$$;

revoke execute on function public.ben_beheerder, public.plan_verdienmodel from public, anon;
grant execute on function public.ben_beheerder, public.plan_verdienmodel to authenticated;
