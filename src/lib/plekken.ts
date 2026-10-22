import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Plek, PlekSoort } from '../types';

type MciNaam = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const PLEK_SOORTEN: Record<PlekSoort, { label: string; meervoud: string; icoon: MciNaam; kleur: string }> = {
  losloop: { label: 'Losloopgebied', meervoud: 'Losloop', icoon: 'dog-side', kleur: '#3F9C55' },
  strand: { label: 'Hondenstrand', meervoud: 'Stranden', icoon: 'beach', kleur: '#E0962B' },
  horeca: { label: 'Hondvriendelijke horeca', meervoud: 'Horeca', icoon: 'coffee', kleur: '#8B5CF6' },
};

/** Gemiddelde sterren en aantal reviews; 0 als er nog geen reviews zijn */
export function plekScore(p: Plek): { gemiddelde: number; aantal: number } {
  const aantal = p.reviews.length;
  if (aantal === 0) return { gemiddelde: 0, aantal };
  return { gemiddelde: Math.round((p.reviews.reduce((som, r) => som + r.sterren, 0) / aantal) * 10) / 10, aantal };
}

/** Maximale lengte van een review, gelijk aan de check in de database */
export const PLEK_REVIEW_MAX = 300;
