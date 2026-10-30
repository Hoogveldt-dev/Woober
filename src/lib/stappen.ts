import 'expo-sqlite/localStorage/install';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import { dagBegin, dagSleutel, plusDagen, type Venster } from './fit';

/**
 * Stappen van de telefoon zelf, voor Woober Fit bij echte accounts. Alleen de iPhone houdt zelf stappen bij
 * (de bewegingssensor, de laatste 7 dagen). Android heeft daarvoor Health Connect nodig en het web kan het niet;
 * die koppelingen staan in ACTIES.md.
 *
 * De stappen blijven op het toestel: Woober bewaart de dagtotalen lokaal, zodat week en maand ook na 7 dagen
 * gevuld blijven, en stuurt ze nergens heen. Bij uitloggen en account verwijderen gaan ze weg (wisStappen).
 */

export type StappenStatus = 'niet-op-dit-toestel' | 'vragen' | 'geweigerd' | 'aan';

const OPSLAG = 'woober.fit.dagen';
/** Zo lang bewaren we dagtotalen op het toestel */
const BEWAAR_DAGEN = 400;
/** Zo ver terug kent de iPhone zelf de stappen */
const TELEFOON_DAGEN = 7;

export async function stappenStatus(): Promise<StappenStatus> {
  if (Platform.OS !== 'ios') return 'niet-op-dit-toestel';
  try {
    if (!(await Pedometer.isAvailableAsync())) return 'niet-op-dit-toestel';
    const toestemming = await Pedometer.getPermissionsAsync();
    if (toestemming.granted) return 'aan';
    return toestemming.canAskAgain ? 'vragen' : 'geweigerd';
  } catch {
    return 'niet-op-dit-toestel';
  }
}

export async function vraagToestemming(): Promise<StappenStatus> {
  try {
    const toestemming = await Pedometer.requestPermissionsAsync();
    if (toestemming.granted) return 'aan';
  } catch {
    // Valt hieronder terug op de status
  }
  return stappenStatus();
}

function leesOpslag(): Record<string, number> {
  try {
    const ruw = localStorage.getItem(OPSLAG);
    return ruw ? (JSON.parse(ruw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function schrijfOpslag(dagen: Record<string, number>, nu: Date) {
  const grens = dagSleutel(plusDagen(nu, -BEWAAR_DAGEN));
  const bewaren = Object.fromEntries(Object.entries(dagen).filter(([sleutel]) => sleutel >= grens));
  try {
    localStorage.setItem(OPSLAG, JSON.stringify(bewaren));
  } catch {
    // Zonder opslag zie je alleen de laatste 7 dagen
  }
}

export function wisStappen() {
  try {
    localStorage.removeItem(OPSLAG);
  } catch {
    // Niets bewaard
  }
}

async function stappenTussen(van: Date, tot: Date): Promise<number> {
  const { steps } = await Pedometer.getStepCountAsync(van, tot);
  return steps;
}

/**
 * Stappen voor een venster: per uur bij de dag, per dag bij week en maand. Null betekent nog niet geweest,
 * of niet meer bekend (per uur kent de iPhone alleen de laatste 7 dagen; per dag wat we eerder bewaarden).
 */
export async function telefoonWaarden(v: Venster, nu: Date): Promise<(number | null)[]> {
  const grens = plusDagen(dagBegin(nu), -(TELEFOON_DAGEN - 1));

  if (v.periode === 'dag') {
    if (v.begin < grens) return Array.from({ length: 24 }, () => null);
    return Promise.all(
      Array.from({ length: 24 }, (_, uur) => {
        const van = new Date(v.begin);
        van.setHours(uur, 0, 0, 0);
        if (van >= nu) return null;
        const tot = new Date(van);
        tot.setHours(uur + 1);
        return stappenTussen(van, tot < nu ? tot : nu);
      }),
    );
  }

  const opslag = leesOpslag();
  const waarden = await Promise.all(
    v.dagen.map(async (dag) => {
      if (dag > nu) return null;
      const sleutel = dagSleutel(dag);
      if (dag < grens) return opslag[sleutel] ?? null;
      const eind = plusDagen(dag, 1);
      const stappen = await stappenTussen(dag, eind < nu ? eind : nu);
      opslag[sleutel] = stappen;
      return stappen;
    }),
  );
  schrijfOpslag(opslag, nu);
  return waarden;
}

/** Bewaar de dagtotalen van de afgelopen 7 dagen, zodat ze in week en maand blijven staan als de iPhone ze vergeet */
export async function bewaarRecenteDagen(nu: Date): Promise<void> {
  const opslag = leesOpslag();
  for (let i = 0; i < TELEFOON_DAGEN; i++) {
    const dag = plusDagen(dagBegin(nu), -i);
    const eind = plusDagen(dag, 1);
    opslag[dagSleutel(dag)] = await stappenTussen(dag, eind < nu ? eind : nu);
  }
  schrijfOpslag(opslag, nu);
}
