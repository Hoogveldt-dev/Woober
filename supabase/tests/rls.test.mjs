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
check('oppasprijs is uurtarief maal uren', JSON.stringify(o4.rows?.[0]) === JSON.stringify({ dienst: 'oppas', tarief: 3300, servicekosten: 0, commissie: 0, camera_in_huis: true }), JSON.stringify(o4));
for (const st of ['onderweg', 'aangekomen']) await als(U, `select public.wijzig_status('${O}', '${st}')`);
const oc = await als(E, `select code from public.ophaalcodes where boeking_id = '${O}'`);
check('oppas start met de code', (await als(U, `select public.start_wandeling('${O}', '${oc.rows[0].code}') as g`)).rows?.[0]?.g === true);
check('eigenaar verlengt een uur', !(await als(E, `select public.verleng_oppas('${O}')`)).fout);
const o5 = await als(E, `select duur, tarief, servicekosten from public.boekingen where id = '${O}'`);
check('verlengen past duur en prijs aan', JSON.stringify(o5.rows?.[0]) === JSON.stringify({ duur: 240, tarief: 4400, servicekosten: 0 }), JSON.stringify(o5));
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
// Verdienmodel ----------------------------------------------------------------
console.log('verdienmodel');
const LUNA = '44444444-4444-4444-4444-444444444444', BOLT = '55555555-5555-5555-5555-555555555555', Y = '66666666-6666-6666-6666-666666666666';
const woober = async (q) => { try { return { rows: (await db.query(q)).rows }; } catch (e) { return { fout: e.message }; } };
const boek = (wie, hond) => als(wie, `select public.vraag_boeking_aan('uitlaten', '${U}', array['${hond}']::uuid[], 30::smallint, null, 'thuis', '', 'ideal') as id`);
const saldo = async (wie) => (await woober(`select public.tegoed_saldo('${wie}') as s`)).rows[0].s;
const actief = async () => (await als(E, `select (public.actief_verdienmodel()).id`)).rows?.[0]?.id;
const rondAf = async (eigenaar, id) => {
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
check('fooi niet terug te draaien', /terugdraaien/.test((await als(E, `update public.boekingen set fooi = 100 where id = '${W}'`)).fout ?? ''));
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
check('gebruiker kan geen plek toevoegen', !!(await als(E, `insert into public.plekken (soort, naam, plaats, lat, lng) values ('strand', 'Nep', 'Nijmegen', 51.85, 5.86)`)).fout);
await db.exec(`insert into public.plekken (id, soort, naam, plaats, lat, lng) values ('${PL}', 'losloop', 'Hondenveld Stadspark', 'Nijmegen', 51.84, 5.87)`);
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
console.log(`\n${ok} geslaagd, ${fout} mislukt`);
process.exit(fout ? 1 : 0);
