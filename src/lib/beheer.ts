import type { Betaalmethode } from '../types';
import { supabase } from './supabase';

// Alleen voor beheerders (tabel beheerders). De database controleert dat zelf; de app laat het scherm alleen zien.

export interface Planning {
  id: number;
  modelId: string;
  /** Unix-tijd in ms */
  geldigVanaf: number;
  aangekondigd: number;
  toelichting: string;
}

export interface ModelKort {
  id: string;
  naam: string;
  omschrijving: string;
  commissie: number;
}

export async function laadVerdienmodellen(): Promise<{ actief: string | null; planning: Planning[]; modellen: ModelKort[] }> {
  const [actief, planning, modellen] = await Promise.all([
    supabase.rpc('actief_verdienmodel'),
    supabase.from('verdienmodel_planning').select('*').order('geldig_vanaf', { ascending: false }).limit(20),
    supabase.from('verdienmodellen').select('id, naam, omschrijving, commissie_percentage').order('aangemaakt'),
  ]);
  const fout = actief.error ?? planning.error ?? modellen.error;
  if (fout) throw new Error(fout.message);
  return {
    actief: (actief.data as { id: string } | null)?.id ?? null,
    planning: (planning.data ?? []).map((p) => ({
      id: Number(p.id),
      modelId: String(p.model_id),
      geldigVanaf: new Date(p.geldig_vanaf).getTime(),
      aangekondigd: new Date(p.aangekondigd).getTime(),
      toelichting: String(p.toelichting ?? ''),
    })),
    modellen: (modellen.data ?? []).map((m) => ({ id: m.id, naam: m.naam, omschrijving: m.omschrijving, commissie: Number(m.commissie_percentage) })),
  };
}

/** Plant een verdienmodel in. De database weigert terugwerkende kracht en een hogere commissie binnen 15 dagen. */
export async function planVerdienmodel(modelId: string, vanaf: number, toelichting: string) {
  const { error } = await supabase.rpc('plan_verdienmodel', { p_model: modelId, p_vanaf: new Date(vanaf).toISOString(), p_toelichting: toelichting });
  // De meldingen van de database zijn al in gewone taal
  if (error) throw new Error(error.message);
}

const BEHEER_FOUT = (bericht: string) =>
  new Error(bericht.includes('Alleen voor beheerders') ? 'Alleen voor beheerders.' : bericht.includes('fetch') ? 'Geen verbinding. Probeer het opnieuw.' : bericht);

// Cijfers ------------------------------------------------------------------------------

export interface Cijfers {
  accounts: number;
  eigenaren: number;
  uitlaters: number;
  uitlaters_geverifieerd: number;
  honden: number;
  plekken: number;
  plekken_nieuw: number;
  plekreviews: number;
  meldingen_open: number;
  wachtlijst: number;
}

export async function laadCijfers(): Promise<Cijfers> {
  const { data, error } = await supabase.rpc('beheer_cijfers');
  if (error) throw BEHEER_FOUT(error.message);
  return (Array.isArray(data) ? data[0] : data) as Cijfers;
}

// Plekken en meldingen -------------------------------------------------------------------

export type PlekStatus = 'nieuw' | 'gecontroleerd' | 'verborgen';

export async function zetPlekStatus(id: string, status: PlekStatus) {
  const { error } = await supabase.from('plekken').update({ status }).eq('id', id);
  if (error) throw BEHEER_FOUT(error.message);
}

export interface PlekWijziging {
  soort: string;
  naam: string;
  omschrijving: string;
  kenmerken: string[];
  regels: string;
  plaats: string;
  lat: number;
  lng: number;
  status: PlekStatus;
}

export async function pasPlekAan(id: string, w: PlekWijziging) {
  const { error } = await supabase.from('plekken').update(w).eq('id', id);
  if (error) throw BEHEER_FOUT(error.message);
}

export async function verwijderPlekAlsBeheerder(id: string) {
  const { error } = await supabase.from('plekken').delete().eq('id', id);
  if (error) throw BEHEER_FOUT(error.message);
}

export async function verwijderReviewAlsBeheerder(id: string) {
  const { error } = await supabase.from('plek_reviews').delete().eq('id', id);
  if (error) throw BEHEER_FOUT(error.message);
}

/** Plek van Woober zelf: meteen gecontroleerd. Bestaat de naam al in die plaats, dan gebeurt er niets. */
export async function voegWooberPlekToe(p: Omit<PlekWijziging, 'status'>): Promise<string> {
  const { data, error } = await supabase.rpc('beheer_plek_toevoegen', {
    p_soort: p.soort,
    p_naam: p.naam,
    p_omschrijving: p.omschrijving,
    p_kenmerken: p.kenmerken,
    p_regels: p.regels,
    p_plaats: p.plaats,
    p_lat: p.lat,
    p_lng: p.lng,
  });
  if (error) throw BEHEER_FOUT(error.message);
  return data as string;
}

export interface Melding {
  id: string;
  reden: string;
  toelichting: string;
  status: 'open' | 'in behandeling' | 'afgehandeld';
  aangemaakt: number;
  melder: string;
  gemeld: string | null;
  plekId: string | null;
  reviewId: string | null;
  /** Tekst van de gemelde review, als die nog bestaat */
  reviewTekst: string | null;
}

/** Openstaande meldingen over plekken en reviews; meldingen over personen volgen met de echte boekingen */
export async function laadMeldingen(): Promise<Melding[]> {
  const { data, error } = await supabase
    .from('meldingen')
    .select('id, reden, toelichting, status, aangemaakt, melder_id, gemeld_id, plek_id, plek_review_id')
    .neq('status', 'afgehandeld')
    .order('aangemaakt', { ascending: false });
  if (error) throw BEHEER_FOUT(error.message);
  const rijen = data ?? [];
  const mensen = [...new Set(rijen.flatMap((r) => [r.melder_id, r.gemeld_id]).filter(Boolean))] as string[];
  const reviewIds = rijen.map((r) => r.plek_review_id).filter(Boolean) as string[];
  const [namen, reviews] = await Promise.all([
    mensen.length ? supabase.from('profielen').select('id, voornaam').in('id', mensen) : Promise.resolve({ data: [] as { id: string; voornaam: string }[] }),
    reviewIds.length ? supabase.from('plek_reviews').select('id, tekst, sterren').in('id', reviewIds) : Promise.resolve({ data: [] as { id: string; tekst: string; sterren: number }[] }),
  ]);
  const naam = new Map((namen.data ?? []).map((p) => [p.id, p.voornaam]));
  const review = new Map((reviews.data ?? []).map((r) => [r.id, `${r.sterren} ${r.sterren === 1 ? 'ster' : 'sterren'}${r.tekst ? `: ${r.tekst}` : ''}`]));
  return rijen.map((r) => ({
    id: r.id,
    reden: r.reden,
    toelichting: r.toelichting ?? '',
    status: r.status,
    aangemaakt: new Date(r.aangemaakt).getTime(),
    melder: naam.get(r.melder_id) ?? 'Iemand',
    gemeld: r.gemeld_id ? (naam.get(r.gemeld_id) ?? 'Iemand') : null,
    plekId: r.plek_id,
    reviewId: r.plek_review_id,
    reviewTekst: r.plek_review_id ? (review.get(r.plek_review_id) ?? null) : null,
  }));
}

export async function handelMeldingAf(id: string, besluit: string) {
  const { error } = await supabase.from('meldingen').update({ status: 'afgehandeld', besluit }).eq('id', id);
  if (error) throw BEHEER_FOUT(error.message);
}

/**
 * Coördinaten bij een adres of plaatsnaam, via OpenStreetMap (Nominatim). Alleen voor beheerders, voor het
 * inladen van plekken; Nominatim vraagt hooguit één verzoek per seconde. Controleer elke plek daarna op de kaart.
 */
export async function zoekLigging(vraag: string): Promise<{ lat: number; lng: number; gevonden: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(vraag)}`;
  const antwoord = await fetch(url, { headers: { 'Accept-Language': 'nl' } });
  if (!antwoord.ok) throw new Error(`Zoeken lukte niet (${antwoord.status}).`);
  const [treffer] = (await antwoord.json()) as { lat: string; lon: string; display_name: string }[];
  return treffer ? { lat: Number(treffer.lat), lng: Number(treffer.lon), gevonden: treffer.display_name } : null;
}

// Uitlaters ------------------------------------------------------------------------------

export type VerificatieStap = 'identiteit' | 'uitbetaling';

export interface UitlaterBeheer {
  id: string;
  voornaam: string;
  email: string;
  plaats: string;
  wijk: string;
  diensten: string[];
  identiteit_ok: boolean;
  uitbetaling_ok: boolean;
  /** 14 tot 18 jaar, aangemeld met toestemming van een ouder of voogd */
  minderjarig: boolean;
  aangemaakt: string;
}

export async function laadUitlaters(): Promise<UitlaterBeheer[]> {
  const { data, error } = await supabase.rpc('beheer_uitlaters');
  if (error) throw BEHEER_FOUT(error.message);
  return (data ?? []) as UitlaterBeheer[];
}

export async function zetVerificatie(uitlater: string, stap: VerificatieStap, aan: boolean) {
  const { error } = await supabase.rpc('beheer_zet_verificatie', { p_uitlater: uitlater, p_stap: stap, p_aan: aan });
  if (error) throw BEHEER_FOUT(error.message);
}

// Wachtlijst ------------------------------------------------------------------------------

export interface WachtlijstRij {
  voornaam: string;
  email: string;
  rol: 'eigenaar' | 'uitlater';
  postcode: string | null;
  plaats: string;
  aangemaakt: string;
}

export async function laadWachtlijst(): Promise<WachtlijstRij[]> {
  const { data, error } = await supabase.rpc('beheer_wachtlijst');
  if (error) throw BEHEER_FOUT(error.message);
  return (data ?? []) as WachtlijstRij[];
}

// Terugboekingen ---------------------------------------------------------------------------

/** Een betaling die een eigenaar via de bank liet terugdraaien. Woober draagt het verlies, nooit de uitlater. */
export interface Terugboeking {
  betaling_id: string;
  boeking_id: string | null;
  eigenaar: string;
  email: string | null;
  methode: Betaalmethode;
  bedrag: number;
  teruggeboekt: number;
  teruggeboekt_op: string | null;
  /** Mollie haalde het al gerouteerde geld bij de uitlater terug en Woober vulde dat aan */
  aangevuld: boolean;
  /** Andere terugboekingen van dezelfde eigenaar */
  andere: number;
  besluit: string | null;
}

export async function laadTerugboekingen(): Promise<Terugboeking[]> {
  const { data, error } = await supabase.rpc('beheer_terugboekingen');
  if (error) throw BEHEER_FOUT(error.message);
  return (data ?? []) as Terugboeking[];
}

export async function handelTerugboekingAf(betaling: string, besluit: string) {
  const { error } = await supabase.rpc('beheer_terugboeking_afhandelen', { p_betaling: betaling, p_besluit: besluit });
  if (error) throw BEHEER_FOUT(error.message);
}
