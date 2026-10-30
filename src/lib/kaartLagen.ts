import type { KaartMarker, KaartRoute } from '../components/Kaart';
import { kleuren } from '../theme';
import type { Boeking, Punt, Vervoer } from '../types';
import { deelPad, puntOpPad, restPad } from './route';
import { huidigePositie, opPlasronde, PLASRONDE, plasrondeVoortgang, resterendeRitMin, ritVoortgang, scriptVoortgang, wandelVoortgang } from './simulatie';

interface Wie {
  voornaam: string;
  kleur: [string, string];
  vervoer: Vervoer;
}

/** Markers, routes en camerafocus voor één boeking, in elke fase */
export function boekingOpKaart(
  b: Boeking,
  nu: number,
  wie: Wie,
  hondKleur: [string, string],
  opties: { ophaalSoort: 'thuis' | 'klant'; toonPlan?: boolean; uitlaterAlsIk?: boolean } = { ophaalSoort: 'thuis' },
): { markers: KaartMarker[]; routes: KaartRoute[]; focus: Punt[] } {
  // Een afgiftepunt is geen huis: dan een speld met uitleg
  const ophaal: KaartMarker = b.afgifte
    ? { id: 'ophaal', soort: 'klant', punt: b.ophaalPunt, label: 'Afgeven' }
    : { id: 'ophaal', soort: opties.ophaalSoort, punt: b.ophaalPunt };
  const persoon = (punt: Punt, bubbel?: string): KaartMarker =>
    opties.uitlaterAlsIk
      ? { id: 'ik', soort: 'ik', punt }
      : { id: 'uitlater', soort: 'uitlater', punt, naam: wie.voornaam, kleur: wie.kleur, vervoer: wie.vervoer, bubbel, actief: true };

  const gebeurtenissen: KaartMarker[] = b.gebeurtenissen
    .filter((g) => g.soort !== 'start' && g.soort !== 'einde')
    .map((g) => ({ id: g.id, soort: 'gebeurtenis', gebeurtenis: g.soort, punt: puntOpPad(b.wandelroute, g.voortgang) }));

  // Oppas: de hond is thuis, behalve tijdens het plasrondje om het blok
  if (b.dienst === 'oppas' && (b.status === 'bezig' || b.status === 'afgerond') && b.wandelroute.length > 1) {
    // Na afloop alleen tonen hoe ver het plasrondje echt is gekomen
    const v = b.status === 'afgerond' ? (b.gebeurtenissen.find((g) => g.soort === 'einde')?.voortgang ?? 1) : scriptVoortgang(b, nu);
    const pv = plasrondeVoortgang(v);
    const pos = b.status === 'bezig' && opPlasronde(v) ? puntOpPad(b.wandelroute, pv) : b.ophaalPunt;
    const plas: KaartMarker[] = b.gebeurtenissen.some((g) => g.soort === 'plas')
      ? [{ id: 'plas', soort: 'gebeurtenis', gebeurtenis: 'plas', punt: puntOpPad(b.wandelroute, 0.5) }]
      : [];
    const hond: KaartMarker[] =
      b.status !== 'bezig' ? [] : opties.uitlaterAlsIk ? [{ id: 'ik', soort: 'ik', punt: pos }] : [{ id: 'hond', soort: 'hond', punt: pos, kleur: hondKleur }];
    return {
      markers: [ophaal, ...plas, ...hond],
      routes: v > PLASRONDE.van ? [{ id: 'gelopen', punten: deelPad(b.wandelroute, pv), kleur: kleuren.primair, dikte: 6 }] : [],
      focus: b.wandelroute,
    };
  }

  switch (b.status) {
    case 'onderweg': {
      const v = ritVoortgang(b, wie.vervoer, nu);
      const pos = huidigePositie(b, wie.vervoer, nu);
      const min = Math.max(1, Math.round(resterendeRitMin(b, wie.vervoer, nu)));
      return {
        markers: [ophaal, persoon(pos, `${min} min`)],
        routes: [{ id: 'rit', punten: restPad(b.routeNaarOphaal, v), kleur: kleuren.tekst, dikte: 5 }],
        focus: [pos, b.ophaalPunt],
      };
    }
    case 'aangekomen':
      return { markers: [ophaal, persoon(b.ophaalPunt)], routes: [], focus: [b.ophaalPunt] };
    case 'bezig': {
      const v = wandelVoortgang(b, nu);
      const pos = puntOpPad(b.wandelroute, v);
      const routes: KaartRoute[] = [];
      if (opties.toonPlan) routes.push({ id: 'plan', punten: restPad(b.wandelroute, v), kleur: '#9AA0A8', dikte: 4, gestippeld: true });
      routes.push({ id: 'gelopen', punten: deelPad(b.wandelroute, v), kleur: kleuren.primair, dikte: 6 });
      const hond: KaartMarker = opties.uitlaterAlsIk ? { id: 'ik', soort: 'ik', punt: pos } : { id: 'hond', soort: 'hond', punt: pos, kleur: hondKleur };
      return { markers: [ophaal, ...gebeurtenissen, hond], routes, focus: b.wandelroute };
    }
    case 'afgerond':
      if (b.soort !== 'betaald' || b.wandelroute.length === 0) return { markers: [ophaal], routes: [], focus: [b.ophaalPunt] };
    {
      // Bij een eerder beëindigde wandeling alleen het echt gelopen stuk tonen
      const gelopen = deelPad(b.wandelroute, b.gebeurtenissen.find((g) => g.soort === 'einde')?.voortgang ?? 1);
      return {
        markers: [ophaal, ...gebeurtenissen],
        routes: [{ id: 'gelopen', punten: gelopen, kleur: kleuren.primair, dikte: 6 }],
        focus: gelopen.length > 1 ? gelopen : [b.ophaalPunt],
      };
    }
    default:
      return { markers: [ophaal, persoon(b.startPositie)], routes: [], focus: [b.ophaalPunt, b.startPositie] };
  }
}
