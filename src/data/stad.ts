import type { Punt } from '../types';

/**
 * Een verzonnen wijk als demokaart, losjes gebaseerd op een Nederlandse stad aan de rivier.
 * 1 eenheid is 1 meter. Echte accounts gebruiken de echte kaart (EchteKaart met Leaflet en PDOK).
 */

export const XS = [70, 250, 460, 640, 900];
export const YS = [200, 400, 570, 760, 970, 1170, 1340];

export interface Straat {
  naam: string;
  punten: Punt[];
  hoofdweg?: boolean;
}

const horizontaal = (naam: string, j: number, van: number, tot: number, hoofdweg?: boolean): Straat => ({
  naam,
  punten: XS.slice(van, tot + 1).map((x) => ({ x, y: YS[j] })),
  hoofdweg,
});

const verticaal = (naam: string, i: number, van: number, tot: number, hoofdweg?: boolean): Straat => ({
  naam,
  punten: YS.slice(van, tot + 1).map((y) => ({ x: XS[i], y })),
  hoofdweg,
});

export const STRATEN: Straat[] = [
  horizontaal('Waalkade', 0, 0, 4, true),
  horizontaal('Lindenlaan', 1, 0, 4),
  horizontaal('Molenstraat', 2, 0, 4),
  horizontaal('Parkweg', 3, 0, 4, true),
  horizontaal('Kastanjelaan', 4, 0, 2),
  horizontaal('Beukenlaan', 5, 0, 4),
  horizontaal('Iepenlaan', 6, 0, 4),
  verticaal('Dijkstraat', 0, 0, 6),
  verticaal('Kerkstraat', 1, 0, 6),
  verticaal('Stationsweg', 2, 0, 6, true),
  verticaal('Esdoornstraat', 3, 0, 3),
  verticaal('Esdoornstraat', 3, 5, 6),
  verticaal('Oosterweg', 4, 0, 6),
];

/** Stadspark tussen Parkweg, Beukenlaan, Stationsweg en Oosterweg */
export const PARK = { x1: 460, y1: 760, x2: 900, y2: 1170 };
export const VIJVER = { cx: 690, cy: 970, rx: 78, ry: 46 };
export const LOSLOOPGEBIED = { x1: 760, y1: 776, x2: 884, y2: 900 };

/** Ingang van het park aan de Parkweg; hier begint en eindigt het wandelrondje */
export const PARK_INGANG: Punt = { x: 640, y: 760 };

/** Wandelpad rond de vijver, met de klok mee, van en naar de ingang */
export const PARK_PAD: Punt[] = [
  { x: 640, y: 760 },
  { x: 642, y: 805 },
  { x: 740, y: 812 },
  { x: 835, y: 850 },
  { x: 862, y: 955 },
  { x: 835, y: 1080 },
  { x: 725, y: 1132 },
  { x: 600, y: 1130 },
  { x: 515, y: 1075 },
  { x: 500, y: 965 },
  { x: 530, y: 860 },
  { x: 600, y: 812 },
  { x: 642, y: 805 },
  { x: 640, y: 760 },
];

/** Korte paadjes van de andere ingangen naar het rondje, alleen voor de tekening */
export const PARK_ZIJPADEN: Punt[][] = [
  [
    { x: 460, y: 970 },
    { x: 500, y: 965 },
  ],
  [
    { x: 640, y: 1170 },
    { x: 640, y: 1131 },
  ],
];

export const RIVIER_RAND = 128;
export const UITERWAARD_RAND = 182;

/** Vaste demo-adressen */
export const DEMO_THUIS: Punt = { x: 355, y: 570 };
export const DEMO_ADRES = 'Molenstraat 24';
export const DEMO_UITLATER_START: Punt = { x: 250, y: 690 };
