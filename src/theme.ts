/** Zelfde basis als Woofer, zodat beide apps één huisstijl delen. Woober-aanvullingen staan onderaan. */
export const kleuren = {
  primair: '#FF4F6E',
  primairDonker: '#E23A5A',
  verloop: ['#FF5A5F', '#FF8A3D'] as const,
  achtergrond: '#FFFFFF',
  vlak: '#F5F5F7',
  tekst: '#18181B',
  gedempt: '#71717A',
  rand: '#E4E4E7',
  like: '#1FC77A',
  nope: '#FF4458',
  waarschuwing: '#F59E0B',
  waarschuwingVlak: '#FFF7E6',
  foutVlak: '#FFECEF',
  goedVlak: '#E9FAF2',
  info: '#3B82F6',

  // Woober
  primairVlak: '#FFF0F3',
  ster: '#FFB400',
  locatie: '#2F80ED',
};

/** Kleuren van de demokaart, in de stijl van een rustige navigatiekaart */
export const kaartKleuren = {
  land: '#EEF0F3',
  blok: '#E2E5EA',
  weg: '#FFFFFF',
  wegRand: '#D5D9DF',
  park: '#CBEACF',
  parkPad: '#E9F6EA',
  losloop: '#B2DFB8',
  water: '#BBD9F2',
  label: '#8B919B',
};

export const radius = { klein: 8, midden: 14, groot: 22, rond: 999 };

export const ruimte = (n: number) => n * 4;

export const schaduw = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
} as const;
