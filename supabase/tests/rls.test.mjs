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
// Wat de webhook van Mollie doet als een eigenaar heeft betaald (supabase/functions/mollie-webhook)
let tellerBetaling = 0;
const betaal = async (boeking) => {
  const id = `tr_test${++tellerBetaling}`;
  const b = (await db.query(`select totaal - met_saldo as bedrag, betaalmethode from public.boekingen where id = $1`, [boeking])).rows[0];
  if (b.bedrag <= 0) return null;
  await db.query(`select public.registreer_betaling($1, $2, 'boeking', $3, $4)`, [id, boeking, b.bedrag, b.betaalmethode]);
  await db.query(`select public.verwerk_betaling($1, 'betaald', 0)`, [id]);
  return id;
};
// Nabootsing van wat Supabase standaard regelt: rollen, auth.users en auth.uid()
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
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
await db.exec(`update public.uitlaters set identiteit_ok = true, uitbetaling_ok = true where id = '${U}'`);
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
const r14 = await als(E, `select verdienmodel_id, tarief, toeslag, servicekosten, commissie, totaal, uitbetaling from public.boekingen where id = '${W}'`);
check(
  'lancering: prijs zonder servicekosten en commissie',
  JSON.stringify(r14.rows?.[0]) === JSON.stringify({ verdienmodel_id: 'lancering', tarief: 1200, toeslag: 0, servicekosten: 0, commissie: 0, totaal: 1200, uitbetaling: 1200 }),
  JSON.stringify(r14),
);
const r15 = await als(E, `select code from public.ophaalcodes where boeking_id = '${W}'`);
check('eigenaar ziet ophaalcode', r15.rows?.length === 1);
const r16 = await als(U, `select code from public.ophaalcodes`);
check('uitlater ziet ophaalcode niet', r16.rows?.length === 0);
const r17 = await als(E, `update public.boekingen set tarief = 1 where id = '${W}'`);
check('eigenaar kan prijs niet wijzigen', !!r17.fout, JSON.stringify(r17));
check('accepteren kan pas na betalen', /nog niet betaald/.test((await als(U, `select public.wijzig_status('${W}', 'onderweg')`)).fout ?? ''));
const TW = await betaal(W);
check('eigenaar ziet zijn betaling', (await als(E, `select status from public.betalingen where boeking_id = '${W}'`)).rows?.[0]?.status === 'betaald');
check('uitlater ziet de betaling niet', (await als(U, `select * from public.betalingen`)).rows?.length === 0);
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
check('fooi niet zelf in te vullen', !!(await als(E, `update public.boekingen set fooi = 200 where id = '${W}'`)).fout);
await db.query(`select public.registreer_betaling('tr_fooiW', $1, 'fooi', 200, 'ideal')`, [W]);
await db.query(`select public.verwerk_betaling('tr_fooiW', 'betaald', 0)`);
check('fooi geven via een betaling', (await als(E, `select fooi from public.boekingen where id = '${W}'`)).rows?.[0]?.fooi === 200);
check('review na betaalde wandeling', !(await als(E, `insert into public.reviews (boeking_id, auteur_id, ontvanger_id, sterren) values ('${W}', '${E}', '${U}', 5)`)).fout);
// Oppas aan huis
const o1 = await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 180::smallint, null, 'thuis', '', 'kaart', true)`);
check('geen oppas bij wie dat niet aanbiedt', /dienst niet aan/.test(o1.fout ?? ''), JSON.stringify(o1));
check('uitlater biedt ook oppas aan', !(await als(U, `update public.uitlaters set diensten = '{uitlaten,oppas}', oppas_per_uur = 1100 where id = '${U}'`)).fout);
const o2 = await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 45::smallint, null, 'thuis', '', 'kaart', true, p_camera_waar => 'Woonkamer')`);
check('oppas met wandelduur kan niet', /Ongeldige duur/.test(o2.fout ?? ''), JSON.stringify(o2));
const o3 = await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 180::smallint, null, 'thuis', 'Eten om 20:00', 'kaart', true, p_camera_waar => 'Woonkamer, alleen beeld') as id`);
check('oppas boeken', !o3.fout, o3.fout);
const O = o3.rows?.[0]?.id;
const o4 = await als(E, `select dienst, tarief, servicekosten, commissie, oppas_plek, camera_in_huis, camera_waar from public.boekingen where id = '${O}'`);
check('oppasprijs is uurtarief maal uren', JSON.stringify(o4.rows?.[0]) === JSON.stringify({ dienst: 'oppas', tarief: 3300, servicekosten: 0, commissie: 0, oppas_plek: 'bij_eigenaar', camera_in_huis: true, camera_waar: 'Woonkamer, alleen beeld' }), JSON.stringify(o4));
check('camera zonder te zeggen waar kan niet', /camera's hangen/.test((await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['44444444-4444-4444-4444-444444444444']::uuid[], 180::smallint, null, 'thuis', '', 'kaart', true)`)).fout ?? ''));
await betaal(O);
for (const st of ['onderweg', 'aangekomen']) await als(U, `select public.wijzig_status('${O}', '${st}')`);
const oc = await als(E, `select code from public.ophaalcodes where boeking_id = '${O}'`);
check('oppas start met de code', (await als(U, `select public.start_wandeling('${O}', '${oc.rows[0].code}') as g`)).rows?.[0]?.g === true);
// Verlengen: het extra uur gaat pas in als het betaald is (supabase/functions/betaling-starten met soort verlenging)
check('direct verlengen zonder betalen kan niet', !!(await als(E, `select public.verleng_oppas('${O}')`)).fout);
const ov = (await db.query(`select * from public.betaling_voor($1, $2, 'verlenging')`, [O, E])).rows[0];
check('verlengen kost het extra uur', ov?.bedrag === 1100 && ov?.verlengd_tot === 240 && /een uur langer oppas/.test(ov?.omschrijving ?? ''), JSON.stringify(ov));
check('uitlater kan niet verlengen', /hoort niet bij jou/.test((await db.query(`select * from public.betaling_voor($1, $2, 'verlenging')`, [O, U]).then(() => '', (e) => e.message))));
await db.query(`select public.registreer_betaling('tr_verleng1', $1, 'verlenging', $2, 'kaart', $3)`, [O, ov.bedrag, ov.verlengd_tot]);
check('verlengen wacht op de betaling', (await als(E, `select duur from public.boekingen where id = '${O}'`)).rows?.[0]?.duur === 180);
await db.query(`select public.verwerk_betaling('tr_verleng1', 'mislukt', 0)`);
check('mislukte betaling: niet verlengd, oppas loopt door', JSON.stringify((await als(E, `select duur, status from public.boekingen where id = '${O}'`)).rows?.[0]) === JSON.stringify({ duur: 180, status: 'bezig' }));
await db.query(`select public.registreer_betaling('tr_verleng2', $1, 'verlenging', $2, 'kaart', $3)`, [O, ov.bedrag, ov.verlengd_tot]);
await db.query(`select public.verwerk_betaling('tr_verleng2', 'betaald', 0)`);
const o5 = await als(E, `select duur, tarief, servicekosten from public.boekingen where id = '${O}'`);
check('betaald: verlengd, met duur en prijs', JSON.stringify(o5.rows?.[0]) === JSON.stringify({ duur: 240, tarief: 4400, servicekosten: 0 }), JSON.stringify(o5));
// Twee keer betaald voor hetzelfde uur: één keer verlengd, de tweede gaat terug
await db.query(`select public.registreer_betaling('tr_verleng3', $1, 'verlenging', $2, 'kaart', $3)`, [O, ov.bedrag, ov.verlengd_tot]);
await db.query(`select public.verwerk_betaling('tr_verleng3', 'betaald', 0)`);
const ot = (await db.query(`select * from public.terug_te_betalen()`)).rows;
check('dubbel verlengd: niet nog een uur, tweede betaling terug', (await als(E, `select duur from public.boekingen where id = '${O}'`)).rows?.[0]?.duur === 240
  && ot.some((t) => t.betaling_id === 'tr_verleng3' && t.bedrag === ov.bedrag) && !ot.some((t) => t.betaling_id === 'tr_verleng2'), JSON.stringify(ot));
await db.query(`select public.boek_terugbetaling('tr_verleng3', $1)`, [ov.bedrag]);
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
// Verdienmodel ----------------------------------------------------------------
console.log('verdienmodel');
const LUNA = '44444444-4444-4444-4444-444444444444', BOLT = '55555555-5555-5555-5555-555555555555', Y = '66666666-6666-6666-6666-666666666666';
const woober = async (q) => { try { return { rows: (await db.query(q)).rows }; } catch (e) { return { fout: e.message }; } };
const boek = (wie, hond) => als(wie, `select public.vraag_boeking_aan('uitlaten', '${U}', array['${hond}']::uuid[], 30::smallint, null, 'thuis', '', 'ideal') as id`);
const saldo = async (wie) => (await woober(`select public.tegoed_saldo('${wie}') as s`)).rows[0].s;
const actief = async () => (await als(E, `select (public.actief_verdienmodel()).id`)).rows?.[0]?.id;
const rondAf = async (eigenaar, id) => {
  await betaal(id);
  for (const st of ['gepland', 'onderweg', 'aangekomen']) await als(U, `select public.wijzig_status('${id}', '${st}')`);
  const c = await als(eigenaar, `select code from public.ophaalcodes where boeking_id = '${id}'`);
  await als(U, `select public.start_wandeling('${id}', '${c.rows[0].code}')`);
  return als(U, `select public.wijzig_status('${id}', 'afgerond')`);
};
const PRIJS = `verdienmodel_id, tarief, drukte_factor::float as drukte_factor, drukte, drukte_uitlater, servicekosten, plus, boekingskosten, korting, totaal, commissie, uitbetaling`;

// Grootboek tijdens de lancering
const g1 = (await woober(`select gebeurtenis, rekening::text, bedrag from public.grootboek where boeking_id = '${W}' order by id`)).rows;
check(
  'grootboek: wandeling en fooi',
  JSON.stringify(g1) ===
    JSON.stringify([
      { gebeurtenis: 'afgerond', rekening: 'eigenaar', bedrag: -1200 },
      { gebeurtenis: 'afgerond', rekening: 'uitlater', bedrag: 1200 },
      { gebeurtenis: 'fooi', rekening: 'eigenaar', bedrag: -200 },
      { gebeurtenis: 'fooi', rekening: 'uitlater', bedrag: 200 },
    ]),
  JSON.stringify(g1),
);
check('fooi niet terug te draaien', /terugdraaien/.test((await woober(`update public.boekingen set fooi = 100 where id = '${W}'`)).fout ?? ''));
check('grootboek onzichtbaar voor eigenaar en uitlater', (await als(E, `select * from public.grootboek`)).rows?.length === 0 && (await als(U, `select * from public.grootboek`)).rows?.length === 0);

// Modellen en planning
check('actief model is lancering', (await actief()) === 'lancering');
check('modellen zijn leesbaar', (await als(E, `select id from public.verdienmodellen`)).rows?.length === 3);
check('gebruiker kan geen model inplannen', !!(await als(E, `insert into public.verdienmodel_planning (model_id, geldig_vanaf) values ('volledig', now() + interval '20 days')`)).fout);
await als(U, `update public.verdienmodellen set commissie_percentage = 0`);
check('uitlater kan commissie niet wijzigen', (await woober(`select commissie_percentage::float as c from public.verdienmodellen where id = 'volledig'`)).rows[0].c === 0.2);
check('niet met terugwerkende kracht', /terugwerkende/.test((await woober(`insert into public.verdienmodel_planning (model_id, geldig_vanaf) values ('volledig', now() - interval '1 day')`)).fout ?? ''));
check('hogere commissie niet binnen 15 dagen', /15 dagen/.test((await woober(`insert into public.verdienmodel_planning (model_id, geldig_vanaf) values ('volledig', now() + interval '3 days')`)).fout ?? ''));
check('Uber-model aankondigen voor over 15 dagen', !(await woober(`insert into public.verdienmodel_planning (model_id, geldig_vanaf, toelichting) values ('volledig', now() + interval '15 days', 'Aangekondigd per e-mail en in de app')`)).fout);
check('tot die datum geldt de lancering', (await actief()) === 'lancering');
check('ingepland model ligt vast', /ingepland/.test((await woober(`update public.verdienmodellen set boekingskosten = 99 where id = 'volledig'`)).fout ?? ''));
// 15 dagen later
await db.exec(`update public.verdienmodel_planning set geldig_vanaf = now() - interval '1 minute' where model_id = 'volledig'`);
check('Uber-model actief', (await actief()) === 'volledig');

// App en database rekenen hetzelfde (src/lib/prijs.ts tegen bereken_prijs())
try {
  const { berekenPrijs } = await import('../../src/lib/prijs.ts');
  const modellen = (await db.query(`select * from public.verdienmodellen`)).rows;
  let zaad = 7;
  const kans = (n) => { zaad = (zaad * 48271) % 2147483647; return zaad % n; };
  let verschillen = 0, getest = 0;
  for (const r of modellen) {
    const model = {
      id: r.id, naam: r.naam, uitleg: r.omschrijving,
      servicekostenPercentage: Number(r.servicekosten_percentage), servicekostenMinimum: r.servicekosten_minimum, servicekostenMaximum: r.servicekosten_maximum,
      boekingskosten: r.boekingskosten, commissiePercentage: Number(r.commissie_percentage),
      drukte: { aan: r.drukte_aan, maxFactor: Number(r.drukte_max_factor), deelUitlater: Number(r.drukte_deel_uitlater) },
      plus: { aan: r.plus_aan, naam: 'Woober Plus', prijsPerMaand: r.plus_prijs_per_maand, servicekostenKorting: Number(r.plus_servicekosten_korting) },
      welkomsttegoed: r.welkomsttegoed, uitnodigingstegoed: r.uitnodigingstegoed,
    };
    const gevallen = Array.from({ length: 300 }, (_, i) => ({ i, tarief: 500 + kans(9501), toeslag: kans(1501), factor: 1 + kans(13) * 0.05, plus: kans(2) === 1, tegoed: kans(4) === 0 ? kans(3001) : 0 }));
    const waarden = gevallen.map((g) => `(${g.i}, ${g.tarief}, ${g.toeslag}, ${g.factor.toFixed(2)}, ${g.plus}, ${g.tegoed})`).join(',');
    const db_ = (await db.query(`select v.i, (public.bereken_prijs(m, v.tarief, v.toeslag, v.factor, v.plus, v.tegoed)).* from public.verdienmodellen m,
      (values ${waarden}) as v (i, tarief, toeslag, factor, plus, tegoed) where m.id = '${r.id}' order by v.i`)).rows;
    for (const g of gevallen) {
      const app = berekenPrijs({ tarieven: { 30: g.tarief }, oppasPerUur: 0, toeslagExtraHond: g.toeslag }, 'uitlaten', 30, 2, model, { drukteFactor: g.factor, plus: g.plus, tegoed: g.tegoed });
      const d = db_[g.i];
      const gelijk = app.modelId === d.verdienmodel_id && app.drukteFactor === Number(d.drukte_factor) && app.plus === d.plus &&
        ['tarief', 'toeslag', 'drukte', 'servicekosten', 'boekingskosten', 'korting', 'totaal', 'commissie', 'uitbetaling'].every((k) => app[k] === d[k]) &&
        app.drukteUitlater === d.drukte_uitlater;
      getest++;
      if (!gelijk && verschillen++ < 3) console.log('       verschil', JSON.stringify(g), JSON.stringify(app), JSON.stringify(d));
    }
  }
  check(`app en database rekenen hetzelfde (${getest} prijzen)`, verschillen === 0, `${verschillen} verschillen`);
} catch (e) {
  console.log('  overgeslagen: app tegen database (Node 22.18 of nieuwer nodig)', e.message);
}

// Tegoed en actiecodes
await db.exec(`insert into public.promocodes (code, bedrag) values ('WOOBER5', 500); insert into public.promocodes (code, bedrag, max_gebruik) values ('EENMALIG', 300, 1)`);
check('actiecode verzilveren', (await als(E, `select public.verzilver_code(' woober5 ') as b`)).rows?.[0]?.b === 500);
check('actiecode maar één keer', /al gebruikt/.test((await als(E, `select public.verzilver_code('WOOBER5')`)).fout ?? ''));
check('onbekende code', /kennen we niet/.test((await als(E, `select public.verzilver_code('GRATIS')`)).fout ?? ''));
check('actiecodes niet op te vragen', (await als(E, `select * from public.promocodes`)).rows?.length === 0);
check('code met maximum', (await als(X, `select public.verzilver_code('EENMALIG') as b`)).rows?.[0]?.b === 300 && /op$/.test((await als(E, `select public.verzilver_code('EENMALIG')`)).fout ?? ''));
check('tegoed van een ander onzichtbaar', (await als(X, `select * from public.tegoed_mutaties where eigenaar_id = '${E}'`)).rows?.length === 0);
check('saldo van een ander niet op te vragen', !!(await als(X, `select public.tegoed_saldo('${E}')`)).fout);
check('tegoed eigenaar', (await saldo(E)) === 500);

// Woober Plus en drukte
await db.exec(`insert into public.abonnementen (eigenaar_id, prijs_per_maand) values ('${E}', 499);
  insert into public.druktefactoren values ('6511', 'uitlaten', now() - interval '1 hour', now() + interval '1 hour', 1.4)`);
const b1 = (await boek(E, LUNA)).rows?.[0]?.id;
const v1 = await als(E, `select ${PRIJS} from public.boekingen where id = '${b1}'`);
check(
  'Uber-model met drukte, Plus en tegoed',
  JSON.stringify(v1.rows?.[0]) ===
    JSON.stringify({ verdienmodel_id: 'volledig', tarief: 1200, drukte_factor: 1.4, drukte: 480, drukte_uitlater: 360, servicekosten: 0, plus: true, boekingskosten: 49, korting: 500, totaal: 1229, commissie: 312, uitbetaling: 1248 }),
  JSON.stringify(v1),
);
check('tegoed gebruikt', (await saldo(E)) === 0);
check('lancering-boekingen houden hun prijs', (await als(E, `select totaal from public.boekingen where id = '${W}'`)).rows?.[0]?.totaal === 1200);
await als(E, `select public.wijzig_status('${b1}', 'geannuleerd')`);
check('tegoed terug na annuleren', (await saldo(E)) === 500);
const b2 = (await boek(E, LUNA)).rows?.[0]?.id;
check('afronden in het Uber-model', !(await rondAf(E, b2)).fout);
const g2 = (await woober(`select rekening::text, bedrag from public.grootboek where boeking_id = '${b2}' order by id`)).rows;
check(
  'grootboek: Woober verdient commissie, boekingskosten en drukte en betaalt het tegoed',
  JSON.stringify(g2) ===
    JSON.stringify([
      { rekening: 'eigenaar', bedrag: -1229 },
      { rekening: 'uitlater', bedrag: 1248 },
      { rekening: 'woober_boekingskosten', bedrag: 49 },
      { rekening: 'woober_commissie', bedrag: 312 },
      { rekening: 'woober_drukte', bedrag: 120 },
      { rekening: 'woober_tegoed', bedrag: -500 },
    ]),
  JSON.stringify(g2),
);
const opgezegd = await als(E, `select public.zeg_plus_op() as eind`);
check('Plus opzeggen loopt tot het einde van de maand', !opgezegd.fout && new Date(opgezegd.rows[0].eind) > new Date(), JSON.stringify(opgezegd));
check('abonnement van een ander onzichtbaar', (await als(X, `select * from public.abonnementen`)).rows?.length === 0);

// Uitnodigen
const code = (await als(E, `select public.mijn_uitnodigingscode() as c`)).rows?.[0]?.c;
check('uitnodigingscode', /^WOOBER-[0-9A-F]{6}$/.test(code ?? '') && (await als(E, `select public.mijn_uitnodigingscode() as c`)).rows?.[0]?.c === code, code);
check('eigen code werkt niet', /kennen we niet/.test((await als(E, `select public.gebruik_uitnodiging('${code}')`)).fout ?? ''));
check('code van een ander onzichtbaar', (await als(X, `select * from public.uitnodigingscodes`)).rows?.length === 0);
check('uitnodiging gebruiken', !(await als(X, `select public.gebruik_uitnodiging('${code.toLowerCase()}')`)).fout);
check('maar één uitnodiging', /al een uitnodiging/.test((await als(X, `select public.gebruik_uitnodiging('${code}')`)).fout ?? ''));
check('beloning niet zelf op te halen', !!(await als(X, `select public.beloon_uitnodiging('${X}')`)).fout);
await db.exec(`insert into public.honden (id, eigenaar_id, naam, ras, geboortedatum, grootte, energie, aanlijnen, met_honden)
  values ('${BOLT}', '${X}', 'Bolt', 'Border Collie', '2021-05-01', 'middel', 'energiek', 'altijd', 'goed')`);
const k2 = (await als(X, `select public.vraag_kennismaking_aan('${U}', now() + interval '3 hours') as id`)).rows?.[0]?.id;
await als(U, `select public.wijzig_status('${k2}', 'gepland')`);
await als(U, `select public.wijzig_status('${k2}', 'afgerond')`);
const b3 = await boek(X, BOLT);
check('nieuwe gebruiker boekt met actiecode-tegoed', !b3.fout && (await saldo(X)) === 0, JSON.stringify(b3));
await rondAf(X, b3.rows[0].id);
check('na de eerste wandeling krijgen beiden tegoed', (await saldo(E)) === 500 && (await saldo(X)) === 500);

// Een lagere commissie mag meteen, en het welkomsttegoed volgt het model
check('lagere commissie meteen', !(await woober(`insert into public.verdienmodel_planning (model_id, geldig_vanaf) values ('groei', now())`)).fout);
await db.exec(`insert into auth.users values ('${Y}'); insert into public.profielen (id, voornaam, plaats) values ('${Y}', 'Yara', 'Nijmegen')`);
check('welkomsttegoed in de groeifase', (await saldo(Y)) === 500);
const nul = (await woober(`select count(*)::int as n from (select boeking_id from public.grootboek group by boeking_id having sum(bedrag) <> 0) x`)).rows[0].n;
check('grootboek komt per boeking op nul uit', nul === 0);
// Plekken: Woober beheert de plekken, gebruikers schrijven reviews
const PL = '66666666-6666-6666-6666-666666666666';
await db.exec(`insert into public.plekken (id, soort, naam, plaats, lat, lng, toegevoegd_door, status) values ('${PL}', 'losloop', 'Hondenveld Stadspark', 'Nijmegen', 51.84, 5.87, null, 'gecontroleerd')`);
check('plekken lezen', (await als(U, `select naam from public.plekken`)).rows?.length === 1);
check('plek beoordelen', !(await als(E, `insert into public.plek_reviews (plek_id, auteur_id, sterren, tekst) values ('${PL}', '${E}', 5, 'Omheind en ruim')`)).fout);
check('één review per plek', !!(await als(E, `insert into public.plek_reviews (plek_id, auteur_id, sterren) values ('${PL}', '${E}', 4)`)).fout);
check('geen review op naam van een ander', !!(await als(U, `insert into public.plek_reviews (plek_id, auteur_id, sterren) values ('${PL}', '${E}', 1)`)).fout);
check('sterren tussen 1 en 5', !!(await als(U, `insert into public.plek_reviews (plek_id, auteur_id, sterren) values ('${PL}', '${U}', 6)`)).fout);
check('uitlater beoordeelt ook', !(await als(U, `insert into public.plek_reviews (plek_id, auteur_id, sterren) values ('${PL}', '${U}', 3)`)).fout);
check('eigen review aanpassen', !(await als(E, `update public.plek_reviews set sterren = 4 where auteur_id = '${E}'`)).fout);
const pl1 = await als(E, `update public.plek_reviews set sterren = 1 where auteur_id = '${U}' returning id`);
check('review van een ander niet aan te passen', !pl1.fout && pl1.rows.length === 0, JSON.stringify(pl1));
check('plek van review niet te verplaatsen', !!(await als(E, `update public.plek_reviews set plek_id = '${PL}' where auteur_id = '${E}'`)).fout);
const pl2 = await als(U, `select gemiddelde::float as g, aantal from public.plek_scores where plek_id = '${PL}'`);
check('gemiddelde per plek', pl2.rows?.[0]?.g === 3.5 && pl2.rows?.[0]?.aantal === 2, JSON.stringify(pl2));
await als(X, `insert into public.plek_reviews (plek_id, auteur_id, sterren, tekst) values ('${PL}', '${X}', 1, 'Vreselijk')`);
check('review van geblokkeerde gebruiker onzichtbaar', (await als(E, `select auteur_id from public.plek_reviews where auteur_id = '${X}'`)).rows?.length === 0);
const plr = (await als(U, `select id from public.plek_reviews where auteur_id = '${X}'`)).rows?.[0]?.id;
check('review melden', !(await als(U, `insert into public.meldingen (melder_id, gemeld_id, plek_review_id, reden) values ('${U}', '${X}', '${plr}', 'Ongepaste review van een plek')`)).fout);
const pl3 = await als(U, `delete from public.plek_reviews where auteur_id = '${E}' returning id`);
check('review van een ander niet te verwijderen', !pl3.fout && pl3.rows.length === 0, JSON.stringify(pl3));
check('eigen review verwijderen', (await als(E, `delete from public.plek_reviews where auteur_id = '${E}' returning id`)).rows?.length === 1);
// Plekken toevoegen door gebruikers
const pt = await als(E, `insert into public.plekken (soort, naam, plaats, lat, lng) values ('horeca', 'Café De Hoek', 'Nijmegen', 51.845, 5.862) returning id, status, toegevoegd_door`);
check('gebruiker voegt een café toe', !pt.fout && pt.rows[0].status === 'nieuw' && pt.rows[0].toegevoegd_door === E, JSON.stringify(pt));
const PT = pt.rows?.[0]?.id;
check('nieuwe plek meteen zichtbaar voor anderen', (await als(U, `select id from public.plekken where id = '${PT}'`)).rows?.length === 1);
check('zelf de status zetten kan niet', !!(await als(E, `insert into public.plekken (soort, naam, plaats, lat, lng, status) values ('overig', 'Dierenwinkel', 'Nijmegen', 51.84, 5.86, 'gecontroleerd')`)).fout);
check('op naam van een ander toevoegen kan niet', !!(await als(E, `insert into public.plekken (soort, naam, plaats, lat, lng, toegevoegd_door) values ('overig', 'Dierenwinkel', 'Nijmegen', 51.84, 5.86, '${U}')`)).fout);
const pa = await als(U, `update public.plekken set naam = 'Weg' where id = '${PT}' returning id`);
check('plek van een ander niet aan te passen', !!pa.fout || pa.rows.length === 0, JSON.stringify(pa));
const pt2 = await als(U, `delete from public.plekken where id = '${PT}' returning id`);
check('plek van een ander niet te verwijderen', !pt2.fout && pt2.rows.length === 0, JSON.stringify(pt2));
check('plek melden', !(await als(U, `insert into public.meldingen (melder_id, gemeld_id, plek_id, reden) values ('${U}', '${E}', '${PT}', 'Plek klopt niet')`)).fout);
check('plek van een geblokkeerde gebruiker onzichtbaar', (await als(X, `select id from public.plekken where id = '${PT}'`)).rows?.length === 0);
await db.exec(`update public.plekken set status = 'verborgen' where id = '${PT}'`);
check('verborgen plek alleen zichtbaar voor de toevoeger', (await als(U, `select id from public.plekken where id = '${PT}'`)).rows?.length === 0 && (await als(E, `select id from public.plekken where id = '${PT}'`)).rows?.length === 1);
check('verborgen plek niet zelf te verwijderen', (await als(E, `delete from public.plekken where id = '${PT}' returning id`)).rows?.length === 0);
for (let i = 0; i < 4; i++) await als(U, `insert into public.plekken (soort, naam, plaats, lat, lng) values ('overig', 'Plek ${i}', 'Nijmegen', 51.84, 5.86)`);
check('vijf plekken per dag', !(await als(U, `insert into public.plekken (soort, naam, plaats, lat, lng) values ('overig', 'Plek 5', 'Nijmegen', 51.84, 5.86)`)).fout);
check('zesde plek op een dag kan niet', !!(await als(U, `insert into public.plekken (soort, naam, plaats, lat, lng) values ('overig', 'Plek 6', 'Nijmegen', 51.84, 5.86)`)).fout);
const pt3 = (await als(U, `select id from public.plekken where naam = 'Plek 5'`)).rows[0].id;
check('eigen nieuwe plek verwijderen', (await als(U, `delete from public.plekken where id = '${pt3}' returning id`)).rows?.length === 1);
// Beheer
check('gewone gebruiker is geen beheerder', (await als(E, `select public.ben_beheerder() as b`)).rows?.[0]?.b === false);
check('zelf beheerder worden kan niet', !!(await als(E, `insert into public.beheerders (gebruiker_id) values ('${E}')`)).fout);
check('gewone gebruiker plant geen verdienmodel', /beheerders/.test((await als(E, `select public.plan_verdienmodel('groei', now() + interval '20 days')`)).fout ?? ''));
await db.exec(`insert into public.beheerders (gebruiker_id) values ('${U}')`);
check('beheerder ziet eigen rol', (await als(U, `select public.ben_beheerder() as b`)).rows?.[0]?.b === true);
check('beheerders van anderen onzichtbaar', (await als(E, `select * from public.beheerders`)).rows?.length === 0);
// Eerder in deze test is het Uber-model ingegaan; een lagere commissie mag dan direct (de 15-dagenregel staat hierboven getest)
check('beheerder plant lagere commissie direct', !(await als(U, `select public.plan_verdienmodel('groei', now() + interval '1 hour', 'Test')`)).fout);
check('beheerder plant niet met terugwerkende kracht', /terugwerkende/.test((await als(U, `select public.plan_verdienmodel('lancering', now() - interval '1 day')`)).fout ?? ''));
check('beheerder plant verdienmodel', !(await als(U, `select public.plan_verdienmodel('groei', now() + interval '20 days', 'Test')`)).fout);
check('onbekend model kan niet', !!(await als(U, `select public.plan_verdienmodel('gratis_alles', now() + interval '20 days')`)).fout);
// Teksten in de app
check('beheerder past tekst aan', !(await als(U, `insert into public.teksten (sleutel, waarde) values ('welkom.slogan', 'Nieuwe slogan')`)).fout);
const tk = await db.query(`select gewijzigd_door from public.teksten where sleutel = 'welkom.slogan'`);
check('tekst onthoudt wie hem aanpaste', tk.rows[0]?.gewijzigd_door === U, JSON.stringify(tk.rows));
check('gewone gebruiker leest teksten', (await als(E, `select waarde from public.teksten`)).rows?.[0]?.waarde === 'Nieuwe slogan');
await db.exec(`reset role; set role anon;`);
const anonTekst = await db.query(`select waarde from public.teksten`).then((r) => r.rows, (e) => e.message);
const anonSchrijf = await db.query(`insert into public.teksten (sleutel, waarde) values ('x.y', 'z')`).then(() => null, (e) => e.message);
await db.exec('reset role');
check('zonder account teksten lezen', Array.isArray(anonTekst) && anonTekst.length === 1, JSON.stringify(anonTekst));
check('zonder account geen tekst schrijven', !!anonSchrijf);
check('gewone gebruiker schrijft geen tekst', !!(await als(E, `insert into public.teksten (sleutel, waarde) values ('welkom.knop', 'Hack')`)).fout);
check('gewone gebruiker past geen tekst aan', (await als(E, `update public.teksten set waarde = 'Hack' returning sleutel`)).rows?.length === 0);
check('gewone gebruiker zet geen tekst terug', (await als(E, `delete from public.teksten returning sleutel`)).rows?.length === 0);
check('ongeldige sleutel kan niet', !!(await als(U, `insert into public.teksten (sleutel, waarde) values ('Welkom Slogan!', 'x')`)).fout);
check('beheerder zet tekst terug', (await als(U, `delete from public.teksten where sleutel = 'welkom.slogan' returning sleutel`)).rows?.length === 1);
// Lancering: voorwaarden, wachtlijst, melden en beheer (U is hier beheerder)
await db.exec(`update auth.users set email = 'robin@test.nl' where id = '${E}'; update auth.users set email = 'sanne@test.nl' where id = '${U}'`);
check('akkoord met voorwaarden bewaren', !(await als(E, `update public.profielen set voorwaarden_akkoord = now(), voorwaarden_versie = '29 oktober 2026' where id = '${E}'`)).fout);
check('op de wachtlijst', !(await als(E, `insert into public.wachtlijst (gebruiker_id, rol) values ('${E}', 'eigenaar')`)).fout);
check('niet een ander op de wachtlijst zetten', !!(await als(E, `insert into public.wachtlijst (gebruiker_id, rol) values ('${X}', 'eigenaar')`)).fout);
check('wachtlijst van anderen onzichtbaar', (await als(X, `select * from public.wachtlijst`)).rows?.length === 0);
check('gewone gebruiker ziet wachtlijst niet', !!(await als(E, `select * from public.beheer_wachtlijst()`)).fout);
const wl = await als(U, `select voornaam, email, postcode from public.beheer_wachtlijst()`);
check('beheerder ziet wachtlijst met e-mail en postcode', wl.rows?.[0]?.email === 'robin@test.nl' && wl.rows?.[0]?.postcode === '6511 AB', JSON.stringify(wl));
const wp = await als(U, `select public.beheer_plek_toevoegen('losloop', 'Heumensoord', 'Bos', array['Bos'], 'Maximaal drie honden', 'Nijmegen', 51.79, 5.86) as id`);
check('beheerder voegt plek van Woober toe', !wp.fout, wp.fout);
const WP = wp.rows?.[0]?.id;
const wpRij = await db.query(`select status, toegevoegd_door from public.plekken where id = '${WP}'`);
check('plek van Woober is gecontroleerd en zonder toevoeger', wpRij.rows[0]?.status === 'gecontroleerd' && wpRij.rows[0]?.toegevoegd_door === null, JSON.stringify(wpRij.rows));
check('dezelfde plek niet dubbel', (await als(U, `select public.beheer_plek_toevoegen('losloop', 'Heumensoord', '', '{}', '', 'Nijmegen', 51.79, 5.86) as id`)).rows?.[0]?.id === WP);
check('gewone gebruiker voegt geen plek van Woober toe', !!(await als(E, `select public.beheer_plek_toevoegen('losloop', 'Nep', '', '{}', '', 'Nijmegen', 51.79, 5.86)`)).fout);
check('plek van Woober melden', !(await als(E, `insert into public.meldingen (melder_id, plek_id, reden) values ('${E}', '${WP}', 'Plek klopt niet')`)).fout);
check('melding over niets kan niet', !!(await als(E, `insert into public.meldingen (melder_id, reden) values ('${E}', 'Zomaar')`)).fout);
check('gewone gebruiker past plek niet aan', (await als(E, `update public.plekken set naam = 'Weg' where id = '${WP}' returning id`)).rows?.length === 0);
check('beheerder past plek aan', (await als(U, `update public.plekken set regels = 'Los in het noordelijke deel' where id = '${WP}' returning id`)).rows?.length === 1);
check('beheerder verbergt plek', (await als(U, `update public.plekken set status = 'verborgen' where id = '${WP}' returning id`)).rows?.length === 1);
check('beheerder ziet verborgen plek', (await als(U, `select id from public.plekken where id = '${WP}'`)).rows?.length === 1);
check('anderen zien verborgen plek niet', (await als(E, `select id from public.plekken where id = '${WP}'`)).rows?.length === 0);
check('uitlater past eigen plek niet aan via beheer', !!(await als(E, `update public.uitlaters set identiteit_ok = true`)).fout);
const ml = await als(U, `select id, status from public.meldingen where plek_id = '${WP}'`);
check('beheerder leest meldingen', ml.rows?.length === 1, JSON.stringify(ml));
check('gewone gebruiker leest geen meldingen van anderen', (await als(X, `select id from public.meldingen`)).rows?.length === 0);
check('beheerder handelt melding af', (await als(U, `update public.meldingen set status = 'afgehandeld', besluit = 'Regels aangepast' where id = '${ml.rows?.[0]?.id}' returning id`)).rows?.length === 1);
check('beheerder past melder niet aan', !!(await als(U, `update public.meldingen set melder_id = '${U}' where id = '${ml.rows?.[0]?.id}'`)).fout);
check('gewone gebruiker handelt geen melding af', (await als(E, `update public.meldingen set status = 'afgehandeld' returning id`)).rows?.length === 0);
const rv = (await als(U, `select id from public.plek_reviews limit 1`)).rows?.[0]?.id;
check('gewone gebruiker verwijdert geen review van een ander', (await als(X, `delete from public.plek_reviews where id = '${rv}' and auteur_id <> '${X}' returning id`)).rows?.length === 0);
check('beheerder verwijdert review', (await als(U, `delete from public.plek_reviews where id = '${rv}' returning id`)).rows?.length === 1);
const bu = await als(U, `select voornaam, email, identiteit_ok from public.beheer_uitlaters()`);
check('beheerder ziet uitlaters met e-mail', bu.rows?.some((r) => r.email === 'sanne@test.nl'), JSON.stringify(bu));
check('gewone gebruiker ziet uitlaters voor beheer niet', !!(await als(E, `select * from public.beheer_uitlaters()`)).fout);
check('beheerder zet verificatie', !(await als(U, `select public.beheer_zet_verificatie('${U}', 'identiteit', false)`)).fout);
check('verificatie staat', (await db.query(`select identiteit_ok from public.uitlaters where id = '${U}'`)).rows[0]?.identiteit_ok === false);
check('zonder identiteit niet zichtbaar', (await als(E, `select id from public.uitlaters where id = '${U}'`)).rows?.length === 0);
await als(U, `select public.beheer_zet_verificatie('${U}', 'identiteit', true)`);
check('verzekering en VOG zijn geen stap meer', /Onbekende stap/.test((await als(U, `select public.beheer_zet_verificatie('${U}', 'vog', true)`)).fout ?? ''));
check('geen kolommen voor verzekering en VOG', (await db.query(`select count(*)::int as n from information_schema.columns where table_name = 'uitlaters' and column_name in ('verzekering_ok', 'vog_ok')`)).rows[0].n === 0);
check('onbekende verificatiestap kan niet', /Onbekende stap/.test((await als(U, `select public.beheer_zet_verificatie('${U}', 'id_ok; drop table x', true)`)).fout ?? ''));
check('onbekende uitlater', /Onbekende uitlater/.test((await als(U, `select public.beheer_zet_verificatie('${X}', 'identiteit', true)`)).fout ?? ''));
check('gewone gebruiker verifieert niet', !!(await als(E, `select public.beheer_zet_verificatie('${U}', 'identiteit', false)`)).fout);
const cf = await als(U, `select * from public.beheer_cijfers()`);
check('cijfers voor beheer', cf.rows?.[0]?.wachtlijst === 1 && cf.rows?.[0]?.accounts >= 2, JSON.stringify(cf));
check('gewone gebruiker ziet geen cijfers', !!(await als(E, `select * from public.beheer_cijfers()`)).fout);
check('beheerder verwijdert plek', (await als(U, `delete from public.plekken where id = '${WP}' returning id`)).rows?.length === 1);
await db.exec(`delete from public.verdienmodel_planning where toelichting = 'Test'; delete from public.beheerders`);
// Saldo (wallet) van uitlaters
const mijnSaldo = async (wie) => (await als(wie, `select public.mijn_saldo() as s`)).rows?.[0]?.s;
const S = await mijnSaldo(U);
check('saldo uitlater is wat ze verdiende', S > 1000 && S === (await woober(`select sum(bedrag)::int as s from public.grootboek where rekening = 'uitlater' and persoon_id = '${U}'`)).rows[0].s, String(S));
check('eigenaar zonder werk heeft geen saldo', (await mijnSaldo(E)) === 0);
check('saldo van een ander niet op te vragen', !!(await als(E, `select public.saldo_van('${U}')`)).fout);
check('uitbetalen onder 10 euro kan niet', /vanaf 10 euro/.test((await als(U, `select public.vraag_uitbetaling_aan(500)`)).fout ?? ''));
check('niet meer uitbetalen dan je saldo', /saldo/.test((await als(U, `select public.vraag_uitbetaling_aan(${S + 1})`)).fout ?? ''));
check('zonder gekoppelde rekening geen uitbetaling', /rekening/.test((await als(E, `select public.vraag_uitbetaling_aan(1000)`)).fout ?? ''));
check('uitbetaling niet zelf in te voeren', !!(await als(U, `insert into public.uitbetalingen (uitlater_id, bedrag) values ('${U}', 100)`)).fout);
check('account verwijderen kan niet met saldo', /saldo/.test((await als(U, `select public.verwijder_mijn_account()`)).fout ?? ''));
check('hele saldo uitbetalen', !(await als(U, `select public.vraag_uitbetaling_aan(${S})`)).fout);
check('saldo daarna nul', (await mijnSaldo(U)) === 0);
check('eigen uitbetaling zichtbaar', (await als(U, `select bedrag from public.uitbetalingen`)).rows?.[0]?.bedrag === S);
check('uitbetaling van een ander onzichtbaar', (await als(E, `select * from public.uitbetalingen`)).rows?.length === 0);
// Een eigenaar die ook uitlater is, betaalt met zijn saldo
await woober(`insert into public.grootboek (gebeurtenis, rekening, persoon_id, bedrag) values ('afgerond', 'uitlater', '${E}', 1500)`);
const sb = (await boek(E, LUNA)).rows?.[0]?.id;
const sbTotaal = (await als(E, `select totaal from public.boekingen where id = '${sb}'`)).rows?.[0]?.totaal;
check('met_saldo niet zelf aan te passen', !!(await als(E, `update public.boekingen set met_saldo = 1 where id = '${sb}'`)).fout);
check('niet meer met saldo dan de prijs', !!(await als(E, `select public.betaal_met_saldo('${sb}', ${sbTotaal + 1})`)).fout);
check('met saldo betalen voor een ander kan niet', !!(await als(X, `select public.betaal_met_saldo('${sb}', 100)`)).fout);
check('met saldo betalen', !(await als(E, `select public.betaal_met_saldo('${sb}', ${Math.min(1500, sbTotaal)})`)).fout);
check('saldo gereserveerd tijdens de boeking', (await mijnSaldo(E)) === 1500 - Math.min(1500, sbTotaal));
check('gereserveerd saldo niet uit te betalen', !!(await als(E, `select public.vraag_uitbetaling_aan(1500)`)).fout);
await rondAf(E, sb);
const gs = (await woober(`select sum(bedrag)::int as s, count(*) filter (where gebeurtenis = 'betaald_met_saldo')::int as n from public.grootboek where boeking_id = '${sb}'`)).rows[0];
check('grootboek: met saldo betaald en per boeking nul', gs.s === 0 && gs.n === 2, JSON.stringify(gs));
check('saldo na afronden', (await mijnSaldo(E)) === 1500 - Math.min(1500, sbTotaal));
const sb2 = (await boek(E, LUNA)).rows?.[0]?.id;
await als(E, `select public.betaal_met_saldo('${sb2}', 100)`);
await als(E, `select public.wijzig_status('${sb2}', 'geannuleerd')`);
check('bij annuleren komt het saldo terug', (await mijnSaldo(E)) === 1500 - Math.min(1500, sbTotaal));
await woober(`insert into public.grootboek (gebeurtenis, rekening, persoon_id, bedrag) values ('afgerond', 'uitlater', '${E}', -(select public.saldo_van('${E}')))`);
// Mollie: betalingen, terugbetalen, aansluiten en routeren
console.log('mollie');
const S0 = await mijnSaldo(U);
// Wat de worker (supabase/functions/betalingen-verwerken) doet met uitbetalingen van aangesloten uitlaters
const routeerAlles = async () => {
  for (const u of (await woober(`select * from public.uitbetalingen_klaar()`)).rows) {
    const plan = await woober(`select * from public.plan_routes('${u.uitbetaling_id}')`);
    for (const r of plan.rows ?? []) await woober(`select public.route_verwerkt(${r.route_id}, 'rt_${r.route_id}')`);
  }
};
check('app voert zelf geen betaling in', !!(await als(E, `insert into public.betalingen (id, boeking_id, bedrag, methode) values ('tr_nep', '${W}', 1, 'ideal')`)).fout);
check('hooguit 60 dagen vooruit boeken', /60 dagen/.test((await als(E, `select public.vraag_boeking_aan('uitlaten', '${U}', array['${LUNA}']::uuid[], 30::smallint, now() + interval '61 days', 'thuis', '', 'ideal')`)).fout ?? ''));
check('ook later niet verder dan 60 dagen', /60 dagen/.test((await woober(`update public.boekingen set moment = now() + interval '90 days' where id = '${W}'`)).fout ?? ''));
check('onbekende betaling in de webhook doet niets', !(await woober(`select public.verwerk_betaling('tr_onbekend', 'betaald', 0)`)).fout);
check('betaling starten voor een ander kan niet', /hoort niet bij jou/.test((await woober(`select * from public.betaling_voor('${W}', '${X}')`)).fout ?? ''));
const mb = (await boek(E, LUNA)).rows?.[0]?.id;
const mbVoor = (await woober(`select * from public.betaling_voor('${mb}', '${E}')`)).rows?.[0];
check('te betalen is het totaal', mbVoor?.bedrag === (await woober(`select totaal from public.boekingen where id = '${mb}'`)).rows[0].totaal && /uitlaten met Sanne/.test(mbVoor?.omschrijving ?? ''), JSON.stringify(mbVoor));
await woober(`select public.registreer_betaling('tr_mislukt1', '${mb}', 'boeking', ${mbVoor.bedrag}, 'ideal')`);
await woober(`select public.verwerk_betaling('tr_mislukt1', 'mislukt', 0)`);
check('niet betaald: aanvraag vervalt', (await woober(`select status from public.boekingen where id = '${mb}'`)).rows[0].status === 'geannuleerd');
// Twee keer betaald: de tweede gaat helemaal terug
const mb2 = (await boek(E, LUNA)).rows?.[0]?.id;
const tr1 = await betaal(mb2);
const tr2 = await betaal(mb2);
const terug1 = (await woober(`select * from public.terug_te_betalen()`)).rows;
check('dubbel betaald: tweede terug', terug1.length === 1 && terug1[0].betaling_id === tr2, JSON.stringify(terug1));
await woober(`select public.boek_terugbetaling('${tr2}', ${terug1[0]?.bedrag ?? 0})`);
check('na terugbetalen niets meer terug', (await woober(`select * from public.terug_te_betalen()`)).rows.length === 0);
// Geannuleerd terwijl de uitlater onderweg was: alles terug behalve de annuleringskosten
await als(U, `select public.wijzig_status('${mb2}', 'onderweg')`);
await als(E, `select public.wijzig_status('${mb2}', 'geannuleerd')`);
const kosten = (await woober(`select annuleringskosten from public.boekingen where id = '${mb2}'`)).rows[0].annuleringskosten;
const terug2 = (await woober(`select * from public.terug_te_betalen()`)).rows;
check('annuleren: terug min annuleringskosten', kosten > 0 && terug2.length === 1 && terug2[0].betaling_id === tr1 && terug2[0].bedrag === mbVoor.bedrag - kosten, JSON.stringify({ kosten, terug2 }));
await woober(`select public.boek_terugbetaling('${tr1}', ${terug2[0]?.bedrag ?? 0})`);
// Aansluiten bij Mollie
check('app kan koppelingen niet lezen', (await als(U, `select * from public.mollie_koppelingen`)).fout !== undefined || (await als(U, `select * from public.mollie_koppelingen`)).rows?.length === 0);
check('nog niet aangesloten', (await als(U, `select public.mijn_mollie_koppeling() as s`)).rows?.[0]?.s === null);
await woober(`select public.start_koppeling('${U}', 'staat-123')`);
check('koppeling via staat terugvinden', (await woober(`select public.koppeling_van_staat('staat-123') as u`)).rows[0].u === U);
check('app zoekt geen koppeling via staat', /permission denied/.test((await als(U, `select public.koppeling_van_staat('staat-123')`)).fout ?? ''));
await woober(`select public.bewaar_koppeling('${U}', 'org_abc123', 'refresh-geheim')`);
check('eigen stand van aansluiten', (await als(U, `select public.mijn_mollie_koppeling() as s`)).rows?.[0]?.s === 'gestart');
check('te controleren koppeling', (await woober(`select * from public.te_controleren_koppelingen()`)).rows.some((r) => r.uitlater_id === U));
await db.exec(`update public.uitlaters set uitbetaling_ok = false where id = '${U}'`);
await woober(`select public.zet_koppelstatus('${U}', 'klaar')`);
check('klaar bij Mollie: rekening geverifieerd', (await woober(`select uitbetaling_ok from public.uitlaters where id = '${U}'`)).rows[0].uitbetaling_ok === true);
check('niet meer te controleren', !(await woober(`select * from public.te_controleren_koppelingen()`)).rows.some((r) => r.uitlater_id === U));
// Uitbetalen via routes, oudste betalingen eerst
const mb3 = (await boek(E, LUNA)).rows?.[0]?.id;
await rondAf(E, mb3);
const SU = await mijnSaldo(U);
check('saldo uit wandeling en annuleringskosten', SU === S0 + kosten + (await woober(`select uitbetaling from public.boekingen where id = '${mb3}'`)).rows[0].uitbetaling, String(SU));
const ruimteVoor = (await woober(`select coalesce(sum(ruimte), 0)::int as r from public.routeerbaar()`)).rows[0].r;
check('genoeg betaald geld om te routeren', ruimteVoor >= SU, String(ruimteVoor));
const ub = (await als(U, `select public.vraag_uitbetaling_aan(${SU}) as id`)).rows?.[0]?.id;
check('uitbetaling klaar om te routeren', (await woober(`select * from public.uitbetalingen_klaar()`)).rows.some((r) => r.uitbetaling_id === ub && r.organisatie_id === 'org_abc123'));
check('app plant geen routes', /permission denied/.test((await als(U, `select * from public.plan_routes('${ub}')`)).fout ?? ''));
const routes = (await woober(`select * from public.plan_routes('${ub}')`)).rows;
const oudste = (await woober(`select id from public.betalingen where status = 'betaald' order by betaald_op, id limit 1`)).rows[0].id;
check('routes dekken de uitbetaling, oudste betaling eerst', routes.reduce((t, r) => t + r.bedrag, 0) === SU && routes[0]?.betaling_id === oudste, JSON.stringify(routes));
check('opnieuw plannen geeft dezelfde routes', (await woober(`select * from public.plan_routes('${ub}')`)).rows.length === routes.length);
check('geplande routes tellen niet meer als ruimte', (await woober(`select coalesce(sum(ruimte), 0)::int as r from public.routeerbaar()`)).rows[0].r === ruimteVoor - SU);
await woober(`select public.route_verwerkt(${routes[0].route_id}, null)`);
check('mislukte route: uitbetaling blijft open', (await woober(`select status from public.uitbetalingen where id = '${ub}'`)).rows[0].status === 'aangevraagd');
const opnieuw = (await woober(`select * from public.plan_routes('${ub}')`)).rows;
check('mislukte route opnieuw gepland', opnieuw.reduce((t, r) => t + r.bedrag, 0) === SU, JSON.stringify(opnieuw));
for (const r of opnieuw) await woober(`select public.route_verwerkt(${r.route_id}, 'rt_${r.route_id}')`);
check('alles gerouteerd: uitbetaling onderweg', (await woober(`select status from public.uitbetalingen where id = '${ub}'`)).rows[0].status === 'onderweg');
const teveel = (await woober(`insert into public.uitbetalingen (uitlater_id, bedrag) values ('${U}', 100000000) returning id`)).rows[0].id;
const plan2 = (await woober(`select * from public.plan_routes('${teveel}')`)).rows;
check('meer dan betaald: rest als overboeking van Woober', plan2.at(-1)?.soort === 'overboeking' && plan2.reduce((t, r) => t + r.bedrag, 0) === 100000000 && plan2.slice(0, -1).every((r) => r.soort === 'route'), JSON.stringify(plan2.slice(-2)));
await woober(`delete from public.mollie_routes where uitbetaling_id = '${teveel}'; delete from public.uitbetalingen where id = '${teveel}'`);
// Automatisch uitbetalen voordat Mollie het na 90 dagen zelf naar Woober zet
await routeerAlles();
const mb4 = (await boek(E, LUNA)).rows?.[0]?.id;
await rondAf(E, mb4);
check('geen automatische uitbetaling als niets oud is', (await woober(`select public.maak_automatische_uitbetalingen() as n`)).rows[0].n === 0);
const mb4Betaling = (await woober(`select id from public.betalingen where boeking_id = '${mb4}' and soort = 'boeking'`)).rows[0].id;
// Een boeking met servicekosten, zoals in een latere fase: die 4 euro is van Woober en gaat nooit naar een uitlater
await db.exec(`update public.boekingen set servicekosten = servicekosten + 400 where id = '${W}'`);
await db.query(`select public.registreer_betaling('tr_service1', $1, 'boeking', 400, 'ideal')`, [W]);
await db.query(`select public.verwerk_betaling('tr_service1', 'betaald', 0)`);
// Wat na routeren nog in oudere betalingen staat, is het aandeel van Woober; dat mag na 90 dagen naar Woober
await db.exec(`update public.betalingen set betaald_op = now() - interval '85 days' where id <> '${mb4Betaling}'`);
const oudVanWoober = (await woober(`select coalesce(sum(ruimte), 0)::int as r from public.routeerbaar() where betaald_op < now() - interval '80 days'`)).rows[0].r;
check('aandeel van Woober in oude betalingen dwingt geen uitbetaling af', oudVanWoober > 0 && (await woober(`select public.maak_automatische_uitbetalingen() as n`)).rows[0].n === 0, String(oudVanWoober));
await db.exec(`update public.betalingen set betaald_op = now() - interval '85 days' where id = '${mb4Betaling}'`);
check('geld van de uitlater in een oude betaling: automatisch uitbetaald', (await woober(`select public.maak_automatische_uitbetalingen() as n`)).rows[0].n === 1);
check('automatische uitbetaling van het hele saldo', (await mijnSaldo(U)) === 0 && (await als(U, `select automatisch from public.uitbetalingen order by aangemaakt desc limit 1`)).rows?.[0]?.automatisch === true);
await routeerAlles();
await db.exec(`update public.betalingen set betaald_op = now() - interval '89 days' where id in (select betaling_id from public.routeerbaar())`);
check('na 88 dagen niet meer te routeren (Mollie geeft het na 90 dagen aan Woober)', (await woober(`select count(*)::int as n from public.routeerbaar()`)).rows[0].n === 0);
check('fooi via betaling', !(await woober(`select * from public.betaling_voor('${mb4}', '${E}', 'fooi', 300)`)).fout);
await woober(`select public.registreer_betaling('tr_fooi1', '${mb4}', 'fooi', 300, 'ideal')`);
await woober(`select public.verwerk_betaling('tr_fooi1', 'betaald', 0)`);
await woober(`select public.verwerk_betaling('tr_fooi1', 'betaald', 0)`);
check('fooi telt één keer, ook als de webhook twee keer komt', (await woober(`select fooi from public.boekingen where id = '${mb4}'`)).rows[0].fooi === 300 && (await mijnSaldo(U)) === 300);
// Terugboekingen via de bank: Woober draagt het verlies, nooit de uitlater
const mb5 = (await boek(E, LUNA)).rows?.[0]?.id;
await rondAf(E, mb5);
const tb1 = (await woober(`select id from public.betalingen where boeking_id = '${mb5}' and soort = 'boeking'`)).rows[0].id;
const ruimteTb = async () => (await woober(`select coalesce(sum(ruimte), 0)::int as r from public.routeerbaar() where betaling_id = '${tb1}'`)).rows[0].r;
const voorTb = await ruimteTb();
const saldoVoorTb = await mijnSaldo(U);
await woober(`select public.verwerk_betaling('${tb1}', 'betaald', 0, 500)`);
check('deels teruggeboekt: dat deel is niet meer te routeren', (await ruimteTb()) === voorTb - 500, `${voorTb} ${await ruimteTb()}`);
check('deels teruggeboekt: niets extra terugbetalen', !(await woober(`select * from public.terug_te_betalen()`)).rows.some((t) => t.betaling_id === tb1));
check('deels teruggeboekt: saldo van de uitlater blijft', (await mijnSaldo(U)) === saldoVoorTb);
check('deels teruggeboekt: geen aanvulling nodig', (await woober(`select count(*)::int as n from public.uitbetalingen where reden = 'aanvulling'`)).rows[0].n === 0);
const ubTb = (await als(U, `select public.vraag_uitbetaling_aan(${saldoVoorTb}) as id`)).rows?.[0]?.id;
const planTb = (await woober(`select * from public.plan_routes('${ubTb}')`)).rows;
check('wat teruggeboekt is, legt Woober bij', planTb.reduce((t, r) => t + r.bedrag, 0) === saldoVoorTb, JSON.stringify(planTb));
await routeerAlles();
// Volledig teruggeboekt nadat het al gerouteerd was: Mollie haalt het bij de uitlater terug, Woober vult aan
const gerouteerd = (await woober(`select r.betaling_id, sum(r.bedrag)::int as s from public.mollie_routes r join public.betalingen p on p.id = r.betaling_id
  join public.boekingen b on b.id = p.boeking_id where r.soort = 'route' and r.status = 'gemaakt' and r.betaling_id <> '${tb1}' and b.eigenaar_id = '${E}'
  group by r.betaling_id order by 1 limit 1`)).rows[0];
const tb2 = gerouteerd.betaling_id;
const tb2Bedrag = (await woober(`select bedrag from public.betalingen where id = '${tb2}'`)).rows[0].bedrag;
await woober(`select public.verwerk_betaling('${tb2}', 'betaald', 0, ${tb2Bedrag})`);
await woober(`select public.verwerk_betaling('${tb2}', 'betaald', 0, ${tb2Bedrag})`);
const aanvulling = (await woober(`select uitlater_id, bedrag, status from public.uitbetalingen where reden = 'aanvulling'`)).rows;
check('volledig teruggeboekt: Woober vult de uitlater aan, één keer', aanvulling.length === 1 && aanvulling[0].uitlater_id === U && aanvulling[0].bedrag === gerouteerd.s, JSON.stringify({ aanvulling, gerouteerd }));
check('aanvulling gaat niet van het saldo af', (await mijnSaldo(U)) === 0);
await routeerAlles();
check('aanvulling wordt gerouteerd', (await woober(`select status from public.uitbetalingen where reden = 'aanvulling'`)).rows[0].status === 'onderweg');
// Een medewerker beoordeelt de eigenaar; de app doet dat niet zelf
check('terugboekingen alleen voor beheerders', /beheerders/.test((await als(E, `select * from public.beheer_terugboekingen()`)).fout ?? ''));
await db.exec(`insert into public.beheerders (gebruiker_id) values ('${U}')`);
const tbl = (await als(U, `select * from public.beheer_terugboekingen()`)).rows ?? [];
check('beheerder ziet terugboekingen met eigenaar en herhaling', tbl.length === 2 && tbl.every((r) => r.email && r.andere === 1 && r.besluit === null) && tbl.some((r) => r.betaling_id === tb2 && r.aangevuld), JSON.stringify(tbl));
check('besluit is verplicht', /besloten/.test((await als(U, `select public.beheer_terugboeking_afhandelen('${tb1}', ' ')`)).fout ?? ''));
check('besluit vastleggen', !(await als(U, `select public.beheer_terugboeking_afhandelen('${tb1}', 'Eigenaar gebeld, vergissing van de bank')`)).fout);
check('afgehandeld komt onderaan', (await als(U, `select betaling_id from public.beheer_terugboekingen()`)).rows?.at(-1)?.betaling_id === tb1);
await db.exec(`delete from public.beheerders`);
// Rechten op functies
const alsAnon = async (q) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`);
  try { return { rows: (await db.query(q)).rows }; } catch (e) { return { fout: e.message }; } finally { await db.exec('reset role'); }
};
for (const f of [`public.kent_elkaar('${E}', '${U}')`, `public.is_geblokkeerd('${E}', '${X}')`, `public.plekken_afgelopen_dag('${U}')`, `public.verzilver_code('X')`, `public.actief_verdienmodel()`, `public.mijn_saldo()`, `public.vraag_uitbetaling_aan(1000)`, `public.mijn_mollie_koppeling()`, `public.beheer_terugboekingen()`, `public.beheer_uitlaters()`]) {
  check(`zonder account geen ${f.split('(')[0]}`, /permission denied/.test((await alsAnon(`select ${f}`)).fout ?? ''));
}
check('zonder account wel teksten lezen', !(await alsAnon(`select * from public.teksten`)).fout);
check('kent elkaar: eigen antwoord', (await als(E, `select public.kent_elkaar('${E}', '${U}') as k`)).rows?.[0]?.k === true);
check('kent elkaar: niet over anderen', (await als(X, `select public.kent_elkaar('${E}', '${U}') as k`)).rows?.[0]?.k === false);
check('geblokkeerd: eigen antwoord', (await als(X, `select public.is_geblokkeerd('${X}', '${E}') as g`)).rows?.[0]?.g === true);
check('geblokkeerd: niet over anderen', (await als(U, `select public.is_geblokkeerd('${E}', '${X}') as g`)).rows?.[0]?.g === false);
check('plekken van een ander niet te tellen', (await als(E, `select public.plekken_afgelopen_dag('${U}') as n`)).rows?.[0]?.n === 0);
check('eigen plekken tellen', (await als(U, `select public.plekken_afgelopen_dag('${U}') as n`)).rows?.[0]?.n > 0);
const vast = await db.query(`select proname, proconfig from pg_proc where proname in ('mag_uitlaten', 'tarief_voor')`);
check('vast zoekpad', vast.rows.length === 2 && vast.rows.every((r) => String(r.proconfig).includes('search_path')), JSON.stringify(vast.rows));
// Accounts
check('eigen rol bewaren', !(await als(E, `update public.profielen set rol = 'uitlater' where id = '${E}'`)).fout);
check('ongeldige rol kan niet', !!(await als(E, `update public.profielen set rol = 'beheerder' where id = '${E}'`)).fout);
check('rol van een ander niet aan te passen', (await als(X, `update public.profielen set rol = 'uitlater' where id = '${E}' returning id`)).rows?.length === 0);
check('adres zonder coördinaten', !(await als(X, `insert into public.adressen (gebruiker_id, straat_huisnummer, postcode, plaats) values ('${X}', 'Rijnkade 1', '6811 AA', 'Arnhem')`)).fout);
check('leeftijd op uitlaatprofiel', !(await als(U, `update public.uitlaters set leeftijd = 31 where id = '${U}'`)).fout);
// De app bewaart het profiel met update en dan insert: PostgREST-upsert zet ook id = excluded.id, en op id is er geen UPDATE-recht
check('upsert met id in de SET-lijst wordt geweigerd', !!(await als(U, `insert into public.uitlaters (id, tarief_30, tarief_45, tarief_60) values ('${U}', 1200, 1600, 1900) on conflict (id) do update set id = excluded.id, tarief_30 = excluded.tarief_30`)).fout);
check('profiel bijwerken zonder id lukt', (await als(U, `update public.uitlaters set wijk = 'Centrum' where id = '${U}' returning id`)).rows?.length === 1);
check('uitlaten kan vanaf 14 jaar', !(await als(U, `update public.uitlaters set leeftijd = 14 where id = '${U}'`)).fout);
check('niet jonger dan 14', !!(await als(U, `update public.uitlaters set leeftijd = 13 where id = '${U}'`)).fout);
await als(U, `update public.uitlaters set leeftijd = 31 where id = '${U}'`);
// Toestemming van een ouder of voogd: alleen de gebruiker zelf en Woober
check('toestemming ouders bewaren', !(await als(E, `insert into public.toestemming_ouders (gebruiker_id) values ('${E}')`)).fout);
check('geen toestemming voor een ander', !!(await als(E, `insert into public.toestemming_ouders (gebruiker_id) values ('${X}')`)).fout);
check('eigen toestemming lezen', (await als(E, `select gebruiker_id from public.toestemming_ouders`)).rows?.length === 1);
check('toestemming van een ander niet te lezen', (await als(X, `select gebruiker_id from public.toestemming_ouders`)).rows?.length === 0);
check('toestemming niet terug te draaien', (await als(E, `delete from public.toestemming_ouders returning gebruiker_id`)).rows?.length !== 1);
check('niet ingelogd geen account verwijderen', !!(await als('', `select public.verwijder_mijn_account()`)).fout);
check('eigen account verwijderen', !(await als(X, `select public.verwijder_mijn_account()`)).fout);
const weg = await db.query(`select (select count(*) from auth.users where id = '${X}')::int as u, (select count(*) from public.profielen where id = '${X}')::int as p, (select count(*) from public.adressen where gebruiker_id = '${X}')::int as a`);
check('account, profiel en adres weg', weg.rows[0].u === 0 && weg.rows[0].p === 0 && weg.rows[0].a === 0, JSON.stringify(weg.rows));
check('andere accounts blijven', (await db.query(`select count(*)::int as n from auth.users where id in ('${E}', '${U}')`)).rows[0].n === 2);
// Oppas bij de oppas thuis, afspraken over het huis en afgeven op een ander punt (20261101000000_oppas_en_afgeven.sql)
console.log('oppas en afgeven');
// Eerdere boekingen tussen E en U mogen het adres hier niet al zichtbaar maken
await db.exec(`update public.boekingen set status = 'afgerond' where eigenaar_id = '${E}' and uitlater_id = '${U}' and status in ('gepland', 'onderweg', 'aangekomen', 'bezig')`);
const LUNA2 = '44444444-4444-4444-4444-444444444444';
const later = `now() + interval '2 days'`;
check('thuis ontvangen zonder je huis te beschrijven kan niet', /huis_beschreven/.test((await als(U, `update public.uitlaters set oppas_plekken = '{bij_eigenaar,bij_oppas}' where id = '${U}'`)).fout ?? ''));
const huis = await als(U, `update public.uitlaters set oppas_plekken = '{bij_eigenaar,bij_oppas}', huis_kenmerken = '{tuin,rookvrij}',
  huis_omschrijving = 'Benedenwoning met omheinde tuin, rustige straat, geen andere huisdieren in huis.' where id = '${U}'`);
check('thuis ontvangen met beschrijving van het huis', !huis.fout, huis.fout);
check('eigenaar leest de beschrijving van het huis', (await als(E, `select huis_kenmerken from public.uitlaters where id = '${U}'`)).rows?.[0]?.huis_kenmerken?.join() === 'tuin,rookvrij');
const bijOppas = `select public.vraag_boeking_aan('oppas', '${U}', array['${LUNA2}']::uuid[], 180::smallint, ${later}, 'kastje', '', 'ideal', true, p_oppas_plek => 'bij_oppas', p_camera_waar => 'Hal') as id`;
check('bij de oppas thuis kan pas met een adres van de oppas', /nog geen adres/.test((await als(E, bijOppas)).fout ?? ''));
await db.exec(`insert into public.adressen values ('${U}', 'Iepenlaan 3', '6512 CD', 'Nijmegen', 51.83, 5.87)`);
const bo = (await als(E, bijOppas)).rows?.[0]?.id;
const boRij = (await woober(`select oppas_plek, sleutel, camera_in_huis, camera_waar from public.boekingen where id = '${bo}'`)).rows[0];
check('bij de oppas thuis: zelf brengen, geen huisregels van de eigenaar', JSON.stringify(boRij) === JSON.stringify({ oppas_plek: 'bij_oppas', sleutel: 'thuis', camera_in_huis: false, camera_waar: '' }), JSON.stringify(boRij));
check('adres van de oppas pas na accepteren', (await als(E, `select count(*)::int as n from public.adressen where gebruiker_id = '${U}'`)).rows?.[0]?.n === 0);
await betaal(bo);
await als(U, `select public.wijzig_status('${bo}', 'gepland')`);
check('na accepteren ziet de eigenaar het adres van de oppas', (await als(E, `select straat_huisnummer from public.adressen where gebruiker_id = '${U}'`)).rows?.[0]?.straat_huisnummer === 'Iepenlaan 3');
check('bij de oppas thuis ziet de oppas het adres van de eigenaar niet', (await als(U, `select count(*)::int as n from public.adressen where gebruiker_id = '${E}'`)).rows?.[0]?.n === 0);
await db.exec(`update public.boekingen set status = 'afgerond' where id = '${bo}'`);
check('oppas die niet thuis ontvangt, niet te boeken bij de oppas thuis', !(await als(U, `update public.uitlaters set oppas_plekken = '{bij_eigenaar}' where id = '${U}'`)).fout
  && /niet op deze plek/.test((await als(E, bijOppas)).fout ?? ''));
const thuisOppas = (await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['${LUNA2}']::uuid[], 180::smallint, ${later}, 'thuis', '', 'ideal', false,
  p_voorzieningen => '{wifi,koffie_thee}', p_huisregels => 'Boven is privé') as id`)).rows?.[0]?.id;
check('oppas leest de afspraken over het huis al bij het verzoek', JSON.stringify((await als(U, `select voorzieningen, huisregels from public.boekingen where id = '${thuisOppas}'`)).rows?.[0])
  === JSON.stringify({ voorzieningen: ['wifi', 'koffie_thee'], huisregels: 'Boven is privé' }));
check('onbekende voorziening kan niet', !!(await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['${LUNA2}']::uuid[], 180::smallint, ${later}, 'thuis', '', 'ideal', false, p_voorzieningen => '{zwembad}')`)).fout);
await db.exec(`update public.boekingen set status = 'geannuleerd' where id = '${thuisOppas}'`);
// Afgeven op een ander punt: de uitlater ziet het adres niet
const afg = `select public.vraag_boeking_aan('uitlaten', '${U}', array['${LUNA2}']::uuid[], 30::smallint, ${later}, 'kastje', '', 'ideal'`;
check('afgiftepunt zonder plek op de kaart kan niet', /op de kaart/.test((await als(E, `${afg}, p_afgifte => 'Ingang Stadspark')`)).fout ?? ''));
const ap = (await als(E, `${afg}, p_afgifte => 'Ingang Stadspark, bij het hek', p_afgifte_lat => 51.84, p_afgifte_lng => 5.87) as id`)).rows?.[0]?.id;
check('afgeven op een ander punt: zelf meegeven', (await woober(`select sleutel from public.boekingen where id = '${ap}'`)).rows[0].sleutel === 'thuis');
await betaal(ap);
await als(U, `select public.wijzig_status('${ap}', 'gepland')`);
check('afgeven op een ander punt: uitlater ziet het afgiftepunt', (await als(U, `select afgifte from public.boekingen where id = '${ap}'`)).rows?.[0]?.afgifte === 'Ingang Stadspark, bij het hek');
check('afgeven op een ander punt: uitlater ziet het adres niet', (await als(U, `select count(*)::int as n from public.adressen where gebruiker_id = '${E}'`)).rows?.[0]?.n === 0);
const thuisOphalen = (await als(E, `${afg}) as id`)).rows?.[0]?.id;
await betaal(thuisOphalen);
await als(U, `select public.wijzig_status('${thuisOphalen}', 'gepland')`);
check('thuis ophalen: uitlater ziet het adres na accepteren', (await als(U, `select count(*)::int as n from public.adressen where gebruiker_id = '${E}'`)).rows?.[0]?.n === 1);
const afgOppas = (await als(E, `select public.vraag_boeking_aan('oppas', '${U}', array['${LUNA2}']::uuid[], 120::smallint, ${later}, 'thuis', '', 'ideal', false, p_afgifte => 'Park', p_afgifte_lat => 1, p_afgifte_lng => 1) as id`)).rows?.[0]?.id;
check('afgiftepunt alleen bij uitlaten', afgOppas && (await woober(`select afgifte from public.boekingen where id = '${afgOppas}'`)).rows[0].afgifte === null);
const km = (await als(E, `select public.vraag_kennismaking_aan('${U}', ${later}, 'Café De Hoek', 51.845, 5.862) as id`)).rows?.[0]?.id;
check('kennismaken op een openbare plek', (await als(U, `select afgifte from public.boekingen where id = '${km}'`)).rows?.[0]?.afgifte === 'Café De Hoek');
console.log(`\n${ok} geslaagd, ${fout} mislukt`);
process.exit(fout ? 1 : 0);
