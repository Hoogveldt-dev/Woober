import type { Boeking, HuisKenmerk, OppasPlek, Plek, Punt, Voorziening } from '../types';
import { afstand } from './route';

/**
 * Oppas bij de eigenaar of bij de oppas thuis, afspraken over het huis en afgeven op een ander punt dan thuis. Dezelfde
 * regels staan in 20261101000000_oppas_en_afgeven.sql.
 */

export const HUIS_KENMERKEN: Record<HuisKenmerk, string> = { tuin: 'Omheinde tuin', huisdieren: 'Eigen huisdieren', kinderen: 'Kinderen in huis', rookvrij: 'Rookvrij' };
export const VOORZIENINGEN: Record<Voorziening, string> = { wifi: 'Wifi', koffie_thee: 'Koffie en thee', tv: 'Tv', koelkast: 'Iets uit de koelkast' };
export const OPPAS_PLEK: Record<OppasPlek, string> = { bij_eigenaar: 'Bij jou thuis', bij_oppas: 'Bij de oppas thuis' };
/** Wie honden thuis ontvangt, beschrijft het huis in minstens zoveel tekens */
export const MIN_HUIS_TEKENS = 40;

export function bijOppasThuis(b: Pick<Boeking, 'dienst' | 'oppasPlek'>): boolean {
  return b.dienst === 'oppas' && b.oppasPlek === 'bij_oppas';
}

/** Openbare plekken dichtbij om de hond af te geven: de dichtstbijzijnde plekken op de kaart */
export function afgiftePunten(plekken: Plek[], thuis: Punt, aantal = 3): Plek[] {
  return [...plekken].sort((a, b) => afstand(a.punt, thuis) - afstand(b.punt, thuis)).slice(0, aantal);
}
