// Test van het databaseschema en de RLS-regels in een lokale Postgres (PGlite), zonder Supabase-project.
// Draaien: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const map = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const sql = fs
  .readdirSync(map)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(map, f), 'utf8'))
  .join('\n');
const db = new PGlite();
const E = '11111111-1111-1111-1111-111111111111', U = '22222222-2222-2222-2222-222222222222', X = '33333333-3333-3333-3333-333333333333';
let ok = 0, fout = 0;
const check = (naam, voorwaarde, extra = '') => { if (voorwaarde) { ok++; console.log('  ok  ', naam); } else { fout++; console.log('  FOUT', naam, extra); } };
const als = async (wie, q, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${wie}', false); set role authenticated;`);
  try { return { rows: (await db.query(q, params)).rows }; } catch (e) { return { fout: e.message }; } finally { await db.exec('reset role'); }
};
// Nabootsing van wat Supabase standaard regelt: rollen, auth.users en auth.uid()
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
await db.exec(sql);
console.log('migratie uitgevoerd');
await db.exec(`
  insert into auth.users values ('${E}'), ('${U}'), ('${X}');
  insert into public.profielen (id, voornaam, plaats) values ('${E}', 'Robin', 'Nijmegen'), ('${U}', 'Sanne', 'Nijmegen'), ('${X}', 'Xander', 'Arnhem');
  insert into public.adressen values ('${E}', 'Molenstraat 24', '6511 AB', 'Nijmegen', 51.84, 5.86);
  insert into public.honden (id, eigenaar_id, naam, ras, geboortedatum, grootte, energie, aanlijnen, met_honden)
    values ('44444444-4444-4444-4444-444444444444', '${E}', 'Luna', 'Labrador Retriever', '2022-03-12', 'groot', 'energiek', 'losloop-ok', 'goed');
`);
const r1 = await als(U, `insert into public.uitlaters (id, tarief_30, tarief_45, tarief_60, toeslag_extra_hond) values ('${U}', 1200, 1600, 1900, 500)`);
check('uitlater maakt eigen profiel', !r1.fout, r1.fout);
const r2 = await als(U, `update public.uitlaters set identiteit_ok = true where id = '${U}'`);
check('uitlater kan zichzelf niet verifiëren', !!r2.fout, JSON.stringify(r2));
const r3 = await als(E, `select * from public.uitlaters`);
check('ongeverifieerde uitlater onzichtbaar', r3.rows?.length === 0, JSON.stringify(r3));
await db.exec(`update public.uitlaters set identiteit_ok = true, verzekering_ok = true, uitbetaling_ok = true where id = '${U}'`);
const r4 = await als(E, `select voornaam from public.profielen p join public.uitlaters u on u.id = p.id`);
check('geverifieerde uitlater zichtbaar', r4.rows?.length === 1, JSON.stringify(r4));
const r5 = await als(E, `select public.vraag_boeking_aan('uitlaten', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 30::smallint, null, 'thuis', '', 'ideal')`);
check('eerst kennismaken verplicht', /kennismaking/.test(r5.fout ?? ''), JSON.stringify(r5));
const r6 = await als(E, `select public.vraag_kennismaking_aan('${U}', now() + interval '3 hours') as id`);
check('kennismaking aanvragen', !r6.fout, r6.fout);
const K = r6.rows?.[0]?.id;
const r7 = await als(U, `select * from public.adressen`);
check('adres verborgen bij openstaand verzoek', r7.rows?.length === 0, JSON.stringify(r7));
const r8 = await als(U, `select naam from public.honden`);
check('uitlater ziet hond van verzoek', r8.rows?.length === 1, JSON.stringify(r8));
const r9 = await als(X, `select * from public.honden`);
check('buitenstaander ziet geen honden', r9.rows?.length === 0);
check('uitlater accepteert', !(await als(U, `select public.wijzig_status('${K}', 'gepland')`)).fout);
const r10 = await als(U, `select straat_huisnummer from public.adressen`);
check('adres zichtbaar na accepteren', r10.rows?.length === 1, JSON.stringify(r10));
const r11 = await als(E, `select public.wijzig_status('${K}', 'afgerond')`);
check('eigenaar kan kennismaking niet zelf afronden', !!r11.fout);
check('uitlater rondt kennismaking af', !(await als(U, `select public.wijzig_status('${K}', 'afgerond')`)).fout);
const r12 = await als(E, `select public.vraag_boeking_aan('uitlaten', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 30::smallint, null, 'thuis', 'Tuigje aan de kapstok', 'ideal')`);
check('nu boeken kan niet als uitlater offline is', /niet online/.test(r12.fout ?? ''), JSON.stringify(r12));
check('uitlater gaat online', !(await als(U, `update public.uitlaters set online = true where id = '${U}'`)).fout);
const r13 = await als(E, `select public.vraag_boeking_aan('uitlaten', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 30::smallint, null, 'thuis', 'Tuigje aan de kapstok', 'ideal') as id`);
check('wandeling boeken', !r13.fout, r13.fout);
const W = r13.rows?.[0]?.id;
const r14 = await als(E, `select tarief, toeslag, servicekosten, commissie from public.boekingen where id = '${W}'`);
check('prijs berekend in database', JSON.stringify(r14.rows?.[0]) === JSON.stringify({ tarief: 1200, toeslag: 0, servicekosten: 120, commissie: 120 }), JSON.stringify(r14));
const r15 = await als(E, `select code from public.ophaalcodes where boeking_id = '${W}'`);
check('eigenaar ziet ophaalcode', r15.rows?.length === 1);
const r16 = await als(U, `select code from public.ophaalcodes`);
check('uitlater ziet ophaalcode niet', r16.rows?.length === 0);
const r17 = await als(E, `update public.boekingen set tarief = 1 where id = '${W}'`);
check('eigenaar kan prijs niet wijzigen', !!r17.fout, JSON.stringify(r17));
for (const s of ['onderweg', 'aangekomen']) check(`uitlater: ${s}`, !(await als(U, `select public.wijzig_status('${W}', '${s}')`)).fout);
const r18 = await als(U, `select public.start_wandeling('${W}', '0000') as gelukt`);
const fouteCode = r15.rows[0].code === '0000';
check('verkeerde code start niet', fouteCode || r18.rows?.[0]?.gelukt === false, JSON.stringify(r18));
const r19 = await als(U, `select public.start_wandeling('${W}', '${r15.rows[0].code}') as gelukt`);
check('juiste code start wandeling', r19.rows?.[0]?.gelukt === true, JSON.stringify(r19));
check('positie delen tijdens wandeling', !(await als(U, `insert into public.wandel_posities (boeking_id, lat, lng) values ('${W}', 51.84, 5.87)`)).fout);
check('foto melden', !(await als(U, `insert into public.wandel_gebeurtenissen (boeking_id, soort, tekst) values ('${W}', 'foto', 'Bij de vijver')`)).fout);
const r20 = await als(X, `insert into public.wandel_posities (boeking_id, lat, lng) values ('${W}', 1, 1)`);
check('buitenstaander kan geen positie toevoegen', !!r20.fout);
const r21 = await als(E, `select count(*)::int as n from public.wandel_posities`);
check('eigenaar volgt de route', r21.rows?.[0]?.n === 1);
check('uitlater rondt af', !(await als(U, `select public.wijzig_status('${W}', 'afgerond')`)).fout);
const r22 = await als(U, `insert into public.wandel_posities (boeking_id, lat, lng) values ('${W}', 51.84, 5.88)`);
check('geen locatie na de wandeling', !!r22.fout);
check('fooi geven', !(await als(E, `update public.boekingen set fooi = 200 where id = '${W}'`)).fout);
check('review na betaalde wandeling', !(await als(E, `insert into public.reviews (boeking_id, auteur_id, ontvanger_id, sterren) values ('${W}', '${E}', '${U}', 5)`)).fout);
// Oppas aan huis
const o1 = await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 180::smallint, null, 'thuis', '', 'kaart', true)`);
check('geen oppas bij wie dat niet aanbiedt', /dienst niet aan/.test(o1.fout ?? ''), JSON.stringify(o1));
check('uitlater biedt ook oppas aan', !(await als(U, `update public.uitlaters set diensten = '{uitlaten,oppas}', oppas_per_uur = 1100 where id = '${U}'`)).fout);
const o2 = await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 45::smallint, null, 'thuis', '', 'kaart', true)`);
check('oppas met wandelduur kan niet', /Ongeldige duur/.test(o2.fout ?? ''), JSON.stringify(o2));
const o3 = await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 180::smallint, null, 'thuis', 'Eten om 20:00', 'kaart', true) as id`);
check('oppas boeken', !o3.fout, o3.fout);
const O = o3.rows?.[0]?.id;
const o4 = await als(E, `select dienst, tarief, servicekosten, commissie, camera_in_huis from public.boekingen where id = '${O}'`);
check('oppasprijs is uurtarief maal uren', JSON.stringify(o4.rows?.[0]) === JSON.stringify({ dienst: 'oppas', tarief: 3300, servicekosten: 330, commissie: 330, camera_in_huis: true }), JSON.stringify(o4));
for (const st of ['onderweg', 'aangekomen']) await als(U, `select public.wijzig_status('${O}', '${st}')`);
const oc = await als(E, `select code from public.ophaalcodes where boeking_id = '${O}'`);
check('oppas start met de code', (await als(U, `select public.start_wandeling('${O}', '${oc.rows[0].code}') as g`)).rows?.[0]?.g === true);
check('eigenaar verlengt een uur', !(await als(E, `select public.verleng_oppas('${O}')`)).fout);
const o5 = await als(E, `select duur, tarief, servicekosten from public.boekingen where id = '${O}'`);
check('verlengen past duur en prijs aan', JSON.stringify(o5.rows?.[0]) === JSON.stringify({ duur: 240, tarief: 4400, servicekosten: 440 }), JSON.stringify(o5));
check('uitlater kan niet verlengen', !!(await als(U, `select public.verleng_oppas('${O}')`)).fout);
check('eigenaar: ik ben thuis', !(await als(E, `select public.wijzig_status('${O}', 'afgerond')`)).fout);
const o6 = await als(E, `select public.wijzig_status('${W}', 'geannuleerd')`);
check('afgeronde wandeling niet meer te annuleren', !!o6.fout);
const r23 = await als(X, `insert into public.reviews (boeking_id, auteur_id, ontvanger_id, sterren) values ('${W}', '${X}', '${U}', 1)`);
check('geen nepreview van buitenstaander', !!r23.fout);
check('blokkeren', !(await als(E, `insert into public.blokkades (blokkeerder_id, geblokkeerde_id) values ('${E}', '${X}')`)).fout);
const r24 = await als(X, `insert into public.berichten (van_id, naar_id, tekst) values ('${X}', '${E}', 'Hoi')`);
check('geblokkeerde kan geen bericht sturen', !!r24.fout);
const r25 = await als(X, `select * from public.boekingen`);
check('buitenstaander ziet geen boekingen', r25.rows?.length === 0);
console.log(`\n${ok} geslaagd, ${fout} mislukt`);
process.exit(fout ? 1 : 0);
