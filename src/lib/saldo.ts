import type { Boeking, Uitbetaling } from '../types';
import { euro } from './prijs';
import { afgerondeOpdrachten, verdiend } from './verdiensten';

/**
 * Saldo van een uitlater (de wallet). Wat je verdient blijft staan tot je het zelf laat uitbetalen, in één keer in
 * plaats van na elke wandeling. Je kunt het ook gebruiken om als eigenaar zelf een uitlater of oppas te betalen.
 * Het geld blijft bij Mollie, niet bij Woober: het saldo is wat nog niet naar de uitlater is gerouteerd (vertraagde
 * routing). Zie PLAN.md, Betalen met Mollie Connect.
 * Dezelfde regels staan in saldo_van() en vraag_uitbetaling_aan() in supabase/migrations/20261030000000_saldo.sql.
 */

/** Minimaal uit te betalen, zodat er geen kleine overboekingen nodig zijn. Je hele saldo kan altijd. */
export const MIN_UITBETALING = 1000;
/** Wat zo lang op het saldo staat, maakt Woober automatisch over: ruim voor de 90 dagen waarna Mollie ongerouteerd geld
 * zelf naar Woober zet. Zelfde grens als maak_automatische_uitbetalingen() in 20261031000000_mollie.sql. */
export const UITBETAAL_DAGEN = 80;

const LOPEND_OF_KLAAR: Boeking['status'][] = ['aangevraagd', 'gepland', 'onderweg', 'aangekomen', 'bezig', 'afgerond'];

/** Annuleringskosten die een eigenaar betaalde voor een opdracht van jou, als uitlater */
function annuleringVoorMij(b: Boeking): number {
  return b.mijnRol === 'uitlater' && b.status === 'geannuleerd' && b.geannuleerdDoor !== 'uitlater' ? (b.annuleringskosten ?? 0) : 0;
}

/** Betaald of gereserveerd met saldo voor je eigen boekingen als eigenaar; bij annuleren komt het terug */
function besteedMetSaldo(b: Boeking): number {
  return b.mijnRol === 'eigenaar' && LOPEND_OF_KLAAR.includes(b.status) ? (b.metSaldo ?? 0) : 0;
}

export function saldoVan(boekingen: Boeking[], uitbetalingen: Uitbetaling[]): number {
  const erbij = afgerondeOpdrachten(boekingen).reduce((t, b) => t + verdiend(b), 0) + boekingen.reduce((t, b) => t + annuleringVoorMij(b), 0);
  const eraf = boekingen.reduce((t, b) => t + besteedMetSaldo(b), 0) + uitbetalingen.reduce((t, u) => t + u.bedrag, 0);
  return erbij - eraf;
}

/** Foutmelding als dit bedrag nu niet uitbetaald kan worden, anders null */
export function uitbetalingFout(bedrag: number, saldo: number): string | null {
  if (!Number.isInteger(bedrag) || bedrag <= 0) return 'Vul een bedrag in.';
  if (bedrag > saldo) return `Er staat ${euro(saldo)} op je saldo.`;
  if (bedrag < MIN_UITBETALING && bedrag !== saldo) return `Uitbetalen kan vanaf ${euro(MIN_UITBETALING)}, of je hele saldo in één keer.`;
  return null;
}

export interface Mutatie {
  id: string;
  tijd: number;
  tekst: string;
  /** Positief erbij, negatief eraf */
  bedrag: number;
}

/** Alles wat er op je saldo bij- en afging, nieuwste eerst */
export function mutaties(boekingen: Boeking[], uitbetalingen: Uitbetaling[], naamVan: (b: Boeking) => string): Mutatie[] {
  const lijst: Mutatie[] = [
    ...afgerondeOpdrachten(boekingen).map((b) => ({
      id: b.id,
      tijd: b.beeindigd ?? b.statusSinds,
      tekst: `${b.dienst === 'oppas' ? 'Oppas' : 'Wandeling'} met ${naamVan(b)}${b.fooi ? ', met fooi' : ''}`,
      bedrag: verdiend(b),
    })),
    ...boekingen
      .filter((b) => annuleringVoorMij(b) > 0)
      .map((b) => ({ id: `a-${b.id}`, tijd: b.statusSinds, tekst: `Annuleringskosten van ${naamVan(b)}`, bedrag: annuleringVoorMij(b) })),
    ...boekingen
      .filter((b) => besteedMetSaldo(b) > 0)
      .map((b) => ({ id: `s-${b.id}`, tijd: b.aangemaakt, tekst: `Betaald voor je eigen boeking bij ${naamVan(b)}`, bedrag: -besteedMetSaldo(b) })),
    ...uitbetalingen.map((u) => ({ id: u.id, tijd: u.tijd, tekst: u.status === 'onderweg' ? 'Uitbetaling, onderweg naar je rekening' : 'Uitbetaald naar je rekening', bedrag: -u.bedrag })),
  ];
  return lijst.sort((a, b) => b.tijd - a.tijd);
}
