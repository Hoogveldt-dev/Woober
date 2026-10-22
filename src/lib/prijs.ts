import type { Boeking, Dienst, OppasDuur, PrijsOpbouw, Uitlater, WandelDuur } from '../types';
import type { Verdienmodel } from './verdienmodel';

/**
 * Prijsberekening. De uitlater kiest zelf het tarief; wat Woober daarbovenop rekent of inhoudt staat in het
 * actieve verdienmodel (src/lib/verdienmodel.ts). Dezelfde regels staan in bereken_prijs() in de migratie.
 */

/** Annuleren is gratis tot dit aantal uur voor een geplande wandeling */
export const GRATIS_ANNULEREN_UUR = 2;
/** Daarna, of als de uitlater al onderweg is, krijgt de uitlater dit deel van het tarief */
export const ANNULERINGSDEEL = 0.5;

export const DUREN: WandelDuur[] = [30, 45, 60];
export const OPPAS_DUREN: OppasDuur[] = [120, 180, 240, 300];
/** Verlengen van oppas gaat per uur */
export const VERLENG_MINUTEN = 60;

/** Tarief van de uitlater zelf, zonder toeslag: per wandelduur, of uurtarief maal aantal uren bij oppas */
export function tariefVoor(uitlater: Pick<Uitlater, 'tarieven' | 'oppasPerUur'>, dienst: Dienst, duur: number): number {
  if (dienst === 'oppas') return Math.round((uitlater.oppasPerUur * duur) / 60);
  return uitlater.tarieven[duur as WandelDuur] ?? 0;
}

/**
 * Deel van een bedrag in hele centen. Rekent met de breuk in tienduizendsten, zodat de afronding gelijk is aan
 * round() op numeric in Postgres en de app nooit een cent anders uitkomt dan de database.
 */
export function deel(bedrag: number, breuk: number): number {
  return Math.round((bedrag * Math.round(breuk * 10000)) / 10000);
}

export interface PrijsExtra {
  /** Drukte-factor, 1 = geen drukte */
  drukteFactor?: number;
  /** Eigenaar heeft het abonnement (Woober Plus) */
  plus?: boolean;
  /** Beschikbaar tegoed van de eigenaar; wordt als korting gebruikt tot het totaal */
  tegoed?: number;
}

export function berekenPrijs(
  uitlater: Pick<Uitlater, 'tarieven' | 'oppasPerUur' | 'toeslagExtraHond'>,
  dienst: Dienst,
  duur: number,
  aantalHonden: number,
  model: Verdienmodel,
  extra: PrijsExtra = {},
): PrijsOpbouw {
  const tarief = tariefVoor(uitlater, dienst, duur);
  const toeslag = Math.max(0, aantalHonden - 1) * uitlater.toeslagExtraHond;
  const basis = tarief + toeslag;

  const drukteFactor = model.drukte.aan ? Math.max(1, Math.min(model.drukte.maxFactor, extra.drukteFactor ?? 1)) : 1;
  const drukte = deel(basis, drukteFactor - 1);
  const drukteUitlater = deel(drukte, model.drukte.deelUitlater);

  let servicekosten = 0;
  const metPlus = Boolean(extra.plus) && model.plus.aan && model.servicekostenPercentage > 0;
  if (model.servicekostenPercentage > 0) {
    servicekosten = Math.max(model.servicekostenMinimum, deel(basis + drukte, model.servicekostenPercentage));
    if (model.servicekostenMaximum !== null) servicekosten = Math.min(model.servicekostenMaximum, servicekosten);
    if (metPlus) servicekosten = deel(servicekosten, 1 - model.plus.servicekostenKorting);
  }
  const boekingskosten = model.boekingskosten;

  const zonderKorting = basis + drukte + servicekosten + boekingskosten;
  const korting = Math.max(0, Math.min(extra.tegoed ?? 0, zonderKorting));
  const totaal = zonderKorting - korting;

  const commissie = deel(basis + drukteUitlater, model.commissiePercentage);
  const uitbetaling = basis + drukteUitlater - commissie;
  return {
    modelId: model.id,
    tarief,
    toeslag,
    drukteFactor,
    drukte,
    drukteUitlater,
    servicekosten,
    plus: metPlus,
    boekingskosten,
    korting,
    totaal,
    commissie,
    uitbetaling,
    platform: totaal - uitbetaling,
  };
}

/** Prijs van een gratis kennismaking */
export const GRATIS: PrijsOpbouw = {
  modelId: 'kennismaking',
  tarief: 0,
  toeslag: 0,
  drukteFactor: 1,
  drukte: 0,
  drukteUitlater: 0,
  servicekosten: 0,
  plus: false,
  boekingskosten: 0,
  korting: 0,
  totaal: 0,
  commissie: 0,
  uitbetaling: 0,
  platform: 0,
};

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
