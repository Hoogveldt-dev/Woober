import type { Boeking, Dienst, GebeurtenisSoort, Punt, Vervoer } from '../types';
import { lengte, puntOpPad } from './route';

/**
 * Alleen voor de demo: de andere kant (uitlater of eigenaar) wordt nagespeeld en de tijd loopt sneller,
 * zodat een wandeling van 30 minuten in een minuut te volgen is.
 * In de echte app komen posities van de telefoon van de uitlater via Supabase Realtime.
 */
export const TIJDSFACTOR = 30;
/** Een avond oppassen gaat in de demo nog sneller: 3 uur duurt dan anderhalve minuut */
export const OPPAS_TIJDSFACTOR = 120;
export const ACCEPTEER_NA_MS = 3000;
export const OVERDRACHT_NA_MS = 3500;
export const NIEUW_VERZOEK_NA_MS = 6000;

export const SNELHEID_M_PER_MIN: Record<Vervoer, number> = { lopend: 80, fiets: 250, auto: 400 };

export function simMinuten(ms: number, factor = TIJDSFACTOR): number {
  return (ms * factor) / 60000;
}

/** Tijdsfactor tijdens de wandeling of oppas zelf */
export function factorVoor(b: Pick<Boeking, 'dienst'>): number {
  return b.dienst === 'oppas' ? OPPAS_TIJDSFACTOR : TIJDSFACTOR;
}

export function reistijdMin(route: Punt[], vervoer: Vervoer): number {
  return lengte(route) / SNELHEID_M_PER_MIN[vervoer] + 1;
}

/** Voortgang van 0 tot 1 van de rit naar het ophaaladres */
export function ritVoortgang(b: Boeking, vervoer: Vervoer, nu: number): number {
  if (b.status !== 'onderweg') return b.status === 'aangekomen' || b.status === 'bezig' || b.status === 'afgerond' ? 1 : 0;
  const totaal = reistijdMin(b.routeNaarOphaal, vervoer);
  return Math.min(1, simMinuten(nu - b.statusSinds) / totaal);
}

export function resterendeRitMin(b: Boeking, vervoer: Vervoer, nu: number): number {
  const totaal = reistijdMin(b.routeNaarOphaal, vervoer);
  return Math.max(0, totaal * (1 - ritVoortgang(b, vervoer, nu)));
}

/** Voortgang van 0 tot 1 van de wandeling zelf */
export function wandelVoortgang(b: Boeking, nu: number): number {
  if (b.status === 'afgerond') return 1;
  if (b.status !== 'bezig' || !b.gestart) return 0;
  return Math.min(1, simMinuten(nu - b.gestart, factorVoor(b)) / b.duur);
}

/** Voortgang ten opzichte van de oorspronkelijk geboekte duur; bepaalt wanneer momenten en het plasrondje komen */
export function scriptVoortgang(b: Boeking, nu: number): number {
  if (!b.gestart) return 0;
  const eind = b.status === 'bezig' ? nu : (b.beeindigd ?? nu);
  return simMinuten(eind - b.gestart, factorVoor(b)) / (b.basisDuur ?? b.duur);
}

export function verstrekenMin(b: Boeking, nu: number): number {
  if (!b.gestart) return 0;
  const eind = b.beeindigd ?? nu;
  return simMinuten(eind - b.gestart, factorVoor(b));
}

/** Waar is de uitlater (of de hond) nu op de kaart? */
export function huidigePositie(b: Boeking, vervoer: Vervoer, nu: number): Punt {
  switch (b.status) {
    case 'onderweg':
      return puntOpPad(b.routeNaarOphaal, ritVoortgang(b, vervoer, nu));
    case 'aangekomen':
      return b.ophaalPunt;
    case 'bezig': {
      if (b.dienst === 'oppas') {
        const sv = scriptVoortgang(b, nu);
        return opPlasronde(sv) ? puntOpPad(b.wandelroute, plasrondeVoortgang(sv)) : b.ophaalPunt;
      }
      return puntOpPad(b.wandelroute, wandelVoortgang(b, nu));
    }
    default:
      return b.status === 'afgerond' ? b.ophaalPunt : b.startPositie;
  }
}

/** Tijdens de oppas gaat de hond halverwege even een rondje om het blok */
export const PLASRONDE = { van: 0.45, tot: 0.53 };

export function opPlasronde(v: number): boolean {
  return v >= PLASRONDE.van && v < PLASRONDE.tot;
}

/** Hoe ver het plasrondje is, van 0 tot 1 */
export function plasrondeVoortgang(v: number): number {
  return Math.max(0, Math.min(1, (v - PLASRONDE.van) / (PLASRONDE.tot - PLASRONDE.van)));
}

type ScriptItem = { bij: number; soort: GebeurtenisSoort; tekst: string; kleur?: [string, string] };

/** Wat de nagespeelde uitlater tijdens de wandeling doorgeeft aan de eigenaar */
export const WANDEL_SCRIPT: ScriptItem[] = [
  { bij: 0.1, soort: 'foto', tekst: '{hond} heeft er zin in!', kleur: ['#FFD3A5', '#FD6585'] },
  { bij: 0.27, soort: 'plas', tekst: 'Plasje gedaan' },
  { bij: 0.42, soort: 'foto', tekst: 'Snuffelen bij de vijver in het Stadspark', kleur: ['#B5E8C8', '#3FA372'] },
  { bij: 0.55, soort: 'poep', tekst: 'Poep gedaan en opgeruimd' },
  { bij: 0.68, soort: 'water', tekst: 'Even wat water gedronken' },
  { bij: 0.86, soort: 'foto', tekst: 'Op weg naar huis, moe maar voldaan', kleur: ['#C2D6FF', '#6A7FDB'] },
];

/** Wat de nagespeelde oppas doorgeeft */
export const OPPAS_SCRIPT: ScriptItem[] = [
  { bij: 0.06, soort: 'foto', tekst: '{hond} heeft het al naar de zin', kleur: ['#FBC2EB', '#C471ED'] },
  { bij: 0.2, soort: 'spelen', tekst: 'Even gespeeld met de bal' },
  { bij: 0.33, soort: 'eten', tekst: 'Eten gegeven, alles op' },
  { bij: PLASRONDE.van, soort: 'plas', tekst: 'Plasrondje om het blok' },
  { bij: 0.62, soort: 'foto', tekst: 'Samen op de bank', kleur: ['#FFD3A5', '#FD6585'] },
  { bij: 0.78, soort: 'slapen', tekst: '{hond} ligt te slapen in de mand' },
];

export function scriptVoor(dienst: Dienst): ScriptItem[] {
  return dienst === 'oppas' ? OPPAS_SCRIPT : WANDEL_SCRIPT;
}

export const OPPAS_NOTITIES = [
  'Fijne avond gehad met {hond}. Eten gehad, plasrondje gedaan en veel geknuffeld.',
  '{hond} blafte even bij de deurbel, verder super rustig. Water staat klaar.',
];

export const AFSLUITENDE_NOTITIES = [
  '{hond} was super lief en heeft goed gelopen. Water staat weer klaar.',
  'Fijne wandeling gehad! {hond} speelde even met een andere hond bij de vijver.',
  '{hond} trok in het begin wat, maar liep daarna keurig mee. Tot de volgende keer!',
];

export function maakOphaalcode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
