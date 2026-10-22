import type { Boeking } from '../types';

/** Afgeronde opdrachten van de uitlater, nieuwste eerst */
export function afgerondeOpdrachten(boekingen: Boeking[]): Boeking[] {
  return boekingen
    .filter((b) => b.mijnRol === 'uitlater' && b.status === 'afgerond' && b.soort === 'betaald')
    .sort((a, b) => (b.beeindigd ?? 0) - (a.beeindigd ?? 0));
}

export function verdiend(b: Boeking): number {
  return b.prijs.uitbetaling + b.fooi;
}

export function verdiendOp(boekingen: Boeking[], dag: Date): number {
  const begin = new Date(dag);
  begin.setHours(0, 0, 0, 0);
  const eind = begin.getTime() + 86400000;
  return afgerondeOpdrachten(boekingen)
    .filter((b) => (b.beeindigd ?? 0) >= begin.getTime() && (b.beeindigd ?? 0) < eind)
    .reduce((t, b) => t + verdiend(b), 0);
}
