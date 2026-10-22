import type { Boeking, GebeurtenisSoort, Punt, Vervoer } from '../types';
import { lengte, puntOpPad } from './route';

/**
 * Alleen voor de demo: de andere kant (uitlater of eigenaar) wordt nagespeeld en de tijd loopt sneller,
 * zodat een wandeling van 30 minuten in een minuut te volgen is.
 * In de echte app komen posities van de telefoon van de uitlater via Supabase Realtime.
 */
export const TIJDSFACTOR = 30;
export const ACCEPTEER_NA_MS = 3000;
export const OVERDRACHT_NA_MS = 3500;
export const NIEUW_VERZOEK_NA_MS = 6000;

export const SNELHEID_M_PER_MIN: Record<Vervoer, number> = { lopend: 80, fiets: 250, auto: 400 };

export function simMinuten(ms: number): number {
  return (ms * TIJDSFACTOR) / 60000;
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
  return Math.min(1, simMinuten(nu - b.gestart) / b.duur);
}

export function verstrekenMin(b: Boeking, nu: number): number {
  if (!b.gestart) return 0;
  const eind = b.beeindigd ?? nu;
  return simMinuten(eind - b.gestart);
}

/** Waar is de uitlater (of de hond) nu op de kaart? */
export function huidigePositie(b: Boeking, vervoer: Vervoer, nu: number): Punt {
  switch (b.status) {
    case 'onderweg':
      return puntOpPad(b.routeNaarOphaal, ritVoortgang(b, vervoer, nu));
    case 'aangekomen':
      return b.ophaalPunt;
    case 'bezig':
      return puntOpPad(b.wandelroute, wandelVoortgang(b, nu));
    default:
      return b.status === 'afgerond' ? b.ophaalPunt : b.startPositie;
  }
}

/** Wat de nagespeelde uitlater tijdens de wandeling doorgeeft aan de eigenaar */
export const WANDEL_SCRIPT: { bij: number; soort: GebeurtenisSoort; tekst: string; kleur?: [string, string] }[] = [
  { bij: 0.1, soort: 'foto', tekst: '{hond} heeft er zin in!', kleur: ['#FFD3A5', '#FD6585'] },
  { bij: 0.27, soort: 'plas', tekst: 'Plasje gedaan' },
  { bij: 0.42, soort: 'foto', tekst: 'Snuffelen bij de vijver in het Stadspark', kleur: ['#B5E8C8', '#3FA372'] },
  { bij: 0.55, soort: 'poep', tekst: 'Poep gedaan en opgeruimd' },
  { bij: 0.68, soort: 'water', tekst: 'Even wat water gedronken' },
  { bij: 0.86, soort: 'foto', tekst: 'Op weg naar huis, moe maar voldaan', kleur: ['#C2D6FF', '#6A7FDB'] },
];

export const AFSLUITENDE_NOTITIES = [
  '{hond} was super lief en heeft goed gelopen. Water staat weer klaar.',
  'Fijne wandeling gehad! {hond} speelde even met een andere hond bij de vijver.',
  '{hond} trok in het begin wat, maar liep daarna keurig mee. Tot de volgende keer!',
];

export function maakOphaalcode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
