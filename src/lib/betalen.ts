import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { Uitbetaling } from '../types';
import { supabase } from './supabase';

/**
 * Betalen en uitbetalen via Mollie voor echte accounts. Het werk met Mollie zelf doen de Edge Functions in
 * supabase/functions (betaling-starten, mollie-aansluiten); de app opent alleen de pagina van Mollie en leest de
 * stand uit de database. Instellen: README, Betalen met Mollie.
 */

export type Koppelstatus = 'gestart' | 'gegevens nodig' | 'in controle' | 'klaar' | null;

/** Adres in de app om na Mollie naar terug te keren: op het web woober.nl, in de app woober:// */
function appAdres(pad: string): string {
  return Platform.OS === 'web' ? `${window.location.origin}/${pad}` : Linking.createURL(pad);
}

async function functie<T>(naam: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(naam, { body });
  if (error) {
    // De functies geven een Nederlandse foutmelding terug in { fout }
    let tekst = 'Dat lukte niet. Probeer het zo nog eens.';
    try {
      const inhoud = await (error as { context?: Response }).context?.json();
      if (typeof inhoud?.fout === 'string') tekst = inhoud.fout;
    } catch {
      // Geen leesbare fout: de algemene tekst blijft staan
    }
    throw new Error(tekst);
  }
  return data as T;
}

/** Op het web gaat de hele pagina naar Mollie; in de app een los venster dat terugkeert naar de app */
async function openBijMollie(url: string, terug: string) {
  if (Platform.OS === 'web') {
    window.location.assign(url);
    return;
  }
  await WebBrowser.openAuthSessionAsync(url, terug);
}

/**
 * Betaalpagina openen voor een boeking, een extra uur oppas of een fooi; daarna komt de eigenaar terug op /betaald.
 * Een extra uur gaat pas in als Mollie meldt dat het betaald is.
 */
export async function startBetaling(boekingId: string, soort: 'boeking' | 'verlenging' | 'fooi' = 'boeking', fooi?: number) {
  const terug = appAdres(`betaald?boeking=${encodeURIComponent(boekingId)}`);
  const { url } = await functie<{ url: string }>('betaling-starten', { boekingId, soort, fooi, terug });
  await openBijMollie(url, terug);
}

/**
 * Koppelen met Mollie staat met een slotje op het verificatiescherm tot Kjell Mollie Connect heeft ingesteld (ACTIES.md).
 * Zet dit dan op true; de code eronder is klaar.
 */
export const MOLLIE_KOPPELEN_KLAAR = false;

/** Uitlater: eigen Mollie-account koppelen, zodat zijn saldo naar hem kan */
export async function koppelMollie() {
  const terug = appAdres('verificatie');
  const { url } = await functie<{ url: string }>('mollie-aansluiten', { terug });
  await openBijMollie(url, terug);
}

export async function mijnKoppeling(): Promise<Koppelstatus> {
  const { data, error } = await supabase.rpc('mijn_mollie_koppeling');
  if (error) throw new Error('De stand bij Mollie kon niet worden opgehaald.');
  return (data as Koppelstatus) ?? null;
}

export async function mijnSaldo(): Promise<number> {
  const { data, error } = await supabase.rpc('mijn_saldo');
  if (error) throw new Error('Je saldo kon niet worden opgehaald.');
  return (data as number) ?? 0;
}

export async function mijnUitbetalingen(): Promise<Uitbetaling[]> {
  // Een aanvulling van Woober na een terugboeking gaat niet van het saldo af en is geen uitbetaling
  const { data, error } = await supabase
    .from('uitbetalingen')
    .select('id, bedrag, status, aangemaakt')
    .eq('reden', 'saldo')
    .order('aangemaakt', { ascending: false })
    .limit(50);
  if (error) throw new Error('Je uitbetalingen konden niet worden opgehaald.');
  return (data ?? []).map((u) => ({
    id: u.id as string,
    bedrag: u.bedrag as number,
    tijd: new Date(u.aangemaakt as string).getTime(),
    // Aangevraagd of gerouteerd: in beide gevallen onderweg; Mollie maakt het over volgens het schema van de uitlater
    status: u.status === 'betaald' ? 'betaald' : 'onderweg',
  }));
}

export async function vraagUitbetalingAan(bedrag: number) {
  const { error } = await supabase.rpc('vraag_uitbetaling_aan', { p_bedrag: bedrag });
  if (error) throw new Error(error.message.length < 120 ? error.message : 'Uitbetalen lukte niet. Probeer het zo nog eens.');
}

/** Stand van de laatste betaling voor een boeking, na terugkomen van de betaalpagina */
export async function betaalstatus(boekingId: string): Promise<'open' | 'betaald' | 'mislukt' | null> {
  const { data, error } = await supabase.from('betalingen').select('status').eq('boeking_id', boekingId).eq('soort', 'boeking').order('aangemaakt', { ascending: false }).limit(1);
  if (error) throw new Error('De betaling kon niet worden opgehaald.');
  return (data?.[0]?.status as 'open' | 'betaald' | 'mislukt' | undefined) ?? null;
}
