import type { NieuwePlek, Plek, PlekReview } from '../types';
import { supabase } from './supabase';

// Plekken en reviews in Supabase voor echte accounts. Zichtbaarheid regelt de database (RLS): verborgen plekken
// en reviews van geblokkeerde gebruikers komen hier niet binnen, behalve voor beheerders.

async function mijnId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function fout(bericht: string): Error {
  const m = bericht.toLowerCase();
  if (m.includes('row-level security') && m.includes('plekken')) {
    return new Error('Je kunt vandaag geen plekken meer toevoegen. Probeer het morgen nog eens.');
  }
  if (m.includes('fetch') || m.includes('network')) return new Error('Geen verbinding. Probeer het opnieuw.');
  return new Error('Er ging iets mis. Probeer het nog eens.');
}

export async function laadPlekken(): Promise<Plek[]> {
  const ik = await mijnId();
  const [plekken, reviews] = await Promise.all([
    supabase.from('plekken').select('*').order('naam'),
    supabase.from('plek_reviews').select('id, plek_id, auteur_id, sterren, tekst, gewijzigd').order('gewijzigd', { ascending: false }),
  ]);
  if (plekken.error) throw fout(plekken.error.message);
  if (reviews.error) throw fout(reviews.error.message);

  // Voornamen van schrijvers en toevoegers; profielen zijn leesbaar voor ingelogde gebruikers
  const ids = [
    ...new Set([...(reviews.data ?? []).map((r) => r.auteur_id as string), ...(plekken.data ?? []).map((p) => p.toegevoegd_door as string | null).filter(Boolean)]),
  ] as string[];
  const namen = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase.from('profielen').select('id, voornaam').in('id', ids);
    for (const p of data ?? []) namen.set(p.id, p.voornaam);
  }

  const perPlek = new Map<string, PlekReview[]>();
  for (const r of reviews.data ?? []) {
    const lijst = perPlek.get(r.plek_id) ?? [];
    lijst.push({
      id: r.id,
      van: namen.get(r.auteur_id) ?? 'Iemand',
      sterren: r.sterren,
      tekst: r.tekst ?? '',
      datum: new Date(r.gewijzigd).getTime(),
      vanMij: r.auteur_id === ik,
      auteurId: r.auteur_id,
    });
    perPlek.set(r.plek_id, lijst);
  }

  return (plekken.data ?? []).map(
    (p): Plek => ({
      id: p.id,
      soort: p.soort,
      naam: p.naam,
      // De demokaart gebruikt punt; echte plekken staan op de wereldkaart via ligging
      punt: { x: 0, y: 0 },
      ligging: { lat: p.lat, lng: p.lng },
      plaats: p.plaats,
      omschrijving: p.omschrijving ?? '',
      kenmerken: p.kenmerken ?? [],
      regels: p.regels || undefined,
      reviews: perPlek.get(p.id) ?? [],
      toegevoegdDoor: p.toegevoegd_door ? (namen.get(p.toegevoegd_door) ?? 'Iemand') : undefined,
      toegevoegdDoorId: p.toegevoegd_door ?? undefined,
      vanMij: Boolean(ik) && p.toegevoegd_door === ik,
      gecontroleerd: p.status === 'gecontroleerd',
      status: p.status,
    }),
  );
}

/** Eén review per persoon per plek: bestaat hij al, dan aanpassen */
export async function schrijfReview(plekId: string, sterren: number, tekst: string, bestaandId?: string) {
  const ik = await mijnId();
  if (!ik) throw new Error('Je bent niet meer ingelogd.');
  const { error } = bestaandId
    ? await supabase.from('plek_reviews').update({ sterren, tekst }).eq('id', bestaandId)
    : await supabase.from('plek_reviews').insert({ plek_id: plekId, auteur_id: ik, sterren, tekst });
  if (error) throw fout(error.message);
}

export async function verwijderReview(plekId: string) {
  const ik = await mijnId();
  const { error } = await supabase.from('plek_reviews').delete().eq('plek_id', plekId).eq('auteur_id', ik ?? '');
  if (error) throw fout(error.message);
}

/** Nieuwe plek van een gebruiker: meteen zichtbaar met status nieuw; een medewerker kijkt ernaar */
export async function voegPlekToe(p: NieuwePlek, plaats: string): Promise<string> {
  if (!p.ligging) throw new Error('Kies eerst een plek op de kaart.');
  const { data, error } = await supabase
    .from('plekken')
    .insert({
      soort: p.soort,
      naam: p.naam.trim(),
      omschrijving: p.omschrijving.trim(),
      kenmerken: p.kenmerken,
      regels: p.regels?.trim() ?? '',
      plaats,
      lat: p.ligging.lat,
      lng: p.ligging.lng,
    })
    .select('id')
    .single();
  if (error) throw fout(error.message);
  return data.id as string;
}

export async function verwijderPlek(id: string) {
  const { error } = await supabase.from('plekken').delete().eq('id', id);
  if (error) throw fout(error.message);
}

/** Melding over een plek of een review; altijd beoordeeld door een medewerker */
export async function meld(over: { plek?: Plek; review?: PlekReview }, reden: string) {
  const ik = await mijnId();
  if (!ik) throw new Error('Je bent niet meer ingelogd.');
  const { error } = await supabase.from('meldingen').insert({
    melder_id: ik,
    gemeld_id: over.review?.auteurId ?? over.plek?.toegevoegdDoorId ?? null,
    plek_id: over.plek?.id ?? null,
    plek_review_id: over.review?.id ?? null,
    reden,
  });
  if (error) throw fout(error.message);
}
