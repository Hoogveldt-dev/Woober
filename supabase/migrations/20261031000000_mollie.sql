-- Betalen via Mollie Connect for Marketplaces met vertraagde routing (PLAN.md, Betalen).
--
-- Eigenaren betalen per boeking aan het marktplaatsaccount van Woober bij Mollie. Mollie houdt het geld vast; Woober
-- routeert het pas naar de Mollie-organisatie van een uitlater als die zijn saldo laat uitbetalen, of automatisch
-- voordat Mollie het na 90 dagen zelf naar het saldo van Woober zet. Wat niet naar uitlaters gaat (commissie,
-- servicekosten), blijft ongerouteerd en komt zo vanzelf bij Woober.
--
-- Het werk met Mollie zelf (betaling starten, webhook, terugbetalen, routeren, aansluiten) staat in
-- supabase/functions/ en loopt met de service_role. Deze migratie bewaart de toestand en rekent uit wat er
-- terugbetaald en gerouteerd moet worden. Alle functies hier zijn alleen voor de server, behalve mijn_mollie_koppeling()
-- en de functies voor Beheer.
--
-- Terugboekingen via de bank (chargebacks, bij kaart en Apple Pay) draagt Woober, nooit de uitlater: Mollie haalt bij
-- een volledige terugboeking wat al naar uitlaters ging bij hen terug, en Woober vult dat aan. Een medewerker
-- beoordeelt de eigenaar in Beheer.

-- De kolommen voor Stripe zijn niet meer nodig: betalingen staan in de tabel betalingen, de koppeling met de uitlater
-- in mollie_koppelingen, en Woober Plus gaat later via Mollie
alter table public.boekingen drop column stripe_payment_intent;
alter table public.uitlaters_prive drop column stripe_account_id;
alter table public.abonnementen drop column stripe_subscription;
-- De eigenaar heeft het deel betaald dat niet met saldo gaat; pas dan kan de uitlater accepteren
alter table public.boekingen add column betaald boolean not null default false;
-- Een fooi telt pas als hij via Mollie is betaald (verwerk_betaling); zelf invullen zou Woober laten bijleggen
drop policy "fooi na afloop" on public.boekingen;
revoke update (fooi) on public.boekingen from authenticated;

-- De eigenaar betaalt bij het boeken, en Mollie houdt ongerouteerd geld hooguit 90 dagen vast. Daarom boek je
-- hooguit 60 dagen vooruit, zodat het geld ruim op tijd bij de uitlater kan zijn. De app biedt nu een week.
create or replace function public.niet_te_ver_vooruit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.moment > now() + interval '60 days' then raise exception 'Boeken kan tot 60 dagen vooruit'; end if;
  return new;
end;
$$;
create trigger niet_te_ver_vooruit before insert or update of moment on public.boekingen
  for each row execute function public.niet_te_ver_vooruit();

-- Betalingen ------------------------------------------------------------------------

create table public.betalingen (
  -- Kenmerk bij Mollie, zoals tr_WDqYK6vllg
  id text primary key check (id ~ '^tr_[A-Za-z0-9]+$'),
  -- Blijft bewaard als het account weg is (fiscale bewaarplicht), net als het grootboek
  boeking_id uuid references public.boekingen (id) on delete set null,
  -- Een verlenging is een extra uur oppas; dat gaat pas in als het betaald is
  soort text not null default 'boeking' check (soort in ('boeking', 'verlenging', 'fooi')),
  bedrag integer not null check (bedrag > 0),
  methode public.betaalmethode not null,
  status text not null default 'open' check (status in ('open', 'betaald', 'mislukt')),
  terugbetaald integer not null default 0 check (terugbetaald >= 0),
  -- Bij een verlenging: de duur van de oppas daarna, in minuten
  verlengd_tot smallint,
  aangemaakt timestamptz not null default now(),
  betaald_op timestamptz,
  -- Terugboeking via de bank, zoals Mollie die meldt (amountChargedBack)
  teruggeboekt integer not null default 0 check (teruggeboekt >= 0),
  teruggeboekt_op timestamptz,
  -- Wanneer Woober de uitlaters aanvulde van wie Mollie het geld terughaalde
  aangevuld_op timestamptz,
  -- Besluit van een medewerker over de eigenaar na een terugboeking
  besluit text,
  check (terugbetaald <= bedrag and teruggeboekt <= bedrag),
  check ((soort = 'verlenging') = (verlengd_tot is not null))
);
create index on public.betalingen (boeking_id);
alter table public.betalingen enable row level security;
-- De eigenaar ziet de stand van zijn eigen betalingen (bijvoorbeeld na terugkomen van de betaalpagina)
create policy "eigen betalingen" on public.betalingen for select to authenticated
  using (exists (select 1 from public.boekingen b where b.id = boeking_id and b.eigenaar_id = (select auth.uid())));
revoke insert, update, delete on public.betalingen from authenticated, anon;

-- Accepteren kan pas als er betaald is (of als het saldo alles dekt). Bij een boeking voor nu accepteert de
-- uitlater door meteen onderweg te gaan, dus elke stap uit aangevraagd telt, behalve annuleren en weigeren.
create or replace function public.eerst_betaald()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'aangevraagd' and new.status not in ('aangevraagd', 'geannuleerd', 'geweigerd') and new.soort = 'betaald'
     -- totaal is een berekende kolom en in een before-trigger nog leeg; een statuswijziging verandert hem niet
     and old.totaal - old.met_saldo > 0 and not new.betaald then
    raise exception 'De eigenaar heeft nog niet betaald';
  end if;
  return new;
end;
$$;
create trigger eerst_betaald before update of status on public.boekingen for each row execute function public.eerst_betaald();

-- Prijs van een oppas na een uur verlengen, met hetzelfde model, dezelfde drukte en hetzelfde tegoed als bij het boeken
create or replace function public.prijs_verlengd(b public.boekingen)
returns public.prijs_opbouw language sql stable security definer set search_path = '' as $$
  select public.bereken_prijs(m, public.tarief_voor(u, 'oppas', b.duur + 60), b.toeslag, b.drukte_factor, b.plus, b.korting)
  from public.verdienmodellen m, public.uitlaters u
  where m.id = b.verdienmodel_id and u.id = b.uitlater_id;
$$;

-- Verlengen gebeurt pas als het extra uur betaald is (verwerk_betaling); direct verlengen kan niet meer
drop function public.verleng_oppas(uuid);

-- Verlengt een oppas tot p_duur. Alleen als de oppas nog loopt en nog precies een uur korter is: een tweede betaling
-- voor hetzelfde uur verlengt niet nog eens, en betaling_verdeling geeft dat geld dan vanzelf terug.
create or replace function public.verleng_tot(p_boeking uuid, p_duur smallint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  b public.boekingen;
  p public.prijs_opbouw;
begin
  select * into b from public.boekingen where id = p_boeking for update;
  if not found or b.dienst <> 'oppas' or b.duur <> p_duur - 60 or b.status not in ('gepland', 'onderweg', 'aangekomen', 'bezig') then
    return false;
  end if;
  p := public.prijs_verlengd(b);
  update public.boekingen
  set duur = p_duur, tarief = p.tarief, drukte = p.drukte, drukte_uitlater = p.drukte_uitlater,
      servicekosten = p.servicekosten, boekingskosten = p.boekingskosten, korting = p.korting, commissie = p.commissie
  where id = p_boeking;
  return true;
end;
$$;

-- Wat er bij een boeking te betalen is; controleert of de boeking van deze eigenaar is
create or replace function public.betaling_voor(p_boeking uuid, p_eigenaar uuid, p_soort text default 'boeking', p_fooi integer default null)
returns table (bedrag integer, methode public.betaalmethode, omschrijving text, verlengd_tot smallint)
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.boekingen;
  naam text;
  v public.prijs_opbouw;
begin
  select * into b from public.boekingen where id = p_boeking;
  if not found or b.eigenaar_id is distinct from p_eigenaar then raise exception 'Deze boeking hoort niet bij jou'; end if;
  select voornaam into naam from public.profielen where id = b.uitlater_id;
  if p_soort = 'fooi' then
    if b.status <> 'afgerond' or b.soort <> 'betaald' then raise exception 'Een fooi kan na afloop'; end if;
    if p_fooi is null or p_fooi < 100 or b.fooi + p_fooi > 5000 then raise exception 'Een fooi is 1 tot 50 euro'; end if;
    return query select p_fooi, b.betaalmethode, format('Woober: fooi voor %s', coalesce(naam, 'je uitlater')), null::smallint;
    return;
  end if;
  if p_soort = 'verlenging' then
    if b.dienst <> 'oppas' or b.soort <> 'betaald' or b.status not in ('gepland', 'onderweg', 'aangekomen', 'bezig') then
      raise exception 'Verlengen kan nu niet';
    end if;
    if b.duur + 60 > 720 then raise exception 'Langer dan 12 uur kan niet'; end if;
    v := public.prijs_verlengd(b);
    -- Het verschil met de prijs nu; het tegoed van de boeking is al verrekend
    return query select (v.tarief + v.toeslag + v.drukte + v.servicekosten + v.boekingskosten - v.korting - b.totaal)::integer,
      b.betaalmethode, format('Woober: een uur langer oppas met %s', coalesce(naam, 'je oppas')), (b.duur + 60)::smallint;
    return;
  end if;
  if b.soort <> 'betaald' or b.status <> 'aangevraagd' or b.betaald then raise exception 'Deze boeking hoeft nu niet betaald te worden'; end if;
  if b.totaal - b.met_saldo <= 0 then raise exception 'Je saldo dekt deze boeking al'; end if;
  return query select (b.totaal - b.met_saldo)::integer, b.betaalmethode,
    format('Woober: %s met %s', case when b.dienst = 'oppas' then 'oppas' else 'uitlaten' end, coalesce(naam, 'je uitlater')), null::smallint;
end;
$$;

create or replace function public.registreer_betaling(p_id text, p_boeking uuid, p_soort text, p_bedrag integer, p_methode public.betaalmethode,
                                                     p_verlengd_tot smallint default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.betalingen (id, boeking_id, soort, bedrag, methode, verlengd_tot)
  values (p_id, p_boeking, p_soort, p_bedrag, p_methode, p_verlengd_tot)
  on conflict (id) do nothing;
$$;

-- Verwerkt de stand die de webhook bij Mollie opvroeg. Onbekende betalingen doen niets.
create or replace function public.verwerk_betaling(p_id text, p_status text, p_terugbetaald integer, p_teruggeboekt integer default 0)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.betalingen;
  was text;
begin
  if p_status not in ('open', 'betaald', 'mislukt') then raise exception 'Onbekende status %', p_status; end if;
  select status into was from public.betalingen where id = p_id for update;
  if not found then return; end if;
  update public.betalingen
  set status = case when status = 'betaald' then status else p_status end,
      betaald_op = case when p_status = 'betaald' and betaald_op is null then now() else betaald_op end,
      terugbetaald = greatest(terugbetaald, least(bedrag, coalesce(p_terugbetaald, 0))),
      -- Een terugboeking kan worden teruggedraaid; dan geldt het bedrag dat Mollie nu meldt
      teruggeboekt = least(bedrag, coalesce(p_teruggeboekt, 0)),
      teruggeboekt_op = case when coalesce(p_teruggeboekt, 0) > 0 then coalesce(teruggeboekt_op, now()) else teruggeboekt_op end
  where id = p_id
  returning * into p;
  if p.status = 'betaald' and was <> 'betaald' then
    if p.soort = 'boeking' then
      update public.boekingen set betaald = true where id = p.boeking_id and not betaald;
    elsif p.soort = 'verlenging' then
      perform public.verleng_tot(p.boeking_id, p.verlengd_tot);
    else
      -- De fooi telt pas als hij betaald is; het grootboek boekt hem dan naar de uitlater
      update public.boekingen set fooi = fooi + p.bedrag where id = p.boeking_id;
    end if;
  elsif p.soort = 'boeking' and p.status = 'mislukt'
     and not exists (select 1 from public.betalingen where boeking_id = p.boeking_id and soort = 'boeking' and status in ('open', 'betaald')) then
    -- Niet betaald en geen andere poging meer: de aanvraag vervalt
    update public.boekingen set status = 'geannuleerd', status_sinds = now() where id = p.boeking_id and status = 'aangevraagd';
  end if;
  -- Volledig teruggeboekt: Mollie haalt wat al uit deze betaling naar uitlaters ging bij hen terug (Mollie, Connect for
  -- Marketplaces, Refunds and chargebacks). Woober vult dat aan met een eigen uitbetaling, één keer per betaling.
  if p.teruggeboekt = p.bedrag and p.aangevuld_op is null then
    insert into public.uitbetalingen (uitlater_id, bedrag, reden)
    select u.uitlater_id, sum(r.bedrag)::integer, 'aanvulling'
    from public.mollie_routes r
    join public.uitbetalingen u on u.id = r.uitbetaling_id
    where r.betaling_id = p.id and r.soort = 'route' and r.status = 'gemaakt' and u.uitlater_id is not null
    group by u.uitlater_id;
    update public.betalingen set aangevuld_op = now() where id = p.id;
  end if;
end;
$$;

-- Hoe elke geslaagde betaling verdeeld wordt: wat Woober houdt voor de boeking (en dus later routeert of zelf
-- krijgt) en wat terug moet naar de eigenaar. De boeking en haar verlengingen samen dekken de prijs, oudste betaling
-- eerst; wat erboven komt (twee keer betaald, een verlenging die niet doorging) gaat terug. Netto is wat er van een
-- betaling over is na terugbetalen en terugboeken; Woober kan alleen dat houden of routeren.
create or replace function public.betaling_verdeling()
returns table (betaling_id text, boeking_id uuid, netto integer, behouden integer, definitief boolean, betaald_op timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, x.boeking_id, x.netto,
    (case when x.soort = 'fooi' then x.netto
     else greatest(0, least(x.netto, x.doel - coalesce(sum(x.netto) over (partition by x.boeking_id, x.soort = 'fooi' order by x.betaald_op, x.id
                                                                          rows between unbounded preceding and 1 preceding), 0)))
     end)::integer,
    (x.soort = 'fooi' or x.boekingstatus in ('afgerond', 'geannuleerd', 'geweigerd')),
    x.betaald_op
  from (
    select p.id, p.boeking_id, p.soort, p.betaald_op, b.status as boekingstatus,
      greatest(0, p.bedrag - p.terugbetaald - p.teruggeboekt) as netto,
      (case when b.status = 'geweigerd' then 0
            when b.status = 'geannuleerd' then b.annuleringskosten
            else b.totaal - b.met_saldo end) as doel
    from public.betalingen p
    join public.boekingen b on b.id = p.boeking_id
    where p.status = 'betaald'
  ) x;
$$;

-- Wat de server nog moet terugbetalen
create or replace function public.terug_te_betalen()
returns table (betaling_id text, bedrag integer)
language sql stable security definer set search_path = '' as $$
  select betaling_id, (netto - behouden)::integer
  from public.betaling_verdeling()
  where netto > behouden;
$$;

create or replace function public.boek_terugbetaling(p_id text, p_bedrag integer)
returns void language sql security definer set search_path = '' as $$
  update public.betalingen set terugbetaald = least(bedrag, terugbetaald + p_bedrag) where id = p_id;
$$;

-- Routes naar uitlaters --------------------------------------------------------------

-- Koppeling van een uitlater met zijn eigen Mollie-organisatie. Alleen voor de server: de app ziet alleen de status.
create table public.mollie_koppelingen (
  uitlater_id uuid primary key references public.uitlaters (id) on delete cascade,
  -- Willekeurige waarde tijdens het aansluiten (OAuth state); daarna leeg
  staat text unique,
  organisatie_id text unique check (organisatie_id ~ '^org_[A-Za-z0-9]+$'),
  -- Om de stand van het aansluiten bij Mollie op te vragen
  refresh_token text,
  status text not null default 'gestart' check (status in ('gestart', 'gegevens nodig', 'in controle', 'klaar')),
  bijgewerkt timestamptz not null default now()
);
alter table public.mollie_koppelingen enable row level security;
revoke all on public.mollie_koppelingen from authenticated, anon;

-- Een uitbetaling bestaat uit routes uit betalingen van eigenaren, en zo nodig een overboeking van het eigen saldo
-- van Woober (Balance Transfers) voor wat Woober zelf bijlegt: tegoed, kortingen en terugboekingen.
create table public.mollie_routes (
  id bigint generated always as identity primary key,
  uitbetaling_id uuid references public.uitbetalingen (id) on delete set null,
  soort text not null default 'route' check (soort in ('route', 'overboeking')),
  betaling_id text references public.betalingen (id),
  check ((soort = 'route') = (betaling_id is not null)),
  bedrag integer not null check (bedrag > 0),
  -- Kenmerk bij Mollie van de route of de overboeking
  extern_id text,
  status text not null default 'gepland' check (status in ('gepland', 'gemaakt', 'mislukt')),
  aangemaakt timestamptz not null default now()
);
create index on public.mollie_routes (betaling_id);
create index on public.mollie_routes (uitbetaling_id);
alter table public.mollie_routes enable row level security;
revoke all on public.mollie_routes from authenticated, anon;

alter table public.uitbetalingen add column automatisch boolean not null default false;
-- Saldo: de uitlater liet zijn saldo uitbetalen. Aanvulling: Woober vult aan wat Mollie na een terugboeking bij de
-- uitlater terughaalde; dat gaat niet van zijn saldo af en de app toont het niet als uitbetaling.
alter table public.uitbetalingen add column reden text not null default 'saldo' check (reden in ('saldo', 'aanvulling'));

-- Geld in betalingen dat nog naar een uitlater kan: alleen van boekingen die klaar zijn, oudste eerst. Na 90 dagen zet
-- Mollie ongerouteerd geld naar het saldo van Woober en kan routeren niet meer; met wat marge telt 88 dagen.
create or replace function public.routeerbaar()
returns table (betaling_id text, ruimte integer, betaald_op timestamptz)
language sql stable security definer set search_path = '' as $$
  select v.betaling_id, (v.behouden - g.gerouteerd)::integer, v.betaald_op
  from public.betaling_verdeling() v
  cross join lateral (
    select coalesce(sum(r.bedrag), 0) as gerouteerd from public.mollie_routes r
    where r.betaling_id = v.betaling_id and r.status in ('gepland', 'gemaakt')
  ) g
  where v.definitief and v.behouden > g.gerouteerd and v.betaald_op > now() - interval '88 days';
$$;

-- Verdeelt een uitbetaling over betalingen, oudste eerst, zodat geen betaling de 90 dagen van Mollie haalt. Is er
-- minder betaald geld dan de uitlater tegoed heeft (tegoed of korting van Woober), dan komt de rest als overboeking.
-- Al deels gerouteerd (bijvoorbeeld na een fout): alleen de rest wordt gepland. Geeft wat Mollie nog moet doen.
create or replace function public.plan_routes(p_uitbetaling uuid)
returns table (route_id bigint, soort text, betaling_id text, bedrag integer)
language plpgsql security definer set search_path = '' as $$
declare
  u public.uitbetalingen;
  rest integer;
  deel integer;
  r record;
begin
  -- Eén planning tegelijk, zodat niet twee uitbetalingen dezelfde ruimte nemen
  lock table public.mollie_routes in exclusive mode;
  select * into u from public.uitbetalingen where id = p_uitbetaling for update;
  if not found or u.status <> 'aangevraagd' then raise exception 'Deze uitbetaling staat niet open'; end if;
  rest := u.bedrag - coalesce((select sum(x.bedrag) from public.mollie_routes x where x.uitbetaling_id = u.id and x.status in ('gepland', 'gemaakt')), 0);
  for r in select * from public.routeerbaar() order by 3, 1 loop
    exit when rest <= 0;
    deel := least(rest, r.ruimte);
    insert into public.mollie_routes (uitbetaling_id, betaling_id, bedrag) values (u.id, r.betaling_id, deel);
    rest := rest - deel;
  end loop;
  if rest > 0 then
    insert into public.mollie_routes (uitbetaling_id, soort, bedrag) values (u.id, 'overboeking', rest);
  end if;
  return query select x.id, x.soort, x.betaling_id, x.bedrag from public.mollie_routes x where x.uitbetaling_id = u.id and x.status = 'gepland' order by x.id;
end;
$$;

-- Uitkomst van een route bij Mollie. Is alles gerouteerd, dan is de uitbetaling onderweg: Mollie betaalt de uitlater
-- uit volgens het schema dat hij zelf in Mollie kiest.
create or replace function public.route_verwerkt(p_route bigint, p_extern_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  u uuid;
begin
  update public.mollie_routes set status = case when p_extern_id is null then 'mislukt' else 'gemaakt' end, extern_id = p_extern_id
  where id = p_route and status = 'gepland'
  returning uitbetaling_id into u;
  if u is not null and (select coalesce(sum(bedrag), 0) from public.mollie_routes where uitbetaling_id = u and status = 'gemaakt')
     >= (select bedrag from public.uitbetalingen where id = u) then
    update public.uitbetalingen set status = 'onderweg' where id = u and status = 'aangevraagd';
  end if;
end;
$$;

-- Uitbetalingen die de server nu kan routeren: de uitlater is bij Mollie aangesloten
create or replace function public.uitbetalingen_klaar()
returns table (uitbetaling_id uuid, organisatie_id text)
language sql stable security definer set search_path = '' as $$
  select u.id, k.organisatie_id
  from public.uitbetalingen u
  join public.mollie_koppelingen k on k.uitlater_id = u.uitlater_id and k.status = 'klaar' and k.organisatie_id is not null
  where u.status = 'aangevraagd'
  order by u.aangemaakt;
$$;

-- Zet automatisch het hele saldo uit bij uitlaters van wie geld 80 dagen op het saldo staat, en zo nodig bij meer
-- uitlaters zodat hun geld niet in betalingen blijft die Mollie na 90 dagen aan Woober geeft.
--
-- Geld is uitwisselbaar: routes nemen de oudste betalingen eerst. Wat uitlaters tegoed hebben en in betalingen van de
-- laatste 80 dagen past, kan blijven staan; alleen de rest moet nu uit de oudere betalingen. Wat daar daarna nog
-- staat, is het aandeel van Woober (servicekosten, commissie) en mag na 90 dagen gewoon naar Woober.
create or replace function public.maak_automatische_uitbetalingen()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  oud integer;
  recent integer;
  open integer;
  tegoed integer;
  achterstand integer;
  w record;
  n integer := 0;
begin
  select coalesce(sum(ruimte) filter (where betaald_op < now() - interval '80 days'), 0),
         coalesce(sum(ruimte) filter (where betaald_op >= now() - interval '80 days'), 0)
  into oud, recent from public.routeerbaar();
  -- Nog te routeren voor uitbetalingen die al klaarstaan. Alleen van uitlaters die bij Mollie zijn aangesloten: de
  -- server kan alleen hun geld routeren.
  select coalesce(sum(u.bedrag - coalesce((select sum(r.bedrag) from public.mollie_routes r where r.uitbetaling_id = u.id and r.status in ('gepland', 'gemaakt')), 0)), 0)
  into open
  from public.uitbetalingen u
  join public.mollie_koppelingen k on k.uitlater_id = u.uitlater_id and k.status = 'klaar'
  where u.status = 'aangevraagd';
  select coalesce(sum(greatest(0, public.saldo_van(k.uitlater_id))), 0) into tegoed
  from public.mollie_koppelingen k where k.status = 'klaar';
  -- Klaarstaande uitbetalingen nemen straks als eerste uit de oude betalingen
  achterstand := least(oud, tegoed + open - recent) - open;
  for w in
    select s.persoon_id as id, s.saldo, (
      -- Het oudste tegoed dat nog (deels) op het saldo staat
      select min(t.tijd) from (
        select g.tijd, g.bedrag, sum(g.bedrag) over (order by g.tijd desc, g.id desc) as opgeteld
        from public.grootboek g where g.rekening = 'uitlater' and g.persoon_id = s.persoon_id and g.bedrag > 0
      ) t where t.opgeteld - t.bedrag < s.saldo
    ) as oudste
    from (select persoon_id, public.saldo_van(persoon_id) as saldo from public.grootboek
          where rekening = 'uitlater' and persoon_id is not null group by persoon_id) s
    join public.mollie_koppelingen k on k.uitlater_id = s.persoon_id and k.status = 'klaar'
    where s.saldo > 0
    order by 3
  loop
    if achterstand > 0 or w.oudste < now() - interval '80 days' then
      insert into public.uitbetalingen (uitlater_id, bedrag, automatisch) values (w.id, w.saldo, true);
      insert into public.grootboek (gebeurtenis, rekening, persoon_id, bedrag) values ('uitbetaling', 'uitlater', w.id, -w.saldo);
      achterstand := achterstand - w.saldo;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- Aansluiten bij Mollie ------------------------------------------------------------

create or replace function public.start_koppeling(p_uitlater uuid, p_staat text)
returns void language sql security definer set search_path = '' as $$
  insert into public.mollie_koppelingen (uitlater_id, staat) values (p_uitlater, p_staat)
  on conflict (uitlater_id) do update set staat = excluded.staat, bijgewerkt = now();
$$;

create or replace function public.koppeling_van_staat(p_staat text)
returns uuid language sql stable security definer set search_path = '' as $$
  select uitlater_id from public.mollie_koppelingen where staat = p_staat;
$$;

create or replace function public.bewaar_koppeling(p_uitlater uuid, p_organisatie text, p_refresh_token text)
returns void language sql security definer set search_path = '' as $$
  update public.mollie_koppelingen
  set organisatie_id = p_organisatie, refresh_token = p_refresh_token, staat = null, bijgewerkt = now()
  where uitlater_id = p_uitlater;
$$;

-- Stand van het aansluiten bij Mollie; klaar betekent dat Mollie mag uitbetalen, en dan is de rekening geverifieerd
create or replace function public.zet_koppelstatus(p_uitlater uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.mollie_koppelingen set status = p_status, bijgewerkt = now() where uitlater_id = p_uitlater;
  if p_status = 'klaar' then
    update public.uitlaters set uitbetaling_ok = true where id = p_uitlater;
  end if;
end;
$$;

create or replace function public.te_controleren_koppelingen()
returns table (uitlater_id uuid, organisatie_id text, refresh_token text)
language sql stable security definer set search_path = '' as $$
  select uitlater_id, organisatie_id, refresh_token from public.mollie_koppelingen where refresh_token is not null and status <> 'klaar';
$$;

-- Voor de app: hoe ver ben ik met aansluiten bij Mollie? Null als ik nog niet ben begonnen.
create or replace function public.mijn_mollie_koppeling()
returns text language sql stable security definer set search_path = '' as $$
  select status from public.mollie_koppelingen where uitlater_id = (select auth.uid());
$$;

-- Beheer: terugboekingen ---------------------------------------------------------------

-- Terugboekingen via de bank, open eerst. Een medewerker beoordeelt de eigenaar, net als bij meldingen; de app
-- blokkeert of schorst niemand vanzelf. Met e-mailadres om contact op te nemen, alleen voor Woober.
create or replace function public.beheer_terugboekingen()
returns table (
  betaling_id text, boeking_id uuid, eigenaar text, email text, methode public.betaalmethode, bedrag integer,
  teruggeboekt integer, teruggeboekt_op timestamptz, aangevuld boolean, andere integer, besluit text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  return query
    select p.id, p.boeking_id, coalesce(pr.voornaam, 'Verwijderd account'), au.email::text, p.methode, p.bedrag,
           p.teruggeboekt, p.teruggeboekt_op, p.aangevuld_op is not null,
           -- Andere terugboekingen van dezelfde eigenaar, zodat de medewerker herhaling ziet
           (select count(*)::integer from public.betalingen q join public.boekingen c on c.id = q.boeking_id
            where c.eigenaar_id = b.eigenaar_id and q.teruggeboekt > 0 and q.id <> p.id),
           p.besluit
    from public.betalingen p
    left join public.boekingen b on b.id = p.boeking_id
    left join public.profielen pr on pr.id = b.eigenaar_id
    left join auth.users au on au.id = b.eigenaar_id
    where p.teruggeboekt > 0
    order by p.besluit is not null, p.teruggeboekt_op desc;
end;
$$;

create or replace function public.beheer_terugboeking_afhandelen(p_betaling text, p_besluit text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.ben_beheerder() then raise exception 'Alleen voor beheerders'; end if;
  if coalesce(trim(p_besluit), '') = '' then raise exception 'Schrijf op wat je hebt besloten'; end if;
  update public.betalingen set besluit = left(trim(p_besluit), 500) where id = p_betaling and teruggeboekt > 0;
  if not found then raise exception 'Onbekende terugboeking'; end if;
end;
$$;

revoke execute on function public.niet_te_ver_vooruit, public.eerst_betaald, public.prijs_verlengd, public.verleng_tot,
  public.betaling_voor, public.registreer_betaling, public.verwerk_betaling,
  public.betaling_verdeling, public.terug_te_betalen, public.boek_terugbetaling, public.routeerbaar, public.plan_routes,
  public.route_verwerkt, public.uitbetalingen_klaar, public.maak_automatische_uitbetalingen, public.start_koppeling,
  public.koppeling_van_staat, public.bewaar_koppeling, public.zet_koppelstatus, public.te_controleren_koppelingen
  from public, anon, authenticated;
grant execute on function public.betaling_voor, public.registreer_betaling, public.verwerk_betaling, public.terug_te_betalen,
  public.boek_terugbetaling, public.plan_routes, public.route_verwerkt, public.uitbetalingen_klaar,
  public.maak_automatische_uitbetalingen, public.start_koppeling, public.koppeling_van_staat, public.bewaar_koppeling,
  public.zet_koppelstatus, public.te_controleren_koppelingen
  to service_role;
revoke execute on function public.mijn_mollie_koppeling, public.beheer_terugboekingen, public.beheer_terugboeking_afhandelen from public, anon;
grant execute on function public.mijn_mollie_koppeling, public.beheer_terugboekingen, public.beheer_terugboeking_afhandelen to authenticated;
