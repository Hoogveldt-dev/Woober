import type { Dienst, Moment } from '../types';
import { dagdeelVan, dagVan } from './tijd';

/**
 * Het verdienmodel van Woober. Alle knoppen waarmee Woober geld verdient staan hier op één plek, zodat de
 * overstap van gratis (lancering) naar een Uber-achtig model een kwestie van instellen is, niet van bouwen.
 *
 * In de echte app staat dit in de tabel `verdienmodellen` en kiest alleen het team welk model actief is.
 * Elke boeking bewaart het model waarmee de prijs is berekend, zodat een latere wijziging niets terugwerkt.
 */
export type VerdienmodelId = 'lancering' | 'groei' | 'volledig';

export interface Verdienmodel {
  id: VerdienmodelId;
  naam: string;
  uitleg: string;
  /** Eigenaar: servicekosten als deel van wat de uitlater vraagt (0 tot 1) */
  servicekostenPercentage: number;
  /** In centen, alleen als het percentage boven 0 ligt */
  servicekostenMinimum: number;
  servicekostenMaximum: number | null;
  /** Eigenaar: vast bedrag per boeking, zoals de booking fee bij Uber */
  boekingskosten: number;
  /** Uitlater: deel van de opbrengst dat Woober inhoudt (0 tot 1) */
  commissiePercentage: number;
  /** Hogere prijs bij veel vraag en weinig aanbod. Raakt het criterium "platform bepaalt de vergoeding"; zie PLAN.md. */
  drukte: { aan: boolean; maxFactor: number; deelUitlater: number };
  /** Abonnement voor eigenaren, zoals Uber One: lagere of geen servicekosten voor een vast bedrag per maand */
  plus: { aan: boolean; naam: string; prijsPerMaand: number; servicekostenKorting: number };
  /** Tegoed voor nieuwe eigenaren, betaald door Woober */
  welkomsttegoed: number;
  /** Tegoed voor wie iemand uitnodigt, en voor de nieuwe gebruiker */
  uitnodigingstegoed: number;
}

const PLUS = { naam: 'Woober Plus', prijsPerMaand: 499, servicekostenKorting: 1 };

export const VERDIENMODELLEN: Record<VerdienmodelId, Verdienmodel> = {
  lancering: {
    id: 'lancering',
    naam: 'Lancering',
    uitleg: 'Zonder winst om gebruikers binnen te halen: geen servicekosten en geen commissie. Uitlaters houden hun hele tarief.',
    servicekostenPercentage: 0,
    servicekostenMinimum: 0,
    servicekostenMaximum: null,
    boekingskosten: 0,
    commissiePercentage: 0,
    drukte: { aan: false, maxFactor: 1, deelUitlater: 1 },
    plus: { aan: false, ...PLUS },
    welkomsttegoed: 0,
    uitnodigingstegoed: 0,
  },
  groei: {
    id: 'groei',
    naam: 'Groei',
    uitleg: 'Kleine vergoedingen, Woober Plus voor vaste klanten en tegoed om nieuwe gebruikers te werven.',
    servicekostenPercentage: 0.05,
    servicekostenMinimum: 49,
    servicekostenMaximum: null,
    boekingskosten: 0,
    commissiePercentage: 0.1,
    drukte: { aan: false, maxFactor: 1, deelUitlater: 1 },
    plus: { aan: true, ...PLUS },
    welkomsttegoed: 500,
    uitnodigingstegoed: 500,
  },
  volledig: {
    id: 'volledig',
    naam: 'Uber-model',
    uitleg: 'Servicekosten en boekingskosten voor de eigenaar, commissie op de uitbetaling, drukte-toeslag en Woober Plus.',
    servicekostenPercentage: 0.1,
    servicekostenMinimum: 99,
    servicekostenMaximum: 500,
    boekingskosten: 49,
    commissiePercentage: 0.2,
    drukte: { aan: true, maxFactor: 1.5, deelUitlater: 0.75 },
    plus: { aan: true, ...PLUS },
    welkomsttegoed: 0,
    uitnodigingstegoed: 500,
  },
};

export const VERDIENMODEL_VOLGORDE: VerdienmodelId[] = ['lancering', 'groei', 'volledig'];

export function modelVoor(id: string): Verdienmodel {
  return VERDIENMODELLEN[id as VerdienmodelId] ?? VERDIENMODELLEN.lancering;
}

/**
 * Drukte-toeslag als factor (1 = geen toeslag). In de echte app berekent de server dit per wijk en tijdvak uit
 * openstaande aanvragen en uitlaters die online zijn (tabel `druktefactoren`). In de demo: weinig aanbod of
 * vrijdag- en zaterdagavond bij oppas, of nagebootst via het demoscherm Verdienmodel.
 */
export function drukteFactor(
  model: Verdienmodel,
  { dienst, moment, aantalOnline, nagebootst, nu }: { dienst: Dienst; moment: Moment; aantalOnline: number; nagebootst: boolean; nu: number },
): number {
  if (!model.drukte.aan) return 1;
  if (nagebootst) return model.drukte.maxFactor;
  const start = new Date(moment.type === 'later' ? moment.tijdstip : nu);
  let factor = 1;
  const weekendAvond = (dagVan(start) === 4 || dagVan(start) === 5) && dagdeelVan(start.getHours()) === 'avond';
  if (dienst === 'oppas' && weekendAvond) factor = 1.25;
  if (moment.type === 'nu' && aantalOnline < 3) factor = Math.max(factor, 1.2);
  return Math.min(model.drukte.maxFactor, Math.round(factor * 20) / 20);
}

export function procent(deel: number): string {
  return `${String(Math.round(deel * 1000) / 10).replace('.', ',')}%`;
}

export function factorTekst(factor: number): string {
  return `${String(Math.round(factor * 100) / 100).replace('.', ',')}x`;
}
