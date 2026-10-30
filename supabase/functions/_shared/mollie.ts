import { omgeving } from './http.ts';
import { euroWaarde } from './regels.ts';

/**
 * Alle aanroepen naar Mollie op één plek. Betalingen, terugbetalingen en routes gaan met de API-sleutel van het
 * marktplaatsaccount van Woober (MOLLIE_API_KEY); overboekingen met het organisatietoken (MOLLIE_ORG_TOKEN); het
 * aansluiten van uitlaters met OAuth (MOLLIE_CLIENT_ID en MOLLIE_CLIENT_SECRET).
 *
 * Controleer bij het instellen de aanroepen met een opmerking "Controleren" tegen docs.mollie.com: die site was
 * tijdens het bouwen niet bereikbaar, en Mollie moet vertraagde routing en Balance Transfers zelf voor je aanzetten.
 */

const API = 'https://api.mollie.com/v2';

export class MollieFout extends Error {
  constructor(
    public status: number,
    tekst: string,
  ) {
    super(tekst);
  }
}

async function mollie<T>(pad: string, opties: { methode?: string; body?: unknown; token?: string; sleutel?: string } = {}): Promise<T> {
  const r = await fetch(`${API}${pad}`, {
    method: opties.methode ?? 'GET',
    headers: {
      Authorization: `Bearer ${opties.token ?? omgeving('MOLLIE_API_KEY')}`,
      'Content-Type': 'application/json',
      // Zelfde sleutel bij een nieuwe poging: Mollie voert het dan maar één keer uit
      ...(opties.sleutel ? { 'Idempotency-Key': opties.sleutel } : {}),
    },
    body: opties.body === undefined ? undefined : JSON.stringify(opties.body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new MollieFout(r.status, data?.detail ?? data?.title ?? `Mollie gaf ${r.status}`);
  return data as T;
}

export interface MollieBetaling {
  id: string;
  status: string;
  amountRefunded?: { value: string };
  _links: { checkout?: { href: string } };
}

export function maakBetaling(p: { centen: number; omschrijving: string; methode: string; terug: string; webhook: string; metadata: Record<string, string> }) {
  return mollie<MollieBetaling>('/payments', {
    methode: 'POST',
    body: {
      amount: euroWaarde(p.centen),
      description: p.omschrijving,
      method: p.methode,
      redirectUrl: p.terug,
      webhookUrl: p.webhook,
      locale: 'nl_NL',
      metadata: p.metadata,
    },
  });
}

export function haalBetaling(id: string) {
  return mollie<MollieBetaling>(`/payments/${encodeURIComponent(id)}`);
}

export function terugbetalen(betaling: string, centen: number, sleutel: string) {
  return mollie<{ id: string }>(`/payments/${encodeURIComponent(betaling)}/refunds`, {
    methode: 'POST',
    body: { amount: euroWaarde(centen), description: 'Woober: terugbetaling' },
    sleutel,
  });
}

/** Controleren: vertraagde routing, een deel van een betaling naar de Mollie-organisatie van een uitlater */
export function maakRoute(betaling: string, centen: number, organisatie: string, sleutel: string) {
  return mollie<{ id: string }>(`/payments/${encodeURIComponent(betaling)}/routes`, {
    methode: 'POST',
    body: { amount: euroWaarde(centen), destination: { type: 'organization', organizationId: organisatie } },
    sleutel,
  });
}

/**
 * Controleren: Balance Transfers, van het eigen saldo van Woober naar een uitlater, voor wat Woober bijlegt (tegoed,
 * korting). Standaard maximaal 1.000 euro per maand per uitlater; de uitlater geeft er bij het aansluiten toestemming voor.
 */
export function maakOverboeking(centen: number, organisatie: string, sleutel: string) {
  return mollie<{ id: string }>('/connect/balance-transfers', {
    methode: 'POST',
    token: omgeving('MOLLIE_ORG_TOKEN'),
    body: {
      amount: euroWaarde(centen),
      description: 'Woober: saldo',
      source: { type: 'organization', id: omgeving('MOLLIE_ORG_ID') },
      destination: { type: 'organization', id: organisatie },
    },
    sleutel,
  });
}

// Aansluiten van uitlaters (OAuth) ----------------------------------------------------------

/** Wat Woober bij een uitlater mag: zien hoe ver het aansluiten is, en Balance Transfers naar hem doen */
const SCOPE = 'organizations.read onboarding.read balance-transfers.write';

export function redirectUri(): string {
  return `${omgeving('SUPABASE_URL')}/functions/v1/mollie-oauth`;
}

export function autorisatieLink(staat: string): string {
  const p = new URLSearchParams({
    client_id: omgeving('MOLLIE_CLIENT_ID'),
    redirect_uri: redirectUri(),
    state: staat,
    scope: SCOPE,
    response_type: 'code',
    approval_prompt: 'auto',
    locale: 'nl_NL',
  });
  return `https://my.mollie.com/oauth2/authorize?${p}`;
}

async function token(velden: Record<string, string>): Promise<{ access_token: string; refresh_token?: string }> {
  const r = await fetch('https://api.mollie.com/oauth2/tokens', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${omgeving('MOLLIE_CLIENT_ID')}:${omgeving('MOLLIE_CLIENT_SECRET')}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(velden),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new MollieFout(r.status, data?.error_description ?? data?.error ?? `Mollie gaf ${r.status}`);
  return data;
}

export function wisselCode(code: string) {
  return token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() });
}

export function vernieuwToken(refresh: string) {
  return token({ grant_type: 'refresh_token', refresh_token: refresh });
}

export function organisatie(toegang: string) {
  return mollie<{ id: string }>('/organizations/me', { token: toegang });
}

export function onboarding(toegang: string) {
  return mollie<{ status: string; canReceivePayments?: boolean; canReceiveSettlements?: boolean }>('/onboarding/me', { token: toegang });
}
