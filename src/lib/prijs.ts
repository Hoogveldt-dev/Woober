import type { Boeking, Duur, PrijsOpbouw, Uitlater } from '../types';

/**
 * Verdienmodel (zie PLAN.md). De uitlater kiest zelf het tarief; Woober rekent daarbovenop
 * servicekosten aan de eigenaar en houdt commissie in op de uitbetaling. Beide percentages
 * zijn nog niet definitief en staan daarom hier op één plek.
 */
export const SERVICEKOSTEN_PERCENTAGE = 0.1;
export const SERVICEKOSTEN_MINIMUM = 99;
export const COMMISSIE_PERCENTAGE = 0.1;

/** Annuleren is gratis tot dit aantal uur voor een geplande wandeling */
export const GRATIS_ANNULEREN_UUR = 2;
/** Daarna, of als de uitlater al onderweg is, krijgt de uitlater dit deel van het tarief */
export const ANNULERINGSDEEL = 0.5;

export const DUREN: Duur[] = [30, 45, 60];

export function berekenPrijs(uitlater: Pick<Uitlater, 'tarieven' | 'toeslagExtraHond'>, duur: Duur, aantalHonden: number): PrijsOpbouw {
  const tarief = uitlater.tarieven[duur];
  const toeslag = Math.max(0, aantalHonden - 1) * uitlater.toeslagExtraHond;
  const basis = tarief + toeslag;
  const servicekosten = Math.max(SERVICEKOSTEN_MINIMUM, Math.round(basis * SERVICEKOSTEN_PERCENTAGE));
  const commissie = Math.round(basis * COMMISSIE_PERCENTAGE);
  return { tarief, toeslag, servicekosten, totaal: basis + servicekosten, commissie, uitbetaling: basis - commissie };
}

export const GRATIS: PrijsOpbouw = { tarief: 0, toeslag: 0, servicekosten: 0, totaal: 0, commissie: 0, uitbetaling: 0 };

/** Kosten als de eigenaar nu annuleert */
export function annuleringskosten(b: Boeking, nu: number): number {
  if (b.soort === 'kennismaking') return 0;
  if (b.status === 'aangevraagd') return 0;
  if (b.status === 'gepland' && b.moment.type === 'later') {
    const urenTot = (b.moment.tijdstip - nu) / 3600000;
    if (urenTot >= GRATIS_ANNULEREN_UUR) return 0;
  }
  return Math.round((b.prijs.tarief + b.prijs.toeslag) * ANNULERINGSDEEL);
}

export function euro(centen: number): string {
  const teken = centen < 0 ? '-' : '';
  const abs = Math.abs(Math.round(centen));
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${teken}€${euros.toLocaleString('nl-NL')},${rest}`;
}

/** Korte vorm zonder centen als dat kan: €12 of €12,50 */
export function euroKort(centen: number): string {
  return centen % 100 === 0 ? `€${centen / 100}` : euro(centen);
}
