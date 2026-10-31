import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { DEMO_THUIS, DEMO_UITLATER_START } from '../data/stad';
import type { Beschikbaarheid, Dienst, Gebruiker, Hond, HuisKenmerk, OppasPlek, Rol, Uitlater, Vervoer } from '../types';
import { supabase } from './supabase';

// Accounts in Supabase: inloggen met Apple, Google of een code per e-mail, en het eigen profiel, adres,
// honden en uitlaatprofiel opslaan. Boekingen, chat en de kaart lopen nog via de demo (zie PLAN.md).

WebBrowser.maybeCompleteAuthSession();

/** Adres waar Apple en Google na het inloggen naar terugsturen. Moet in Supabase bij Redirect URLs staan. */
export function terugAdres() {
  return Platform.OS === 'web' ? `${window.location.origin}/aanmelden` : Linking.createURL('auth');
}

/**
 * Inloggen met Apple staat met een slotje op het inlogscherm tot Kjell Apple heeft ingesteld (ACTIES.md, stap 1).
 * Zet dit dan op true; de code eronder is klaar.
 */
export const APPLE_INLOGGEN_KLAAR = false;

/** Gooit een fout met een Nederlandse tekst; geeft niets terug als de gebruiker zelf stopt */
export async function inloggenMetApple(): Promise<{ voornaam?: string } | null> {
  if (Platform.OS === 'ios') {
    // Op iPhone en iPad het eigen venster van Apple; de nonce voorkomt dat iemand een oud token hergebruikt
    const nonce = Crypto.randomUUID();
    const gehasht = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
    let gegevens: AppleAuthentication.AppleAuthenticationCredential;
    try {
      gegevens = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: gehasht,
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
      throw new Error('Inloggen met Apple lukte niet. Probeer het nog eens.');
    }
    if (!gegevens.identityToken) throw new Error('Apple gaf geen bewijs van inloggen terug.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: gegevens.identityToken, nonce });
    if (error) throw new Error(vertaal(error.message));
    // Apple geeft de naam alleen de allereerste keer mee
    return { voornaam: gegevens.fullName?.givenName ?? undefined };
  }
  return (await inloggenViaBrowser('apple')) ? {} : null;
}

export async function inloggenMetGoogle(): Promise<boolean> {
  return inloggenViaBrowser('google');
}

/** Op het web gaat de hele pagina naar Apple of Google; in de app een los inlogvenster. */
async function inloggenViaBrowser(provider: 'apple' | 'google'): Promise<boolean> {
  const terug = terugAdres();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: terug, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw new Error(vertaal(error.message));
  if (Platform.OS === 'web') return true;

  const uitslag = await WebBrowser.openAuthSessionAsync(data.url, terug);
  if (uitslag.type !== 'success') return false;
  const { queryParams } = Linking.parse(uitslag.url);
  if (typeof queryParams?.error_description === 'string') throw new Error(vertaal(queryParams.error_description));
  if (typeof queryParams?.code !== 'string') throw new Error('Inloggen is niet afgerond. Probeer het nog eens.');
  const { error: wisselFout } = await supabase.auth.exchangeCodeForSession(queryParams.code);
  if (wisselFout) throw new Error(vertaal(wisselFout.message));
  return true;
}

/** Stuurt een inlogcode van 6 cijfers. Ook nieuwe gebruikers krijgen zo een account. */
export async function stuurInlogcode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(vertaal(error.message));
}

export async function controleerInlogcode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error(vertaal(error.message));
}

export async function uitloggen() {
  await supabase.auth.signOut();
}

/** Verwijdert het account met alles erop en eraan (verplicht in de App Store), en logt uit */
export async function verwijderAccount() {
  const { error } = await supabase.rpc('verwijder_mijn_account');
  if (error) throw new Error(vertaal(error.message));
  await supabase.auth.signOut({ scope: 'local' });
}

/** Wat Supabase al over de ingelogde gebruiker weet, om het formulier vooraf in te vullen */
export async function bekendeGegevens(): Promise<{ email: string; voornaam: string } | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const meta = data.user.user_metadata ?? {};
  const naam: string = meta.given_name ?? meta.first_name ?? (typeof meta.full_name === 'string' ? meta.full_name.split(' ')[0] : '') ?? '';
  return { email: data.user.email ?? '', voornaam: naam };
}

export interface Account {
  gebruiker: Gebruiker;
  rol: Rol;
  honden: Hond[];
  profiel: Uitlater | null;
  /** Lid van het team; ziet het scherm Beheer. Alleen te zetten in de database. */
  beheerder: boolean;
}

/** Laadt het account van de ingelogde gebruiker; null als de aanmelding nog niet is afgemaakt */
export async function laadAccount(): Promise<Account | null> {
  const { data: sessie } = await supabase.auth.getSession();
  const user = sessie.session?.user;
  if (!user) return null;
  const [profiel, adres, honden, uitlater, beheer] = await Promise.all([
    supabase.from('profielen').select('voornaam, plaats, rol').eq('id', user.id).maybeSingle(),
    supabase.from('adressen').select('straat_huisnummer, postcode, plaats').eq('gebruiker_id', user.id).maybeSingle(),
    supabase.from('honden').select('*').eq('eigenaar_id', user.id).order('aangemaakt'),
    supabase.from('uitlaters').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('beheerders').select('gebruiker_id').eq('gebruiker_id', user.id).maybeSingle(),
  ]);
  const fout = profiel.error ?? adres.error ?? honden.error ?? uitlater.error;
  if (fout) throw new Error(vertaal(fout.message));
  if (!profiel.data) return null;
  return {
    gebruiker: {
      voornaam: profiel.data.voornaam,
      email: user.email ?? '',
      adres: adres.data?.straat_huisnummer ?? '',
      postcode: adres.data?.postcode ?? '',
      plaats: adres.data?.plaats ?? profiel.data.plaats,
      // Tot de echte kaart er is, staat iedereen op dezelfde plek in de demowijk
      thuis: DEMO_THUIS,
    },
    rol: profiel.data.rol as Rol,
    honden: (honden.data ?? []).map(naarHond),
    profiel: uitlater.data ? naarUitlater(uitlater.data, profiel.data.voornaam) : null,
    // Zonder de migratie beheer geeft deze vraag een fout; dan ben je gewoon geen beheerder
    beheerder: !beheer.error && beheer.data !== null,
  };
}

/** Maakt profiel en adres aan na het eerste inloggen */
export async function maakAccount(g: Gebruiker, rol: Rol, voorwaardenVersie: string) {
  const id = await mijnId();
  // Bewijs van akkoord met de gebruiksvoorwaarden: wanneer en welke versie
  const { error } = await supabase
    .from('profielen')
    .upsert({ id, voornaam: g.voornaam, plaats: g.plaats, rol, voorwaarden_akkoord: new Date().toISOString(), voorwaarden_versie: voorwaardenVersie.slice(0, 40) });
  if (error) throw new Error(vertaal(error.message));
  const { error: adresFout } = await supabase
    .from('adressen')
    .upsert({ gebruiker_id: id, straat_huisnummer: g.adres, postcode: normaalPostcode(g.postcode), plaats: g.plaats });
  if (adresFout) throw new Error(vertaal(adresFout.message));
  // Onder de 18: wanneer de toestemming van een ouder of voogd is bevestigd. Alleen de gebruiker zelf en Woober zien dit.
  if (g.minderjarig) {
    const { error: toestemmingFout } = await supabase.from('toestemming_ouders').upsert({ gebruiker_id: id }, { ignoreDuplicates: true });
    if (toestemmingFout) throw new Error(vertaal(toestemmingFout.message));
  }
}

export async function bewaarRol(rol: Rol) {
  const id = await mijnId();
  const { error } = await supabase.from('profielen').update({ rol }).eq('id', id);
  if (error) throw new Error(vertaal(error.message));
}

export async function bewaarHond(h: Hond) {
  const eigenaar_id = await mijnId();
  const { error } = await supabase.from('honden').upsert({
    id: h.id,
    eigenaar_id,
    naam: h.naam,
    ras: h.ras,
    geboortedatum: h.geboortedatum,
    grootte: h.grootte,
    energie: h.energie,
    aanlijnen: h.aanlijnen,
    met_honden: h.metHonden,
    karakter: h.karakter,
    bijzonderheden: h.bijzonderheden,
    dierenarts: h.dierenarts,
  });
  if (error) throw new Error(vertaal(error.message));
}

export async function verwijderHond(id: string) {
  const { error } = await supabase.from('honden').delete().eq('id', id);
  if (error) throw new Error(vertaal(error.message));
}

/**
 * Het eigen uitlaatprofiel. Verificatie zet alleen Woober, na controle.
 * Bewust geen upsert: die zet ook `id = excluded.id`, en op de kolom id heeft een gebruiker geen UPDATE-recht, dus de
 * database weigerde elke keer (permission denied). Eerst bijwerken, en bestaat de rij nog niet, aanmaken.
 */
export async function bewaarUitlaatprofiel(p: Uitlater) {
  const id = await mijnId();
  const velden = {
    leeftijd: p.leeftijd,
    wijk: p.wijk,
    bio: p.bio,
    ervaring: p.ervaring,
    professioneel: p.professioneel,
    bedrijfsnaam: p.bedrijfsnaam ?? null,
    diensten: p.diensten,
    oppas_per_uur: p.diensten.includes('oppas') ? p.oppasPerUur : 0,
    oppas_plekken: p.oppasPlekken,
    huis_omschrijving: p.huis?.omschrijving ?? '',
    huis_kenmerken: p.huis?.kenmerken ?? [],
    tarief_30: p.tarieven[30],
    tarief_45: p.tarieven[45],
    tarief_60: p.tarieven[60],
    toeslag_extra_hond: p.toeslagExtraHond,
    max_honden: p.maxHonden,
    werkgebied_km: p.werkgebiedKm,
    vervoer: p.vervoer,
    beschikbaarheid: p.beschikbaarheid,
  };
  const bijgewerkt = await supabase.from('uitlaters').update(velden).eq('id', id).select('id');
  if (bijgewerkt.error) throw new Error(vertaal(bijgewerkt.error.message));
  if (bijgewerkt.data.length > 0) return;
  const { error } = await supabase.from('uitlaters').insert({ id, ...velden });
  if (error) throw new Error(vertaal(error.message));
}

/** Nieuwe id's in de database zijn uuid's; de demo gebruikt korte namen */
export const nieuweUuid = () => Crypto.randomUUID();

async function mijnId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Je bent niet meer ingelogd. Log opnieuw in.');
  return id;
}

/** 6511ab of 6511 AB wordt 6511 AB, zoals de database verwacht */
export const normaalPostcode = (p: string) => p.replace(/\s+/g, '').toUpperCase().replace(/^(\d{4})([A-Z]{2})$/, '$1 $2');

const HOND_KLEUREN: [string, string][] = [
  ['#F6D28B', '#D8A13D'],
  ['#C9A38B', '#7A4E35'],
  ['#A7B8D9', '#5B6B9A'],
  ['#B8DBC0', '#4E8A5E'],
  ['#E8B4C8', '#A8577A'],
];

function naarHond(r: Record<string, unknown>): Hond {
  const id = String(r.id);
  const som = [...id].reduce((t, c) => t + c.charCodeAt(0), 0);
  return {
    id,
    naam: String(r.naam),
    ras: String(r.ras),
    geboortedatum: String(r.geboortedatum),
    grootte: r.grootte as Hond['grootte'],
    energie: r.energie as Hond['energie'],
    aanlijnen: r.aanlijnen as Hond['aanlijnen'],
    metHonden: r.met_honden as Hond['metHonden'],
    karakter: String(r.karakter ?? ''),
    bijzonderheden: String(r.bijzonderheden ?? ''),
    dierenarts: String(r.dierenarts ?? ''),
    kleur: HOND_KLEUREN[som % HOND_KLEUREN.length],
  };
}

function naarUitlater(r: Record<string, unknown>, voornaam: string): Uitlater {
  const diensten = r.diensten as Dienst[];
  return {
    // In de app heet het eigen profiel altijd 'ik'
    id: 'ik',
    voornaam,
    leeftijd: Number(r.leeftijd ?? 25),
    wijk: String(r.wijk ?? ''),
    bio: String(r.bio ?? ''),
    ervaring: String(r.ervaring ?? ''),
    professioneel: Boolean(r.professioneel),
    bedrijfsnaam: (r.bedrijfsnaam as string | null) ?? undefined,
    diensten,
    tarieven: { 30: Number(r.tarief_30), 45: Number(r.tarief_45), 60: Number(r.tarief_60) },
    oppasPerUur: Number(r.oppas_per_uur) || 1100,
    oppasPlekken: (r.oppas_plekken as OppasPlek[] | null) ?? ['bij_eigenaar'],
    huis: r.huis_omschrijving ? { omschrijving: String(r.huis_omschrijving), kenmerken: (r.huis_kenmerken as HuisKenmerk[] | null) ?? [] } : undefined,
    toeslagExtraHond: Number(r.toeslag_extra_hond),
    maxHonden: Number(r.max_honden),
    werkgebiedKm: Number(r.werkgebied_km),
    vervoer: r.vervoer as Vervoer,
    beschikbaarheid: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], ...(r.beschikbaarheid as Partial<Beschikbaarheid>) },
    verificatie: { identiteit: Boolean(r.identiteit_ok), uitbetaling: Boolean(r.uitbetaling_ok) },
    beoordeling: 0,
    aantalBeoordelingen: 0,
    aantalWandelingen: 0,
    reageertBinnen: '10 min',
    reviews: [],
    positie: DEMO_UITLATER_START,
    online: false,
    kleur: ['#FFB199', '#FF5A5F'],
  };
}

/** Meldingen van Supabase in gewone taal */
function vertaal(bericht: string): string {
  const m = bericht.toLowerCase();
  if (m.includes('token has expired') || (m.includes('invalid') && m.includes('otp'))) return 'Deze code klopt niet of is verlopen. Vraag een nieuwe aan.';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Even geduld: je kunt over een minuut een nieuwe code aanvragen.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Deze manier van inloggen staat nog niet aan. Gebruik voorlopig je e-mailadres.';
  if (m.includes('network') || m.includes('fetch')) return 'Geen verbinding. Controleer je internet en probeer het opnieuw.';
  if (m.includes('postcode')) return 'Vul een Nederlandse postcode in, bijv. 6511 AB.';
  if (m.includes('huis_beschreven')) return 'Beschrijf je huis in minstens 40 tekens als je honden thuis ontvangt.';
  return 'Er ging iets mis. Probeer het nog eens.';
}
