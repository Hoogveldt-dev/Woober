import { DAGEN_KORT, DAGEN_LANG, dagVan } from './tijd';

/**
 * Woober Fit: stappen per dag, week en maand. Hier alleen het rekenwerk. De stappen zelf zijn in de demo
 * verzonnen (demoPerUur) en komen bij echte accounts van de telefoon (src/lib/stappen.ts).
 */

export type Periode = 'dag' | 'week' | 'maand';

/** Dagdoel in stappen; een veelgebruikt doel voor volwassenen */
export const DAGDOEL = 8000;
/** Gemiddelde staplengte van een volwassene bij wandelen. De afstand is daarom een schatting. */
export const STAPLENGTE_M = 0.75;

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function dagBegin(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Zelfde tijd een aantal dagen later; via setDate, zodat zomer- en wintertijd goed gaan */
export function plusDagen(d: Date, dagen: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + dagen);
  return x;
}

/** "2026-10-30" in de tijdzone van de telefoon */
export function dagSleutel(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function datumTekst(d: Date): string {
  return `${DAGEN_LANG[dagVan(d)]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
}

export interface Venster {
  periode: Periode;
  begin: Date;
  /** Begin van de volgende periode (niet meer meegeteld) */
  eind: Date;
  titel: string;
  /** Elke dag in het venster; bij de dag alleen die ene dag */
  dagen: Date[];
}

/** De dag, week (maandag tot en met zondag) of maand van nu, of een aantal periodes terug */
export function venster(periode: Periode, terug: number, nu: Date): Venster {
  const vandaag = dagBegin(nu);
  let begin: Date;
  let eind: Date;
  let titel: string;
  if (periode === 'dag') {
    begin = plusDagen(vandaag, -terug);
    eind = plusDagen(begin, 1);
    titel = terug === 0 ? 'Vandaag' : terug === 1 ? 'Gisteren' : hoofdletter(datumTekst(begin));
  } else if (periode === 'week') {
    begin = plusDagen(vandaag, -dagVan(vandaag) - 7 * terug);
    eind = plusDagen(begin, 7);
    const laatste = plusDagen(begin, 6);
    titel =
      terug === 0
        ? 'Deze week'
        : terug === 1
          ? 'Vorige week'
          : `${begin.getDate()} ${MAANDEN_KORT[begin.getMonth()]} t/m ${laatste.getDate()} ${MAANDEN_KORT[laatste.getMonth()]}`;
  } else {
    begin = new Date(vandaag.getFullYear(), vandaag.getMonth() - terug, 1);
    eind = new Date(begin.getFullYear(), begin.getMonth() + 1, 1);
    titel = terug === 0 ? 'Deze maand' : `${hoofdletter(MAANDEN[begin.getMonth()])} ${begin.getFullYear()}`;
  }
  const dagen: Date[] = [];
  for (let d = begin; d < eind; d = plusDagen(d, 1)) dagen.push(d);
  return { periode, begin, eind, titel, dagen };
}

/** Eén staaf in de grafiek: een uur bij de dag, een dag bij week en maand */
export interface Balk {
  sleutel: string;
  /** Kort, onder de grafiek; leeg als er geen ruimte is */
  as: string;
  /** Voluit, voor de geselecteerde staaf en voor schermlezers */
  naam: string;
  /** Null: nog niet geweest of niet bekend */
  stappen: number | null;
}

export function balkenVoor(v: Venster, waarden: (number | null)[]): Balk[] {
  if (v.periode === 'dag') {
    return waarden.map((stappen, uur) => ({
      sleutel: String(uur),
      as: uur % 6 === 0 ? String(uur).padStart(2, '0') : '',
      naam: `${String(uur).padStart(2, '0')}:00 tot ${String(uur + 1).padStart(2, '0')}:00`,
      stappen,
    }));
  }
  return v.dagen.map((dag, i) => ({
    sleutel: dagSleutel(dag),
    as: v.periode === 'week' ? DAGEN_KORT[dagVan(dag)] : dag.getDate() % 7 === 1 ? String(dag.getDate()) : '',
    naam: datumTekst(dag),
    stappen: waarden[i] ?? null,
  }));
}

export interface Samenvatting {
  totaal: number;
  /** Dagen die al (deels) voorbij zijn en waarvan de stappen bekend zijn */
  dagenGeteld: number;
  gemiddeld: number;
  dagenDoel: number;
}

export function samenvatting(v: Venster, waarden: (number | null)[]): Samenvatting {
  const totaal = waarden.reduce<number>((t, w) => t + (w ?? 0), 0);
  if (v.periode === 'dag') return { totaal, dagenGeteld: 1, gemiddeld: totaal, dagenDoel: totaal >= DAGDOEL ? 1 : 0 };
  const bekend = waarden.filter((w): w is number => w !== null);
  return {
    totaal,
    dagenGeteld: bekend.length,
    gemiddeld: bekend.length ? Math.round(totaal / bekend.length) : 0,
    dagenDoel: bekend.filter((w) => w >= DAGDOEL).length,
  };
}

/** 12345 wordt "12.345" */
export function stappenTekst(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Geschatte afstand: "6,2 km" */
export function kmTekst(stappen: number): string {
  return `${((stappen * STAPLENGTE_M) / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Ronde bovenkant voor de as van de grafiek: 1.000, 2.000, 5.000, 10.000 enzovoort */
export function asMaximum(hoogste: number): number {
  const stappen = [500, 1000, 2000, 2500, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];
  return stappen.find((s) => s >= hoogste) ?? Math.ceil(hoogste / 10000) * 10000;
}

function hoofdletter(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Demo

/** Vaste reeks toevalsgetallen per dag, zodat een dag in de demo steeds dezelfde stappen houdt */
function toeval(zaad: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < zaad.length; i++) h = Math.imul(h ^ zaad.charCodeAt(i), 16777619);
  // mulberry32
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), h | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rond welk aantal stappen elk uur van de dag schommelt: ochtend- en avondrondje met de hond, lunchwandeling */
const DEMO_PATROON = [0, 0, 0, 0, 0, 0, 40, 1500, 450, 200, 180, 250, 900, 350, 200, 220, 300, 600, 500, 1700, 500, 250, 120, 30];

/** Verzonnen stappen per uur. Uren die nog moeten komen zijn null; het lopende uur telt naar rato. */
export function demoPerUur(dag: Date, nu: Date): (number | null)[] {
  const r = toeval(dagSleutel(dag));
  const weekend = dagVan(dag) >= 5 ? 1.3 : 1;
  // Sommige dagen loop je veel, andere weinig
  const dagVorm = 0.6 + r() * 0.8;
  return DEMO_PATROON.map((basis, uur) => {
    const begin = new Date(dag);
    begin.setHours(uur, 0, 0, 0);
    const deel = (nu.getTime() - begin.getTime()) / 3600000;
    if (deel <= 0) return null;
    const stappen = basis * weekend * dagVorm * (0.5 + r());
    return Math.round(stappen * Math.min(1, deel));
  });
}

/** Verzonnen stappen voor een venster: per uur bij de dag, per dag bij week en maand */
export function demoWaarden(v: Venster, nu: Date): (number | null)[] {
  if (v.periode === 'dag') return demoPerUur(v.begin, nu);
  return v.dagen.map((dag) => (dag > nu ? null : demoPerUur(dag, nu).reduce<number>((t, w) => t + (w ?? 0), 0)));
}
