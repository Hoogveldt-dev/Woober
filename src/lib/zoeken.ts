import type { BoekConcept, Dienst, Moment, PrijsOpbouw, Punt, Uitlater } from '../types';
import { lengte, routeTussen } from './route';
import { reistijdMin } from './simulatie';
import { dagdeelVan, dagVan } from './tijd';

export interface UitlaterOptie {
  u: Uitlater;
  etaMin: number;
  afstandM: number;
  beschikbaar: boolean;
  reden?: string;
  prijs: PrijsOpbouw;
  bekend: boolean;
}

export type Sortering = 'afstand' | 'beoordeling' | 'prijs';

function beschikbaarOp(u: Uitlater, concept: BoekConcept): string | null {
  const m = concept.moment;
  if (m.type === 'nu') return u.online ? null : 'Nu niet online';
  if (m.type === 'later') {
    const d = new Date(m.tijdstip);
    return u.beschikbaarheid[dagVan(d)].includes(dagdeelVan(d.getHours())) ? null : 'Niet beschikbaar op dit moment';
  }
  const uur = Number(m.tijd.split(':')[0]);
  return m.dagen.every((dag) => u.beschikbaarheid[dag].includes(dagdeelVan(uur))) ? null : 'Niet op al deze dagen beschikbaar';
}

/**
 * Lijst van uitlaters voor een boeking. De eigenaar kiest zelf; Woober sorteert alleen op wat de eigenaar kiest
 * (afstand, beoordeling of prijs) en verdeelt geen opdrachten.
 */
type PrijsFunctie = (u: Uitlater, dienst: Dienst, duur: number, aantalHonden: number, moment: Moment) => PrijsOpbouw;

export function uitlaterOpties(
  uitlaters: Uitlater[],
  thuis: Punt,
  concept: BoekConcept,
  bekend: string[],
  geblokkeerd: string[],
  sortering: Sortering,
  /** Prijs volgens het actieve verdienmodel */
  prijsVoor: PrijsFunctie,
): UitlaterOptie[] {
  const lijst = uitlaters
    // Andere selectie per dienst, zoals ritsoorten bij Uber: alleen wie deze dienst aanbiedt
    .filter((u) => !geblokkeerd.includes(u.id) && u.diensten.includes(concept.dienst))
    .map((u): UitlaterOptie => {
      const route = routeTussen(u.positie, thuis);
      const afstandM = lengte(route);
      let reden = beschikbaarOp(u, concept);
      if (!reden && u.maxHonden < concept.hondIds.length) reden = `Neemt maximaal ${u.maxHonden} ${u.maxHonden === 1 ? 'hond' : 'honden'} mee`;
      if (!reden && afstandM > u.werkgebiedKm * 1000) reden = 'Buiten het werkgebied';
      return {
        u,
        etaMin: Math.round(reistijdMin(route, u.vervoer)),
        afstandM,
        beschikbaar: reden === null,
        reden: reden ?? undefined,
        prijs: prijsVoor(u, concept.dienst, concept.duur, Math.max(1, concept.hondIds.length), concept.moment),
        bekend: bekend.includes(u.id),
      };
    });
  const vergelijk: Record<Sortering, (a: UitlaterOptie, b: UitlaterOptie) => number> = {
    afstand: (a, b) => a.afstandM - b.afstandM,
    beoordeling: (a, b) => b.u.beoordeling - a.u.beoordeling || b.u.aantalBeoordelingen - a.u.aantalBeoordelingen,
    prijs: (a, b) => a.prijs.totaal - b.prijs.totaal,
  };
  return lijst.sort((a, b) => Number(b.beschikbaar) - Number(a.beschikbaar) || vergelijk[sortering](a, b));
}
