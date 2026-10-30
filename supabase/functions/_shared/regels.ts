/**
 * Pure regels voor de koppeling met Mollie, zonder netwerk of omgevingsvariabelen, zodat ze te testen zijn met
 * `deno test supabase/functions` (zie README, Betalen met Mollie).
 */

export type OnzeStatus = 'open' | 'betaald' | 'mislukt';
export type Koppelstatus = 'gegevens nodig' | 'in controle' | 'klaar';

/** Bedrag in centen naar het formaat van Mollie: { currency: 'EUR', value: '12.50' } */
export function euroWaarde(centen: number): { currency: 'EUR'; value: string } {
  if (!Number.isInteger(centen) || centen < 0) throw new Error(`Ongeldig bedrag: ${centen}`);
  return { currency: 'EUR', value: `${Math.floor(centen / 100)}.${String(centen % 100).padStart(2, '0')}` };
}

/** '12.50' naar 1250 */
export function naarCenten(waarde: string | undefined | null): number {
  if (!waarde) return 0;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(waarde.trim());
  if (!m) throw new Error(`Ongeldig bedrag van Mollie: ${waarde}`);
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}

/** Status van een Mollie-betaling naar die in de tabel betalingen */
export function onzeStatus(mollie: string): OnzeStatus {
  if (mollie === 'paid') return 'betaald';
  if (mollie === 'failed' || mollie === 'expired' || mollie === 'canceled') return 'mislukt';
  return 'open';
}

/** Betaalmethode in Woober naar de naam bij Mollie; iDEAL | Wero heet bij Mollie nog ideal */
export const MOLLIE_METHODE = { ideal: 'ideal', applepay: 'applepay', kaart: 'creditcard' } as const;
export type Betaalmethode = keyof typeof MOLLIE_METHODE;

/** Stand van het aansluiten bij Mollie (Onboarding API) naar die in mollie_koppelingen */
export function koppelstatus(o: { status: string; canReceivePayments?: boolean; canReceiveSettlements?: boolean }): Koppelstatus {
  if (o.status === 'completed' && o.canReceiveSettlements !== false) return 'klaar';
  if (o.status === 'in-review' || o.status === 'completed') return 'in controle';
  return 'gegevens nodig';
}

/**
 * Alleen terug naar de eigen app: woober.nl (of het ingestelde APP_URL), de app zelf (woober://) en tijdens het
 * ontwikkelen Expo Go en localhost. Anders kan een betaalpagina iemand naar een vreemde site sturen.
 */
export function veiligTerugAdres(gevraagd: unknown, appUrl: string, standaard: string): string {
  if (typeof gevraagd !== 'string' || gevraagd.length > 500) return standaard;
  const toegestaan = [`${appUrl.replace(/\/$/, '')}/`, 'woober://', 'exp://', 'http://localhost:8081/'];
  return toegestaan.some((begin) => gevraagd.startsWith(begin)) ? gevraagd : standaard;
}

/** De OAuth-state bevat een willekeurig deel en het adres om naar terug te keren, zodat de app weer opent */
export function maakStaat(willekeurig: string, terug: string): string {
  return `${willekeurig}.${btoa(terug).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export function terugUitStaat(staat: string): string | null {
  const deel = staat.split('.')[1];
  if (!deel) return null;
  try {
    return atob(deel.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return null;
  }
}
