import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AUTO_ANTWOORDEN_KLANT, AUTO_ANTWOORDEN_UITLATER, DEMO_EIGEN_HONDEN, DEMO_KLANTEN } from '../data/honden';
import { DEMO_ADRES, DEMO_THUIS, DEMO_UITLATER_START } from '../data/stad';
import { DEMO_BEKEND, maakDemoUitlaters } from '../data/uitlaters';
import { annuleringskosten, berekenPrijs, GRATIS } from '../lib/prijs';
import { routeTussen, wandelroute } from '../lib/route';
import {
  ACCEPTEER_NA_MS,
  AFSLUITENDE_NOTITIES,
  maakOphaalcode,
  NIEUW_VERZOEK_NA_MS,
  OVERDRACHT_NA_MS,
  ritVoortgang,
  TIJDSFACTOR,
  WANDEL_SCRIPT,
  wandelVoortgang,
} from '../lib/simulatie';
import { tijdstipOp, volgendeKeer } from '../lib/tijd';
import type {
  AppMelding,
  Beoordeling,
  Betaalmethode,
  BoekConcept,
  Boeking,
  Duur,
  GebeurtenisSoort,
  Gebruiker,
  Gesprek,
  Hond,
  Klant,
  Moment,
  Punt,
  Rol,
  Serie,
  Sleutel,
  Uitlater,
  Verificatie,
} from '../types';

export const LOPEND: Boeking['status'][] = ['onderweg', 'aangekomen', 'bezig'];
export const ACTIEF: Boeking['status'][] = ['aangevraagd', ...LOPEND];

interface AppState {
  gebruiker: Gebruiker | null;
  rol: Rol;
  honden: Hond[];
  mijnProfiel: Uitlater | null;
  online: boolean;
  uitlaters: Uitlater[];
  bekend: string[];
  boekingen: Boeking[];
  series: Serie[];
  gesprekken: Gesprek[];
  meldingen: AppMelding[];
  geblokkeerd: string[];
  gemeld: string[];
  betaalmethode: Betaalmethode;
  concept: BoekConcept | null;
}

export interface Aanvraag {
  uitlaterId: string;
  hondIds: string[];
  duur: Duur;
  moment: Moment;
  sleutel: Sleutel;
  notitie: string;
  betaalmethode: Betaalmethode;
}

interface AppActies {
  aanmelden: (g: Gebruiker, rol: Rol) => void;
  demoStart: (rol: Rol) => void;
  bewaarHond: (h: Hond) => void;
  verwijderHond: (id: string) => void;
  wisselRol: (r: Rol) => void;
  bewaarProfiel: (p: Uitlater) => void;
  verifieer: (stap: keyof Verificatie) => void;
  zetOnline: (aan: boolean) => void;
  zetConcept: (c: BoekConcept | null) => void;
  zetBetaalmethode: (m: Betaalmethode) => void;
  vraagAan: (a: Aanvraag) => string;
  vraagKennismakingAan: (uitlaterId: string, tijdstip: number, bericht: string) => string;
  annuleer: (id: string) => void;
  startNu: (id: string) => void;
  versnel: (id: string) => void;
  rondKennismakingAf: (id: string) => void;
  geefFooi: (id: string, centen: number) => void;
  beoordeel: (id: string, b: Beoordeling) => void;
  stopSerie: (id: string) => void;
  accepteer: (id: string) => void;
  weiger: (id: string) => void;
  ikBenEr: (id: string) => void;
  startWandeling: (id: string, code: string) => boolean;
  voegToe: (id: string, soort: GebeurtenisSoort, tekst?: string) => void;
  beeindig: (id: string) => void;
  stuurBericht: (metId: string, rol: Rol, tekst: string) => void;
  blokkeer: (id: string) => void;
  meld: (id: string, reden: string) => void;
  sluitMelding: (id: string) => void;
  accountVerwijderen: () => void;

  uitlater: (id: string) => Uitlater | undefined;
  klant: (id: string | undefined) => Klant | undefined;
  hondenVan: (b: Boeking) => Hond[];
  /** De lopende of aangevraagde wandeling van de eigenaar */
  actieveBoeking: Boeking | undefined;
  /** Het openstaande verzoek in uitlatermodus */
  openVerzoek: Boeking | undefined;
  /** De opdracht waar de uitlater nu mee bezig is */
  actieveOpdracht: Boeking | undefined;
}

type Context = AppState & AppActies;

const AppContext = createContext<Context | null>(null);

let teller = 0;
export const nieuwId = (prefix: string) => `${prefix}-${Date.now()}-${++teller}`;

const LEEG: AppState = {
  gebruiker: null,
  rol: 'eigenaar',
  honden: [],
  mijnProfiel: null,
  online: false,
  uitlaters: maakDemoUitlaters(),
  bekend: [],
  boekingen: [],
  series: [],
  gesprekken: [],
  meldingen: [],
  geblokkeerd: [],
  gemeld: [],
  betaalmethode: 'ideal',
  concept: null,
};

export function standaardProfiel(voornaam: string): Uitlater {
  return {
    id: 'ik',
    voornaam,
    leeftijd: 25,
    wijk: 'Lindenkwartier',
    bio: '',
    ervaring: '',
    professioneel: false,
    tarieven: { 30: 1200, 45: 1600, 60: 1900 },
    toeslagExtraHond: 500,
    maxHonden: 2,
    werkgebiedKm: 3,
    vervoer: 'fiets',
    beschikbaarheid: { 0: ['middag'], 1: ['middag'], 2: ['middag'], 3: ['middag'], 4: ['middag'], 5: [], 6: [] },
    verificatie: { identiteit: false, verzekering: false, uitbetaling: false, vog: false },
    beoordeling: 0,
    aantalBeoordelingen: 0,
    aantalWandelingen: 0,
    reageertBinnen: '10 min',
    reviews: [],
    positie: DEMO_UITLATER_START,
    online: false,
    kleur: ['#FFB199', '#FF5A5F'],
  };
}

function basisBoeking(deel: Partial<Boeking> & Pick<Boeking, 'mijnRol' | 'uitlaterId' | 'hondIds' | 'ophaalPunt' | 'adres'>): Boeking {
  const nu = Date.now();
  return {
    id: nieuwId('b'),
    soort: 'wandeling',
    duur: 30,
    moment: { type: 'nu' },
    sleutel: 'thuis',
    notitie: '',
    betaalmethode: 'ideal',
    prijs: GRATIS,
    fooi: 0,
    status: 'aangevraagd',
    statusSinds: nu,
    aangemaakt: nu,
    ophaalcode: maakOphaalcode(),
    startPositie: deel.ophaalPunt,
    routeNaarOphaal: [],
    wandelroute: [],
    gebeurtenissen: [],
    scriptStap: 0,
    ...deel,
  };
}

/** Een afgeronde wandeling in het verleden, met volledige route en gebeurtenissen */
function historie(deel: Parameters<typeof basisBoeking>[0], dagenGeleden: number, uur: number): Boeking {
  const b = basisBoeking(deel);
  const start = new Date(Date.now() - dagenGeleden * 86400000);
  start.setHours(uur, 0, 0, 0);
  const route = b.soort === 'wandeling' ? wandelroute(b.ophaalPunt, b.duur) : [];
  return {
    ...b,
    status: 'afgerond',
    moment: { type: 'later', tijdstip: start.getTime() },
    aangemaakt: start.getTime() - 86400000,
    statusSinds: start.getTime(),
    gestart: start.getTime(),
    beeindigd: start.getTime() + (b.soort === 'wandeling' ? b.duur * 60000 : 15 * 60000),
    wandelroute: route,
    scriptStap: WANDEL_SCRIPT.length,
    gebeurtenissen:
      b.soort === 'wandeling'
        ? [
            { id: nieuwId('g'), soort: 'start', tijd: start.getTime(), voortgang: 0 },
            ...WANDEL_SCRIPT.map((s) => ({
              id: nieuwId('g'),
              soort: s.soort,
              tijd: start.getTime() + s.bij * b.duur * 60000,
              voortgang: s.bij,
              tekst: s.tekst,
              kleur: s.kleur,
            })),
            { id: nieuwId('g'), soort: 'einde', tijd: start.getTime() + b.duur * 60000, voortgang: 1, tekst: deel.notitie || undefined },
          ]
        : [],
  };
}

function demoGeschiedenisEigenaar(thuis: Punt, adres: string, uitlaters: Uitlater[]): Boeking[] {
  const u = (id: string) => uitlaters.find((x) => x.id === id)!;
  const wandeling = (uitlaterId: string, hondIds: string[], duur: Duur, dagen: number, uur: number, sterren: number | null) => {
    const b = historie(
      {
        mijnRol: 'eigenaar',
        uitlaterId,
        hondIds,
        duur,
        ophaalPunt: thuis,
        adres,
        prijs: berekenPrijs(u(uitlaterId), duur, hondIds.length),
        notitie: AFSLUITENDE_NOTITIES[dagen % AFSLUITENDE_NOTITIES.length],
      },
      dagen,
      uur,
    );
    return sterren ? { ...b, beoordelingDoorMij: { sterren, tags: ['Op tijd', 'Hond was blij'], tekst: '' }, fooi: 200 } : b;
  };
  return [
    wandeling('u1', ['h-luna'], 30, 1, 12, 5),
    wandeling('u1', ['h-luna', 'h-moos'], 45, 3, 12, 5),
    wandeling('u2', ['h-moos'], 30, 4, 10, 5),
    wandeling('u1', ['h-luna'], 60, 6, 17, null),
    historie({ mijnRol: 'eigenaar', soort: 'kennismaking', uitlaterId: 'u2', hondIds: ['h-luna', 'h-moos'], ophaalPunt: thuis, adres }, 9, 18),
  ];
}

function demoGeschiedenisUitlater(profiel: Uitlater): Boeking[] {
  const items: [string, Duur, number, number][] = [
    ['k1', 30, 0, 9],
    ['k2', 60, 1, 12],
    ['k1', 30, 1, 17],
    ['k4', 45, 2, 12],
    ['k5', 30, 3, 9],
    ['k2', 60, 4, 12],
    ['k3', 45, 5, 10],
    ['k1', 30, 6, 12],
  ];
  return items.map(([klantId, duur, dagen, uur], i) => {
    const k = DEMO_KLANTEN.find((x) => x.id === klantId)!;
    const b = historie(
      {
        mijnRol: 'uitlater',
        uitlaterId: profiel.id,
        klantId,
        hondIds: k.honden.map((h) => h.id),
        duur,
        ophaalPunt: k.positie,
        adres: k.adres,
        prijs: berekenPrijs(profiel, duur, k.honden.length),
      },
      dagen,
      uur,
    );
    return { ...b, fooi: i % 3 === 0 ? 200 : 0 };
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, zetRuw] = useState<AppState>(LEEG);
  const [wachtSinds, setWachtSinds] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ref = useRef({ state, wachtSinds });
  useEffect(() => {
    ref.current = { state, wachtSinds };
  });

  /** Elke wijziging gaat hierlangs, zodat statuswijzigingen meldingen opleveren, zoals pushmeldingen in de echte app */
  const setState = useCallback((f: AppState | ((s: AppState) => AppState)) => {
    zetRuw((s) => metMeldingen(s, typeof f === 'function' ? f(s) : f));
  }, []);

  const zet = useCallback(<K extends keyof AppState>(k: K, f: (oud: AppState[K]) => AppState[K]) => {
    setState((s) => ({ ...s, [k]: f(s[k]) }));
  }, [setState]);

  const wijzigBoeking = useCallback((id: string, f: (b: Boeking) => Boeking) => {
    setState((s) => ({ ...s, boekingen: s.boekingen.map((b) => (b.id === id ? f(b) : b)) }));
  }, [setState]);

  // Simulatie van de andere kant. In de echte app komen deze wijzigingen uit de database.
  useEffect(() => {
    const interval = setInterval(() => {
      const nu = Date.now();
      setState((s) => verwerkTik(s, nu, ref.current.wachtSinds));
    }, 400);
    return () => clearInterval(interval);
  }, [setState]);

  const aanmelden = useCallback((g: Gebruiker, rol: Rol) => {
    setState((s) => ({ ...s, gebruiker: g, rol, mijnProfiel: rol === 'uitlater' ? null : s.mijnProfiel }));
  }, [setState]);

  const demoStart = useCallback((rol: Rol) => {
    const uitlaters = maakDemoUitlaters();
    const gebruiker: Gebruiker = {
      voornaam: 'Robin',
      email: 'demo@woober.nl',
      postcode: '6511',
      plaats: 'Nijmegen',
      thuis: DEMO_THUIS,
      adres: DEMO_ADRES,
    };
    const profiel: Uitlater = {
      ...standaardProfiel('Robin'),
      bio: 'Thuiswerker met een flexibel rooster. Ik fiets naar je toe en neem altijd water mee.',
      ervaring: 'Zelf twee honden gehad, drie jaar uitlaatwerk.',
      verificatie: { identiteit: true, verzekering: true, uitbetaling: true, vog: false },
      beoordeling: 4.9,
      aantalBeoordelingen: 23,
      aantalWandelingen: 41,
      beschikbaarheid: {
        0: ['ochtend', 'middag'],
        1: ['ochtend', 'middag'],
        2: ['ochtend', 'middag', 'avond'],
        3: ['ochtend', 'middag'],
        4: ['ochtend', 'middag'],
        5: ['middag'],
        6: [],
      },
    };
    const eigenaarHistorie = demoGeschiedenisEigenaar(DEMO_THUIS, DEMO_ADRES, uitlaters);
    const uitlaterHistorie = demoGeschiedenisUitlater(profiel);
    const nu = Date.now();
    setState({
      ...LEEG,
      gebruiker,
      rol,
      honden: DEMO_EIGEN_HONDEN,
      mijnProfiel: profiel,
      uitlaters,
      bekend: DEMO_BEKEND,
      boekingen: [...eigenaarHistorie, ...uitlaterHistorie],
      gesprekken: [
        {
          id: 'u1',
          rol: 'eigenaar',
          berichten: [
            { id: 'm1', van: 'ander', tekst: 'Hoi Robin! Luna was gisteren echt een schatje. Zal ik volgende week weer langskomen?', tijd: nu - 20 * 3600000 },
            { id: 'm2', van: 'ik', tekst: 'Graag! Ik boek het zo via de app.', tijd: nu - 19 * 3600000 },
          ],
        },
        {
          id: 'k1',
          rol: 'uitlater',
          berichten: [{ id: 'm3', van: 'ander', tekst: 'Dank je voor de foto’s vanochtend, Bo was helemaal blij!', tijd: nu - 5 * 3600000 }],
        },
      ],
    });
    setWachtSinds(Date.now());
  }, [setState]);

  const bewaarHond = useCallback((h: Hond) => zet('honden', (hs) => (hs.some((x) => x.id === h.id) ? hs.map((x) => (x.id === h.id ? h : x)) : [...hs, h])), [zet]);
  const verwijderHond = useCallback((id: string) => zet('honden', (hs) => hs.filter((h) => h.id !== id)), [zet]);
  const wisselRol = useCallback((r: Rol) => setState((s) => ({ ...s, rol: r, online: r === 'uitlater' ? s.online : false })), [setState]);
  const bewaarProfiel = useCallback((p: Uitlater) => zet('mijnProfiel', () => p), [zet]);
  const verifieer = useCallback(
    (stap: keyof Verificatie) => zet('mijnProfiel', (p) => (p ? { ...p, verificatie: { ...p.verificatie, [stap]: true } } : p)),
    [zet],
  );
  const zetOnline = useCallback((aan: boolean) => {
    setState((s) => ({ ...s, online: aan }));
    setWachtSinds(Date.now());
  }, [setState]);
  const zetConcept = useCallback((c: BoekConcept | null) => zet('concept', () => c), [zet]);
  const zetBetaalmethode = useCallback((m: Betaalmethode) => zet('betaalmethode', () => m), [zet]);

  const vraagAan = useCallback((a: Aanvraag) => {
    const s = ref.current.state;
    const u = uitlaterUit(s, a.uitlaterId);
    if (!s.gebruiker || !u) return '';
    const prijs = berekenPrijs(u, a.duur, a.hondIds.length);
    let serieId: string | undefined;
    let moment = a.moment;
    let serie: Serie | null = null;
    if (a.moment.type === 'wekelijks') {
      serieId = nieuwId('s');
      serie = { id: serieId, uitlaterId: a.uitlaterId, hondIds: a.hondIds, duur: a.duur, dagen: a.moment.dagen, tijd: a.moment.tijd, actief: true, prijs };
      moment = { type: 'later', tijdstip: volgendeKeer(a.moment.dagen, a.moment.tijd, Date.now()) };
    }
    const b = basisBoeking({
      mijnRol: 'eigenaar',
      uitlaterId: a.uitlaterId,
      hondIds: a.hondIds,
      duur: a.duur,
      moment,
      serieId,
      ophaalPunt: s.gebruiker.thuis,
      adres: s.gebruiker.adres,
      sleutel: a.sleutel,
      notitie: a.notitie,
      betaalmethode: a.betaalmethode,
      prijs,
      startPositie: u.positie,
    });
    setState((st) => ({ ...st, boekingen: [...st.boekingen, b], series: serie ? [...st.series, serie] : st.series, betaalmethode: a.betaalmethode }));
    return b.id;
  }, [setState]);

  const vraagKennismakingAan = useCallback((uitlaterId: string, tijdstip: number, bericht: string) => {
    const s = ref.current.state;
    const u = uitlaterUit(s, uitlaterId);
    if (!s.gebruiker || !u) return '';
    const b = basisBoeking({
      mijnRol: 'eigenaar',
      soort: 'kennismaking',
      uitlaterId,
      hondIds: s.honden.map((h) => h.id),
      duur: 30,
      moment: { type: 'later', tijdstip },
      ophaalPunt: s.gebruiker.thuis,
      adres: s.gebruiker.adres,
      notitie: bericht,
      startPositie: u.positie,
    });
    setState((st) => ({
      ...st,
      boekingen: [...st.boekingen, b],
      gesprekken: bericht.trim() ? voegBerichtToe(st.gesprekken, uitlaterId, 'eigenaar', bericht.trim()) : st.gesprekken,
    }));
    return b.id;
  }, [setState]);

  const annuleer = useCallback(
    (id: string) =>
      wijzigBoeking(id, (b) => ({
        ...b,
        status: 'geannuleerd',
        statusSinds: Date.now(),
        annuleringskosten: b.mijnRol === 'eigenaar' ? annuleringskosten(b, Date.now()) : 0,
      })),
    [wijzigBoeking],
  );

  const startNu = useCallback(
    (id: string) =>
      wijzigBoeking(id, (b) => {
        if (b.status !== 'gepland') return b;
        return { ...b, status: 'onderweg', statusSinds: Date.now(), routeNaarOphaal: routeTussen(b.startPositie, b.ophaalPunt) };
      }),
    [wijzigBoeking],
  );

  const versnel = useCallback(
    (id: string) =>
      wijzigBoeking(id, (b) => {
        const stapMs = (5 * 60000) / TIJDSFACTOR;
        if (b.status === 'onderweg') return { ...b, statusSinds: b.statusSinds - stapMs };
        if (b.status === 'bezig' && b.gestart) return { ...b, gestart: b.gestart - stapMs };
        if (b.status === 'aangekomen') return { ...b, statusSinds: b.statusSinds - OVERDRACHT_NA_MS };
        return b;
      }),
    [wijzigBoeking],
  );

  const rondKennismakingAf = useCallback((id: string) => {
    setState((s) => {
      const b = s.boekingen.find((x) => x.id === id);
      if (!b) return s;
      const nu = Date.now();
      return {
        ...s,
        bekend: b.mijnRol === 'eigenaar' && !s.bekend.includes(b.uitlaterId) ? [...s.bekend, b.uitlaterId] : s.bekend,
        boekingen: s.boekingen.map((x) => (x.id === id ? { ...x, status: 'afgerond', statusSinds: nu, gestart: nu, beeindigd: nu } : x)),
      };
    });
  }, [setState]);

  const geefFooi = useCallback((id: string, centen: number) => wijzigBoeking(id, (b) => ({ ...b, fooi: centen })), [wijzigBoeking]);

  const beoordeel = useCallback((id: string, oordeel: Beoordeling) => {
    setState((s) => {
      const b = s.boekingen.find((x) => x.id === id);
      if (!b || b.beoordelingDoorMij) return s;
      const boekingen = s.boekingen.map((x) => (x.id === id ? { ...x, beoordelingDoorMij: oordeel } : x));
      if (b.mijnRol !== 'eigenaar') return { ...s, boekingen };
      const uitlaters = s.uitlaters.map((u) => {
        if (u.id !== b.uitlaterId) return u;
        const aantal = u.aantalBeoordelingen + 1;
        return {
          ...u,
          aantalBeoordelingen: aantal,
          beoordeling: Math.round(((u.beoordeling * u.aantalBeoordelingen + oordeel.sterren) / aantal) * 10) / 10,
          reviews: [
            { id: nieuwId('r'), van: s.gebruiker?.voornaam ?? 'Eigenaar', sterren: oordeel.sterren, tekst: oordeel.tekst || oordeel.tags.join(', '), datum: Date.now() },
            ...u.reviews,
          ],
        };
      });
      return { ...s, boekingen, uitlaters };
    });
  }, [setState]);

  const stopSerie = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      series: s.series.map((x) => (x.id === id ? { ...x, actief: false } : x)),
      boekingen: s.boekingen.map((b) =>
        b.serieId === id && (b.status === 'gepland' || b.status === 'aangevraagd') ? { ...b, status: 'geannuleerd', statusSinds: Date.now(), annuleringskosten: 0 } : b,
      ),
    }));
  }, [setState]);

  // Uitlatermodus

  const accepteer = useCallback(
    (id: string) => {
      wijzigBoeking(id, (b) => {
        if (b.status !== 'aangevraagd') return b;
        const nu = Date.now();
        if (b.moment.type === 'nu' && b.soort === 'wandeling') {
          return { ...b, status: 'onderweg', statusSinds: nu, routeNaarOphaal: routeTussen(b.startPositie, b.ophaalPunt) };
        }
        return { ...b, status: 'gepland', statusSinds: nu };
      });
      setWachtSinds(Date.now());
    },
    [wijzigBoeking],
  );

  const weiger = useCallback(
    (id: string) => {
      // Weigeren heeft geen gevolgen: er wordt niets bijgehouden over hoe vaak iemand weigert.
      wijzigBoeking(id, (b) => ({ ...b, status: 'geweigerd', statusSinds: Date.now() }));
      setWachtSinds(Date.now());
    },
    [wijzigBoeking],
  );

  const ikBenEr = useCallback(
    (id: string) => wijzigBoeking(id, (b) => (b.status === 'onderweg' ? { ...b, status: 'aangekomen', statusSinds: Date.now() } : b)),
    [wijzigBoeking],
  );

  const startWandeling = useCallback(
    (id: string, code: string) => {
      const b = ref.current.state.boekingen.find((x) => x.id === id);
      if (!b || b.ophaalcode !== code.trim()) return false;
      const nu = Date.now();
      wijzigBoeking(id, (x) => ({
        ...x,
        status: 'bezig',
        statusSinds: nu,
        gestart: nu,
        wandelroute: wandelroute(x.ophaalPunt, x.duur),
        gebeurtenissen: [{ id: nieuwId('g'), soort: 'start', tijd: nu, voortgang: 0 }],
      }));
      return true;
    },
    [wijzigBoeking],
  );

  const voegToe = useCallback(
    (id: string, soort: GebeurtenisSoort, tekst?: string) =>
      wijzigBoeking(id, (b) => {
        const nu = Date.now();
        const fotoKleuren: [string, string][] = [
          ['#FFD3A5', '#FD6585'],
          ['#B5E8C8', '#3FA372'],
          ['#C2D6FF', '#6A7FDB'],
        ];
        const fotos = b.gebeurtenissen.filter((g) => g.soort === 'foto').length;
        return {
          ...b,
          gebeurtenissen: [
            ...b.gebeurtenissen,
            {
              id: nieuwId('g'),
              soort,
              tijd: nu,
              voortgang: wandelVoortgang(b, nu),
              tekst,
              kleur: soort === 'foto' ? fotoKleuren[fotos % fotoKleuren.length] : undefined,
            },
          ],
        };
      }),
    [wijzigBoeking],
  );

  const beeindig = useCallback(
    (id: string) => {
      wijzigBoeking(id, (b) => {
        const nu = Date.now();
        if (b.soort === 'kennismaking') return { ...b, status: 'afgerond', statusSinds: nu, gestart: b.gestart ?? nu, beeindigd: nu };
        return {
          ...b,
          status: 'afgerond',
          statusSinds: nu,
          beeindigd: nu,
          gebeurtenissen: [...b.gebeurtenissen, { id: nieuwId('g'), soort: 'einde', tijd: nu, voortgang: wandelVoortgang(b, nu) }],
        };
      });
      setWachtSinds(Date.now());
    },
    [wijzigBoeking],
  );

  // Berichten, melden en blokkeren

  const stuurAutoAntwoord = useCallback((metId: string, rol: Rol, vertraging: number) => {
    const t = setTimeout(() => {
      setState((s) => {
        const g = s.gesprekken.find((x) => x.id === metId);
        const aantal = g ? g.berichten.filter((b) => b.van === 'ander').length : 0;
        const lijst = rol === 'eigenaar' ? AUTO_ANTWOORDEN_UITLATER : AUTO_ANTWOORDEN_KLANT;
        return {
          ...s,
          gesprekken: s.gesprekken.map((x) =>
            x.id === metId ? { ...x, berichten: [...x.berichten, { id: nieuwId('m'), van: 'ander', tekst: lijst[aantal % lijst.length], tijd: Date.now() }] } : x,
          ),
        };
      });
    }, vertraging);
    timers.current.push(t);
  }, [setState]);

  const stuurBericht = useCallback(
    (metId: string, rol: Rol, tekst: string) => {
      const schoon = tekst.trim();
      if (!schoon) return;
      setState((s) => ({ ...s, gesprekken: voegBerichtToe(s.gesprekken, metId, rol, schoon) }));
      stuurAutoAntwoord(metId, rol, 1500);
    },
    [stuurAutoAntwoord, setState],
  );

  const blokkeer = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      geblokkeerd: s.geblokkeerd.includes(id) ? s.geblokkeerd : [...s.geblokkeerd, id],
      gesprekken: s.gesprekken.filter((g) => g.id !== id),
      bekend: s.bekend.filter((b) => b !== id),
    }));
  }, [setState]);

  const meld = useCallback((id: string, _reden: string) => {
    // In de echte app gaat dit naar het moderatiescherm, waar altijd een mens beslist.
    setState((s) => ({ ...s, gemeld: s.gemeld.includes(id) ? s.gemeld : [...s.gemeld, id] }));
  }, [setState]);

  /** Sluit een melding en alle oudere meldingen voor dezelfde rol */
  const sluitMelding = useCallback(
    (id: string) =>
      zet('meldingen', (ms) => {
        const m = ms.find((x) => x.id === id);
        return m ? ms.filter((x) => !(x.rol === m.rol && x.tijd <= m.tijd)) : ms;
      }),
    [zet],
  );

  const accountVerwijderen = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setState({ ...LEEG, uitlaters: maakDemoUitlaters() });
  }, [setState]);

  const uitlater = useCallback((id: string) => uitlaterUit(state, id), [state]);
  const klant = useCallback((id: string | undefined) => DEMO_KLANTEN.find((k) => k.id === id), []);
  const hondenVan = useCallback(
    (b: Boeking) => {
      if (b.mijnRol === 'uitlater') return DEMO_KLANTEN.find((k) => k.id === b.klantId)?.honden ?? [];
      return b.hondIds.map((id) => state.honden.find((h) => h.id === id)).filter((h): h is Hond => Boolean(h));
    },
    [state.honden],
  );

  const actieveBoeking = useMemo(
    () => state.boekingen.find((b) => b.mijnRol === 'eigenaar' && b.soort === 'wandeling' && (LOPEND.includes(b.status) || (b.status === 'aangevraagd' && b.moment.type === 'nu'))),
    [state.boekingen],
  );
  const openVerzoek = useMemo(() => state.boekingen.find((b) => b.mijnRol === 'uitlater' && b.status === 'aangevraagd'), [state.boekingen]);
  const actieveOpdracht = useMemo(() => state.boekingen.find((b) => b.mijnRol === 'uitlater' && LOPEND.includes(b.status)), [state.boekingen]);

  const waarde: Context = {
    ...state,
    aanmelden,
    demoStart,
    bewaarHond,
    verwijderHond,
    wisselRol,
    bewaarProfiel,
    verifieer,
    zetOnline,
    zetConcept,
    zetBetaalmethode,
    vraagAan,
    vraagKennismakingAan,
    annuleer,
    startNu,
    versnel,
    rondKennismakingAf,
    geefFooi,
    beoordeel,
    stopSerie,
    accepteer,
    weiger,
    ikBenEr,
    startWandeling,
    voegToe,
    beeindig,
    stuurBericht,
    blokkeer,
    meld,
    sluitMelding,
    accountVerwijderen,
    uitlater,
    klant,
    hondenVan,
    actieveBoeking,
    openVerzoek,
    actieveOpdracht,
  };

  return <AppContext.Provider value={waarde}>{children}</AppContext.Provider>;
}

export function useApp(): Context {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp moet binnen AppProvider gebruikt worden');
  return ctx;
}

function uitlaterUit(s: AppState, id: string): Uitlater | undefined {
  return id === 'ik' ? (s.mijnProfiel ?? undefined) : s.uitlaters.find((u) => u.id === id);
}

function voegBerichtToe(gesprekken: Gesprek[], metId: string, rol: Rol, tekst: string): Gesprek[] {
  const bericht = { id: nieuwId('m'), van: 'ik' as const, tekst, tijd: Date.now() };
  if (gesprekken.some((g) => g.id === metId)) {
    return gesprekken.map((g) => (g.id === metId ? { ...g, berichten: [...g.berichten, bericht] } : g));
  }
  return [{ id: metId, rol, berichten: [bericht] }, ...gesprekken];
}

/** Eén stap van de demo-simulatie. Puur: geeft dezelfde staat terug als er niets verandert. */
function verwerkTik(s: AppState, nu: number, wachtSinds: number): AppState {
  let veranderd = false;
  const extra: Boeking[] = [];

  const boekingen = s.boekingen.map((b) => {
    // In uitlatermodus doet de gebruiker zelf de stappen; alleen de eigenaar-kant wordt nagespeeld.
    const n = b.mijnRol === 'eigenaar' ? stapEigenaar(s, b, nu, extra) : b;
    if (n !== b) veranderd = true;
    return n;
  });

  // Nieuw verzoek voor de uitlater als die online is en niets te doen heeft
  if (s.rol === 'uitlater' && s.online && s.mijnProfiel && klaarVoorWerk(s.mijnProfiel)) {
    const bezig = boekingen.some((b) => b.mijnRol === 'uitlater' && (b.status === 'aangevraagd' || LOPEND.includes(b.status)));
    if (!bezig && nu - wachtSinds > NIEUW_VERZOEK_NA_MS) {
      const recent = boekingen.filter((b) => b.mijnRol === 'uitlater' && b.aangemaakt > wachtSinds);
      if (recent.length === 0) {
        extra.push(maakVerzoek(s, boekingen.filter((b) => b.mijnRol === 'uitlater').length));
      }
    }
  }

  if (!veranderd && extra.length === 0) return s;
  return { ...s, boekingen: [...boekingen, ...extra] };
}

export function klaarVoorWerk(p: Uitlater): boolean {
  return p.verificatie.identiteit && p.verificatie.verzekering && p.verificatie.uitbetaling;
}

function maakVerzoek(s: AppState, volgnummer: number): Boeking {
  const profiel = s.mijnProfiel!;
  const klanten = DEMO_KLANTEN.filter((k) => !s.geblokkeerd.includes(k.id) && k.honden.length <= profiel.maxHonden);
  const lijst = klanten.length ? klanten : DEMO_KLANTEN;
  const k = lijst[volgnummer % lijst.length];
  const duren: Duur[] = [30, 60, 45];
  const duur = duren[volgnummer % duren.length];
  const kennismaking = volgnummer % 4 === 3;
  const moment: Moment = kennismaking
    ? { type: 'later', tijdstip: tijdstipOp(1, '18:00') }
    : volgnummer % 5 === 4
      ? { type: 'later', tijdstip: tijdstipOp(1, '12:30') }
      : { type: 'nu' };
  return basisBoeking({
    mijnRol: 'uitlater',
    soort: kennismaking ? 'kennismaking' : 'wandeling',
    uitlaterId: profiel.id,
    klantId: k.id,
    hondIds: k.honden.map((h) => h.id),
    duur,
    moment,
    ophaalPunt: k.positie,
    adres: k.adres,
    sleutel: volgnummer % 2 === 0 ? 'thuis' : 'kastje',
    notitie: k.honden[0].bijzonderheden,
    prijs: kennismaking ? GRATIS : berekenPrijs(profiel, duur, k.honden.length),
    startPositie: profiel.positie,
  });
}

function stapEigenaar(s: AppState, b: Boeking, nu: number, extra: Boeking[]): Boeking {
  const u = s.uitlaters.find((x) => x.id === b.uitlaterId);
  if (!u) return b;
  switch (b.status) {
    case 'aangevraagd': {
      if (nu - b.statusSinds < ACCEPTEER_NA_MS) return b;
      if (b.moment.type === 'nu' && b.soort === 'wandeling') {
        return { ...b, status: 'onderweg', statusSinds: nu, startPositie: u.positie, routeNaarOphaal: routeTussen(u.positie, b.ophaalPunt) };
      }
      return { ...b, status: 'gepland', statusSinds: nu };
    }
    case 'gepland': {
      // Een geplande wandeling start vanzelf kort voor het afgesproken tijdstip
      if (b.soort === 'wandeling' && b.moment.type === 'later' && nu >= b.moment.tijdstip - 10 * 60000 && nu < b.moment.tijdstip + 3600000) {
        return { ...b, status: 'onderweg', statusSinds: nu, startPositie: u.positie, routeNaarOphaal: routeTussen(u.positie, b.ophaalPunt) };
      }
      return b;
    }
    case 'onderweg':
      return ritVoortgang(b, u.vervoer, nu) >= 1 ? { ...b, status: 'aangekomen', statusSinds: nu } : b;
    case 'aangekomen':
      if (nu - b.statusSinds < OVERDRACHT_NA_MS) return b;
      return {
        ...b,
        status: 'bezig',
        statusSinds: nu,
        gestart: nu,
        wandelroute: wandelroute(b.ophaalPunt, b.duur),
        gebeurtenissen: [...b.gebeurtenissen, { id: nieuwId('g'), soort: 'start', tijd: nu, voortgang: 0 }],
      };
    case 'bezig': {
      const v = wandelVoortgang(b, nu);
      const hond = s.honden.find((h) => h.id === b.hondIds[0])?.naam ?? 'je hond';
      let stap = b.scriptStap;
      const nieuw = [...b.gebeurtenissen];
      while (stap < WANDEL_SCRIPT.length && WANDEL_SCRIPT[stap].bij <= v) {
        const item = WANDEL_SCRIPT[stap];
        nieuw.push({ id: nieuwId('g'), soort: item.soort, tijd: nu, voortgang: item.bij, tekst: item.tekst.replace('{hond}', hond), kleur: item.kleur });
        stap++;
      }
      if (v >= 1) {
        const notitie = AFSLUITENDE_NOTITIES[s.boekingen.indexOf(b) % AFSLUITENDE_NOTITIES.length].replace('{hond}', hond);
        nieuw.push({ id: nieuwId('g'), soort: 'einde', tijd: nu, voortgang: 1, tekst: notitie });
        const serie = b.serieId ? s.series.find((x) => x.id === b.serieId) : undefined;
        if (serie?.actief) {
          extra.push(
            basisBoeking({
              ...b,
              id: nieuwId('b'),
              status: 'gepland',
              statusSinds: nu,
              aangemaakt: nu,
              moment: { type: 'later', tijdstip: volgendeKeer(serie.dagen, serie.tijd, nu + 3600000) },
              ophaalcode: maakOphaalcode(),
              routeNaarOphaal: [],
              wandelroute: [],
              gebeurtenissen: [],
              scriptStap: 0,
              fooi: 0,
              gestart: undefined,
              beeindigd: undefined,
              beoordelingDoorMij: undefined,
            }),
          );
        }
        return { ...b, status: 'afgerond', statusSinds: nu, beeindigd: nu, scriptStap: stap, gebeurtenissen: nieuw };
      }
      if (stap === b.scriptStap) return b;
      return { ...b, scriptStap: stap, gebeurtenissen: nieuw };
    }
    default:
      return b;
  }
}

function telFotos(b: Boeking): number {
  return b.gebeurtenissen.filter((g) => g.soort === 'foto').length;
}

function metMeldingen(oud: AppState, nieuw: AppState): AppState {
  if (oud.boekingen === nieuw.boekingen) return nieuw;
  const vorige = new Map(oud.boekingen.map((b) => [b.id, b]));
  const meldingen: AppMelding[] = [];
  for (const b of nieuw.boekingen) {
    const o = vorige.get(b.id);
    if (o === b) continue;
    const m = maakMelding(nieuw, b, o ? { status: o.status, fotos: telFotos(o) } : undefined, telFotos(b));
    if (m) meldingen.push(m);
  }
  return meldingen.length ? { ...nieuw, meldingen: [...nieuw.meldingen, ...meldingen].slice(-20) } : nieuw;
}

function maakMelding(s: AppState, b: Boeking, oud: { status: Boeking['status']; fotos: number } | undefined, fotos: number): AppMelding | null {
  const tijd = Date.now();
  const id = nieuwId('n');
  if (b.mijnRol === 'uitlater') {
    if (!oud && b.status === 'aangevraagd') {
      const k = DEMO_KLANTEN.find((x) => x.id === b.klantId);
      return {
        id,
        rol: 'uitlater',
        tijd,
        icoon: 'notifications',
        titel: b.soort === 'kennismaking' ? 'Nieuwe kennismaking' : 'Nieuw verzoek',
        tekst: `${k?.voornaam ?? 'Een eigenaar'} vraagt of je ${k?.honden.map((h) => h.naam).join(' en ')} wilt uitlaten.`,
        href: '/werk',
      };
    }
    return null;
  }
  if (!oud || (oud.status === b.status && oud.fotos === fotos)) return null;
  const u = s.uitlaters.find((x) => x.id === b.uitlaterId);
  const naam = u?.voornaam ?? 'De uitlater';
  const hond = s.honden.find((h) => h.id === b.hondIds[0])?.naam ?? 'je hond';
  const href = `/wandeling/${b.id}`;
  if (oud.status !== b.status) {
    switch (b.status) {
      case 'gepland':
        return {
          id,
          rol: 'eigenaar',
          tijd,
          icoon: 'checkmark-circle',
          titel: b.soort === 'kennismaking' ? 'Kennismaking bevestigd' : 'Aanvraag geaccepteerd',
          tekst: `${naam} komt ${b.moment.type === 'later' ? 'op het afgesproken moment' : 'eraan'}.`,
          href,
        };
      case 'onderweg':
        return { id, rol: 'eigenaar', tijd, icoon: 'bicycle', titel: `${naam} is onderweg`, tekst: `Om ${hond} op te halen.`, href };
      case 'aangekomen':
        return { id, rol: 'eigenaar', tijd, icoon: 'home', titel: `${naam} staat voor de deur`, tekst: `Noem de ophaalcode ${b.ophaalcode}.`, href };
      case 'bezig':
        return { id, rol: 'eigenaar', tijd, icoon: 'walk', titel: 'De wandeling is begonnen', tekst: `${hond} is op pad met ${naam}.`, href };
      case 'afgerond':
        return b.soort === 'wandeling'
          ? { id, rol: 'eigenaar', tijd, icoon: 'home', titel: `${hond} is weer thuis`, tekst: 'Bekijk het wandelrapport.', href: `/rapport/${b.id}` }
          : null;
      default:
        return null;
    }
  }
  return { id, rol: 'eigenaar', tijd, icoon: 'camera', titel: `Nieuwe foto van ${hond}`, tekst: `${naam} stuurde een foto.`, href };
}
