import { PARK_INGANG, PARK_PAD, STRATEN } from '../data/stad';
import type { Duur, Punt } from '../types';

export function afstand(a: Punt, b: Punt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function lengte(pad: Punt[]): number {
  let totaal = 0;
  for (let i = 1; i < pad.length; i++) totaal += afstand(pad[i - 1], pad[i]);
  return totaal;
}

/** Punt op een pad na een fractie (0 tot 1) van de totale lengte */
export function puntOpPad(pad: Punt[], fractie: number): Punt {
  if (pad.length === 0) return { x: 0, y: 0 };
  if (pad.length === 1 || fractie <= 0) return pad[0];
  if (fractie >= 1) return pad[pad.length - 1];
  let rest = lengte(pad) * fractie;
  for (let i = 1; i < pad.length; i++) {
    const stuk = afstand(pad[i - 1], pad[i]);
    if (rest <= stuk) {
      const t = stuk === 0 ? 0 : rest / stuk;
      return { x: pad[i - 1].x + (pad[i].x - pad[i - 1].x) * t, y: pad[i - 1].y + (pad[i].y - pad[i - 1].y) * t };
    }
    rest -= stuk;
  }
  return pad[pad.length - 1];
}

/** Het deel van een pad tot een fractie, voor het al gelopen stuk van de route */
export function deelPad(pad: Punt[], fractie: number): Punt[] {
  if (pad.length < 2 || fractie <= 0) return pad.slice(0, 1);
  if (fractie >= 1) return pad;
  let rest = lengte(pad) * fractie;
  const uit: Punt[] = [pad[0]];
  for (let i = 1; i < pad.length; i++) {
    const stuk = afstand(pad[i - 1], pad[i]);
    if (rest <= stuk) {
      uit.push(puntOpPad([pad[i - 1], pad[i]], stuk === 0 ? 0 : rest / stuk));
      return uit;
    }
    uit.push(pad[i]);
    rest -= stuk;
  }
  return uit;
}

/** Rest van het pad vanaf een fractie */
export function restPad(pad: Punt[], fractie: number): Punt[] {
  const gelopen = deelPad(pad, fractie);
  return [gelopen[gelopen.length - 1], ...pad.slice(gelopen.length - (fractie >= 1 ? 0 : 1))];
}

/** Maakt van een reeks punten een vloeiende lijn (Catmull-Rom) */
export function gladmaken(punten: Punt[], stappen = 6): Punt[] {
  if (punten.length < 3) return punten;
  const uit: Punt[] = [];
  for (let i = 0; i < punten.length - 1; i++) {
    const p0 = punten[Math.max(0, i - 1)];
    const p1 = punten[i];
    const p2 = punten[i + 1];
    const p3 = punten[Math.min(punten.length - 1, i + 2)];
    for (let s = 0; s < stappen; s++) {
      const t = s / stappen;
      const t2 = t * t;
      const t3 = t2 * t;
      uit.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  uit.push(punten[punten.length - 1]);
  return uit;
}

// Wegennet als graaf: knopen op kruisingen, kanten langs de straten.

const sleutel = (p: Punt) => `${p.x},${p.y}`;

interface Graaf {
  knopen: Map<string, Punt>;
  buren: Map<string, { naar: string; lengte: number }[]>;
  kanten: [Punt, Punt][];
}

function bouwGraaf(): Graaf {
  const knopen = new Map<string, Punt>();
  const buren = new Map<string, { naar: string; lengte: number }[]>();
  const kanten: [Punt, Punt][] = [];
  const voegToe = (a: Punt, b: Punt) => {
    const ka = sleutel(a);
    const kb = sleutel(b);
    knopen.set(ka, a);
    knopen.set(kb, b);
    const l = afstand(a, b);
    buren.set(ka, [...(buren.get(ka) ?? []), { naar: kb, lengte: l }]);
    buren.set(kb, [...(buren.get(kb) ?? []), { naar: ka, lengte: l }]);
    kanten.push([a, b]);
  };
  for (const straat of STRATEN) {
    for (let i = 1; i < straat.punten.length; i++) voegToe(straat.punten[i - 1], straat.punten[i]);
  }
  return { knopen, buren, kanten };
}

const GRAAF = bouwGraaf();

function projecteer(p: Punt, a: Punt, b: Punt): Punt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/** Dichtstbijzijnde plek op een straat */
export function opStraat(p: Punt): { punt: Punt; a: Punt; b: Punt } {
  let beste = { punt: p, a: p, b: p };
  let min = Infinity;
  for (const [a, b] of GRAAF.kanten) {
    const q = projecteer(p, a, b);
    const d = afstand(p, q);
    if (d < min) {
      min = d;
      beste = { punt: q, a, b };
    }
  }
  return beste;
}

/** Kortste route over straten van a naar b (Dijkstra) */
export function routeTussen(van: Punt, naar: Punt): Punt[] {
  const start = opStraat(van);
  const doel = opStraat(naar);

  const opZelfdeKant =
    (sleutel(start.a) === sleutel(doel.a) && sleutel(start.b) === sleutel(doel.b)) ||
    (sleutel(start.a) === sleutel(doel.b) && sleutel(start.b) === sleutel(doel.a));
  if (opZelfdeKant) return [van, start.punt, doel.punt, naar];

  const dist = new Map<string, number>();
  const vorige = new Map<string, string | null>();
  const open = new Set<string>();
  for (const k of GRAAF.knopen.keys()) {
    dist.set(k, Infinity);
    open.add(k);
  }
  dist.set(sleutel(start.a), afstand(start.punt, start.a));
  dist.set(sleutel(start.b), Math.min(dist.get(sleutel(start.b)) ?? Infinity, afstand(start.punt, start.b)));
  vorige.set(sleutel(start.a), null);
  vorige.set(sleutel(start.b), null);

  while (open.size > 0) {
    let huidige: string | null = null;
    let min = Infinity;
    for (const k of open) {
      const d = dist.get(k) ?? Infinity;
      if (d < min) {
        min = d;
        huidige = k;
      }
    }
    if (huidige === null) break;
    open.delete(huidige);
    for (const { naar: buur, lengte: l } of GRAAF.buren.get(huidige) ?? []) {
      if (!open.has(buur)) continue;
      const nieuw = min + l;
      if (nieuw < (dist.get(buur) ?? Infinity)) {
        dist.set(buur, nieuw);
        vorige.set(buur, huidige);
      }
    }
  }

  const viaA = (dist.get(sleutel(doel.a)) ?? Infinity) + afstand(doel.a, doel.punt);
  const viaB = (dist.get(sleutel(doel.b)) ?? Infinity) + afstand(doel.b, doel.punt);
  let k: string | null | undefined = viaA <= viaB ? sleutel(doel.a) : sleutel(doel.b);
  const knopen: Punt[] = [];
  while (k) {
    const p = GRAAF.knopen.get(k);
    if (p) knopen.unshift(p);
    k = vorige.get(k);
  }
  return ontdubbel([van, start.punt, ...knopen, doel.punt, naar]);
}

function ontdubbel(pad: Punt[]): Punt[] {
  return pad.filter((p, i) => i === 0 || afstand(p, pad[i - 1]) > 0.5);
}

const PARK_LUS = gladmaken(PARK_PAD, 8);

export const PARK_LUS_GLAD = PARK_LUS;

/** Wandelroute vanaf huis: naar het Stadspark, een of twee rondjes om de vijver, en terug */
export function wandelroute(thuis: Punt, duur: Duur): Punt[] {
  const heen = routeTussen(thuis, PARK_INGANG);
  const terug = [...heen].reverse();
  const rondjes = duur >= 60 ? 2 : 1;
  const lus: Punt[] = [];
  for (let i = 0; i < rondjes; i++) lus.push(...PARK_LUS);
  return ontdubbel([...heen, ...lus, ...terug]);
}

/** Middelpunt en zoom zodat alle punten in beeld zijn */
export function omvatting(punten: Punt[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of punten) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export function formatAfstand(meter: number): string {
  if (meter < 950) return `${Math.max(50, Math.round(meter / 50) * 50)} m`;
  return `${(meter / 1000).toFixed(1).replace('.', ',')} km`;
}
