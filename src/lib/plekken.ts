import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Plek, PlekSoort } from '../types';

type MciNaam = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const PLEK_SOORTEN: Record<PlekSoort, { label: string; meervoud: string; icoon: MciNaam; kleur: string }> = {
  losloop: { label: 'Losloopgebied', meervoud: 'Losloop', icoon: 'dog-side', kleur: '#3F9C55' },
  strand: { label: 'Hondenstrand', meervoud: 'Stranden', icoon: 'beach', kleur: '#E0962B' },
  horeca: { label: 'Hondvriendelijke horeca', meervoud: 'Horeca', icoon: 'coffee', kleur: '#8B5CF6' },
  overig: { label: 'Andere hondvriendelijke plek', meervoud: 'Overig', icoon: 'paw', kleur: '#0E9F9A' },
};

/** Korte namen voor de soortkeuze bij het toevoegen */
export const PLEK_SOORT_KORT: Record<PlekSoort, string> = { horeca: 'Bar of café', losloop: 'Losloop', strand: 'Strand', overig: 'Anders' };

/** Kenmerken om aan te vinken bij het toevoegen van een plek */
export const PLEK_KENMERKEN: Record<PlekSoort, string[]> = {
  losloop: ['Omheind', 'Hele dag los', 'Water in de buurt', 'Poepzakjes', 'Bankjes', 'Verlicht'],
  strand: ['Hele jaar honden', 'Ondiep', 'Parkeren', 'Strandtent', 'Schaduw'],
  horeca: ['Honden binnen', 'Alleen terras', 'Waterbak', 'Hondenkoekje', 'Hondenmenu'],
  overig: ['Honden binnen', 'Waterbak', 'Hondenkoekje', 'Aanlijnen verplicht'],
};

/** Binnen deze afstand in meters vragen we of het om een plek gaat die er al is */
export const DUBBEL_BINNEN = 60;

/** Lengtes gelijk aan de checks in de database */
export const PLEK_NAAM_MAX = 80;
export const PLEK_OMSCHRIJVING_MAX = 500;
export const PLEK_REGELS_MAX = 300;

/** Gemiddelde sterren en aantal reviews; 0 als er nog geen reviews zijn */
export function plekScore(p: Plek): { gemiddelde: number; aantal: number } {
  const aantal = p.reviews.length;
  if (aantal === 0) return { gemiddelde: 0, aantal };
  return { gemiddelde: Math.round((p.reviews.reduce((som, r) => som + r.sterren, 0) / aantal) * 10) / 10, aantal };
}

/** Maximale lengte van een review, gelijk aan de check in de database */
export const PLEK_REVIEW_MAX = 300;
