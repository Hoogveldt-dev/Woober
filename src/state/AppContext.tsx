import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as AppStatus } from 'react-native';
import { AUTO_ANTWOORDEN_KLANT, AUTO_ANTWOORDEN_UITLATER, DEMO_EIGEN_HONDEN, DEMO_KLANTEN } from '../data/honden';
import { maakDemoPlekken } from '../data/plekken';
import { DEMO_ADRES, DEMO_THUIS, DEMO_UITLATER_START } from '../data/stad';
import { DEMO_BEKEND, maakDemoUitlaters } from '../data/uitlaters';
import * as account from '../lib/account';
import * as plekkenDb from '../lib/plekkenDb';
import { annuleringskosten, berekenPrijs, euro, GRATIS, VERLENG_MINUTEN, type PrijsExtra } from '../lib/prijs';
import { blokRondje, routeTussen, wandelroute } from '../lib/route';
import {
  ACCEPTEER_NA_MS,
  factorVoor,
  AFSLUITENDE_NOTITIES,
  OPPAS_NOTITIES,
  scriptVoor,
  maakOphaalcode,
  NIEUW_VERZOEK_NA_MS,
  OVERDRACHT_NA_MS,
  ritVoortgang,
  scriptVoortgang,
  TIJDSFACTOR,
  wandelVoortgang,
} from '../lib/simulatie';
import { supabase } from '../lib/supabase';
import { duurTekst, tijdstipOp, volgendeKeer } from '../lib/tijd';
import { drukteFactor, modelVoor, type Verdienmodel, type VerdienmodelId } from '../lib/verdienmodel';
import type {
  AppMelding,
  Beoordeling,
  Betaalmethode,
  BoekConcept,
  Boeking,
  Dienst,
  GebeurtenisSoort,
  Gebruiker,
  Gesprek,
  Hond,
  Klant,
  PrijsOpbouw,
  Moment,
  NieuwePlek,
  Plek,
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
  /** Demo met verzonnen gegevens, of een echt account in Supabase */
  modus: 'demo' | 'echt';
  /** Ingelogd bij Supabase. Kan zonder gebruiker: dan is de aanmelding nog niet afgemaakt. */
  ingelogd: boolean;
  /** Bij het starten: nog bezig met kijken of er een sessie is */
  laden: boolean;
  /** Lid van het team, met toegang tot Beheer (verdienmodel en andere instellingen). Nooit in de demo. */
  beheerder: boolean;
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
  /** Aantal nagespeelde verzoeken in uitlatermodus, voor een vaste volgorde in de demo */
  verzoekTeller: number;
  /** Actief verdienmodel. In de echte app kiest het team dit in de database, niet de gebruiker. */
  verdienmodelId: VerdienmodelId;
  /** Alleen voor de demo: drukte nabootsen om de drukte-toeslag te laten zien */
  drukteNagebootst: boolean;
  /** Eigenaar heeft het abonnement (Woober Plus) */
  plus: boolean;
  /** Tegoed van de eigenaar in centen, betaald door Woober (welkomst, uitnodiging, actiecode) */
  tegoed: number;
  gebruikteCodes: string[];
  /** Losloopgebieden, stranden en horeca met reviews van gebruikers */
  plekken: Plek[];
}

export interface Aanvraag {
  dienst: Dienst;
  uitlaterId: string;
  hondIds: string[];
  duur: number;
  cameraInHuis?: boolean;
  moment: Moment;
  sleutel: Sleutel;
  notitie: string;
  betaalmethode: Betaalmethode;
}

interface AppActies {
  /** Na het inloggen: profiel en adres opslaan en het account openen */
  aanmelden: (g: Gebruiker, rol: Rol) => Promise<void>;
  demoStart: (rol: Rol) => void;
  /** Uitloggen, of de demo verlaten */
  uitloggen: () => Promise<void>;
  bewaarHond: (h: Hond) => void;
  verwijderHond: (id: string) => void;
  wisselRol: (r: Rol) => void;
  bewaarProfiel: (p: Uitlater) => void;
  verifieer: (stap: keyof Verificatie) => void;
  zetOnline: (aan: boolean) => void;
  zetConcept: (c: BoekConcept | null) => void;
  zetBetaalmethode: (m: Betaalmethode) => void;
  vraagAan: (a: Aanvraag) => string;
  zetVerdienmodel: (id: VerdienmodelId) => void;
  zetDrukteNagebootst: (aan: boolean) => void;
  zetPlus: (aan: boolean) => void;
  /** Geeft een melding terug voor de gebruiker */
  verzilverCode: (code: string) => { gelukt: boolean; tekst: string };
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
  /** Oppas met een uur verlengen; in de echte app moet de oppas dit eerst bevestigen */
  verleng: (id: string) => void;
  stuurBericht: (metId: string, rol: Rol, tekst: string) => void;
  blokkeer: (id: string) => void;
  meld: (id: string, reden: string) => void;
  sluitMelding: (id: string) => void;
  /** Review van een plek schrijven of aanpassen; één per gebruiker per plek */
  beoordeelPlek: (plekId: string, sterren: number, tekst: string) => void;
  verwijderPlekReview: (plekId: string) => void;
  /** Plek toevoegen; is meteen zichtbaar en wordt daarna door een medewerker bekeken. Geeft het id terug. */
  voegPlekToe: (p: NieuwePlek) => Promise<string>;
  /** Plekken opnieuw ophalen uit de database (alleen bij een echt account) */
  herlaadPlekken: () => Promise<void>;
  /** Alleen een plek die je zelf hebt toegevoegd en die nog niet is gecontroleerd */
  verwijderPlek: (id: string) => void;
  accountVerwijderen: () => Promise<void>;

  /** Het actieve verdienmodel */
  verdienmodel: Verdienmodel;
  /** Prijs volgens het actieve verdienmodel, inclusief drukte en abonnement; met tegoed als metTegoed */
  prijsVoor: (u: Uitlater, dienst: Dienst, duur: number, aantalHonden: number, moment: Moment, metTegoed?: boolean) => PrijsOpbouw;
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
  modus: 'demo',
  ingelogd: false,
  laden: false,
  beheerder: false,
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
  verzoekTeller: 0,
  verdienmodelId: 'lancering',
  drukteNagebootst: false,
  plus: false,
  tegoed: 0,
  gebruikteCodes: [],
  plekken: maakDemoPlekken(),
};

/** Actiecodes in de demo. In de echte app: tabel promocodes, te verzilveren via verzilver_code(). */
const DEMO_CODES: Record<string, number> = { WOOBER5: 500, BUURT10: 1000 };

/** Prijsinstellingen die horen bij de huidige staat: actief model, drukte en abonnement */
function prijsExtra(s: AppState, dienst: Dienst, moment: Moment, nu = Date.now()): PrijsExtra {
  const model = modelVoor(s.verdienmodelId);
  const aantalOnline = s.uitlaters.filter((u) => u.online && u.diensten.includes(dienst)).length;
  return { drukteFactor: drukteFactor(model, { dienst, moment, aantalOnline, nagebootst: s.drukteNagebootst, nu }), plus: s.plus };
}

export function standaardProfiel(voornaam: string): Uitlater {
  return {
    id: 'ik',
    voornaam,
    leeftijd: 25,
    wijk: 'Lindenkwartier',
    bio: '',
    ervaring: '',
    professioneel: false,
    diensten: ['uitlaten'],
    oppasPerUur: 1100,
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
    soort: 'betaald',
    dienst: 'uitlaten',
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

/** Route van de hond: een wandeling naar het park, of bij oppas alleen een plasrondje om het blok */
function routeVoor(b: Pick<Boeking, 'dienst' | 'ophaalPunt' | 'duur'>) {
  return b.dienst === 'oppas' ? blokRondje(b.ophaalPunt) : wandelroute(b.ophaalPunt, b.duur);
}

/** Een afgeronde wandeling of oppas in het verleden, met volledige route en gebeurtenissen */
function historie(deel: Parameters<typeof basisBoeking>[0], dagenGeleden: number, uur: number): Boeking {
  const b = basisBoeking(deel);
  const start = new Date(Date.now() - dagenGeleden * 86400000);
  start.setHours(uur, 0, 0, 0);
  const route = b.soort === 'betaald' ? routeVoor(b) : [];
  const script = scriptVoor(b.dienst);
  return {
    ...b,
    status: 'afgerond',
    moment: { type: 'later', tijdstip: start.getTime() },
    aangemaakt: start.getTime() - 86400000,
    statusSinds: start.getTime(),
    gestart: start.getTime(),
    basisDuur: b.duur,
    beeindigd: start.getTime() + (b.soort === 'betaald' ? b.duur * 60000 : 15 * 60000),
    wandelroute: route,
    scriptStap: script.length,
    gebeurtenissen:
      b.soort === 'betaald'
        ? [
            { id: nieuwId('g'), soort: 'start', tijd: start.getTime(), voortgang: 0 },
            ...script.map((s) => ({
              id: nieuwId('g'),
              soort: s.soort,
              tijd: start.getTime() + s.bij * b.duur * 60000,
              voortgang: s.bij,
              tekst: s.tekst.replace('{hond}', 'je hond'),
              kleur: s.kleur,
            })),
            { id: nieuwId('g'), soort: 'einde', tijd: start.getTime() + b.duur * 60000, voortgang: 1, tekst: deel.notitie || undefined },
          ]
        : [],
  };
}

function demoGeschiedenisEigenaar(thuis: Punt, adres: string, uitlaters: Uitlater[]): Boeking[] {
  const u = (id: string) => uitlaters.find((x) => x.id === id)!;
  const wandeling = (uitlaterId: string, hondIds: string[], duur: number, dagen: number, uur: number, sterren: number | null, dienst: Dienst = 'uitlaten') => {
    const notities = dienst === 'oppas' ? OPPAS_NOTITIES : AFSLUITENDE_NOTITIES;
    const b = historie(
      {
        mijnRol: 'eigenaar',
        dienst,
        uitlaterId,
        hondIds,
        duur,
        ophaalPunt: thuis,
        adres,
        prijs: berekenPrijs(u(uitlaterId), dienst, duur, hondIds.length, modelVoor('lancering')),
        notitie: notities[dagen % notities.length].replace('{hond}', 'Luna'),
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
    wandeling('u1', ['h-luna', 'h-moos'], 180, 5, 19, 5, 'oppas'),
    wandeling('u1', ['h-luna'], 60, 6, 17, null),
    historie({ mijnRol: 'eigenaar', soort: 'kennismaking', uitlaterId: 'u2', hondIds: ['h-luna', 'h-moos'], ophaalPunt: thuis, adres }, 9, 18),
  ];
}

function demoGeschiedenisUitlater(profiel: Uitlater): Boeking[] {
  const items: [string, number, number, number][] = [
    ['k1', 30, 0, 9],
    ['k2', 60, 1, 12],
    ['k1', 30, 1, 17],
    ['k4', 45, 2, 12],
    ['k5', 30, 3, 9],
    ['k2', 60, 4, 12],
    ['k3', 45, 5, 10],
    ['k1', 30, 6, 12],
    ['k4', 240, 2, 19],
  ];
  return items.map(([klantId, duur, dagen, uur], i) => {
    const k = DEMO_KLANTEN.find((x) => x.id === klantId)!;
    const b = historie(
      {
        mijnRol: 'uitlater',
        dienst: duur > 60 ? 'oppas' : 'uitlaten',
        uitlaterId: profiel.id,
        klantId,
        hondIds: k.honden.map((h) => h.id),
        duur,
        ophaalPunt: k.positie,
        adres: k.adres,
        prijs: berekenPrijs(profiel, duur > 60 ? 'oppas' : 'uitlaten', duur, k.honden.length, modelVoor('lancering')),
      },
      dagen,
      uur,
    );
    return { ...b, fooi: i % 3 === 0 ? 200 : 0 };
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, zetRuw] = useState<AppState>({ ...LEEG, laden: true });
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

  /** Melding bovenin als opslaan in de database mislukt; de wijziging blijft in de app staan */
  const meldFout = useCallback(
    (e: unknown) => {
      const tekst = e instanceof Error ? e.message : 'Er ging iets mis. Probeer het nog eens.';
      zet('meldingen', (ms) => [...ms, { id: nieuwId('n'), rol: ref.current.state.rol, titel: 'Niet opgeslagen', tekst, icoon: 'alert-circle', tijd: Date.now() }]);
    },
    [zet],
  );
  const echt = useCallback(() => ref.current.state.modus === 'echt', []);

  /** Zet het account uit de database in de app; zonder account blijft de gebruiker op het aanmeldscherm */
  const openAccount = useCallback(async () => {
    try {
      const a = await account.laadAccount();
      // Zonder plekken werkt de rest gewoon; dan blijft de lijst leeg tot het later lukt
      const plekken = a ? await plekkenDb.laadPlekken().catch(() => []) : [];
      setState((oud) => ({
        ...LEEG,
        uitlaters: maakDemoUitlaters(),
        verdienmodelId: oud.verdienmodelId,
        modus: 'echt',
        ingelogd: true,
        plekken,
        ...(a ? { gebruiker: a.gebruiker, rol: a.rol, honden: a.honden, mijnProfiel: a.profiel, beheerder: a.beheerder } : {}),
      }));
    } catch (e) {
      setState((s) => ({ ...s, ingelogd: true, laden: false }));
      meldFout(e);
    }
  }, [setState, meldFout]);

  // Sessie van Supabase volgen: bij het starten, na inloggen met Apple, Google of e-mail, en na uitloggen
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((gebeurtenis, sessie) => {
      // Geen Supabase-aanroepen binnen deze callback zelf; die wachten op elkaar
      setTimeout(() => {
        if (gebeurtenis === 'SIGNED_OUT' || !sessie) {
          setState((s) => (s.modus === 'echt' ? { ...LEEG, uitlaters: maakDemoUitlaters(), verdienmodelId: s.verdienmodelId } : { ...s, laden: false, ingelogd: false }));
        } else if (gebeurtenis === 'INITIAL_SESSION' || (gebeurtenis === 'SIGNED_IN' && !ref.current.state.gebruiker)) {
          openAccount();
        }
      }, 0);
    });
    // Tokens alleen verversen als de app op de voorgrond staat
    const status = AppStatus.addEventListener('change', (s) => (s === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
    return () => {
      data.subscription.unsubscribe();
      status.remove();
    };
  }, [setState, openAccount]);

  const aanmelden = useCallback(async (g: Gebruiker, rol: Rol) => {
    if (ref.current.state.ingelogd) {
      // Fouten gaan terug naar het aanmeldscherm
      await account.maakAccount(g, rol);
      await openAccount();
      return;
    }
    setState((s) => ({
      ...s,
      gebruiker: g,
      rol,
      mijnProfiel: rol === 'uitlater' ? null : s.mijnProfiel,
      tegoed: rol === 'eigenaar' ? s.tegoed + modelVoor(s.verdienmodelId).welkomsttegoed : s.tegoed,
    }));
  }, [setState, openAccount]);

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
      diensten: ['uitlaten', 'oppas'],
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
    setState((oud) => ({
      ...LEEG,
      verdienmodelId: oud.verdienmodelId,
      drukteNagebootst: oud.drukteNagebootst,
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
    }));
    setWachtSinds(Date.now());
  }, [setState]);

  // In een echt account gaat elke wijziging ook naar de database; de app wacht daar niet op
  const bewaarHond = useCallback(
    (h: Hond) => {
      zet('honden', (hs) => (hs.some((x) => x.id === h.id) ? hs.map((x) => (x.id === h.id ? h : x)) : [...hs, h]));
      if (echt()) account.bewaarHond(h).catch(meldFout);
    },
    [zet, meldFout, echt],
  );
  const verwijderHond = useCallback(
    (id: string) => {
      zet('honden', (hs) => hs.filter((h) => h.id !== id));
      if (echt()) account.verwijderHond(id).catch(meldFout);
    },
    [zet, meldFout, echt],
  );
  const wisselRol = useCallback(
    (r: Rol) => {
      setState((s) => ({ ...s, rol: r, online: r === 'uitlater' ? s.online : false }));
      if (echt()) account.bewaarRol(r).catch(meldFout);
    },
    [setState, meldFout, echt],
  );
  const bewaarProfiel = useCallback(
    (p: Uitlater) => {
      zet('mijnProfiel', () => p);
      if (echt()) account.bewaarUitlaatprofiel(p).catch(meldFout);
    },
    [zet, meldFout, echt],
  );
  // Alleen in de demo; in een echt account zet Woober de verificatie na controle
  const verifieer = useCallback(
    (stap: keyof Verificatie) => {
      if (echt()) return;
      zet('mijnProfiel', (p) => (p ? { ...p, verificatie: { ...p.verificatie, [stap]: true } } : p));
    },
    [zet, echt],
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
    const model = modelVoor(s.verdienmodelId);
    const extraPrijs = prijsExtra(s, a.dienst, a.moment);
    // Een vaste afspraak krijgt telkens de prijs zonder tegoed; het tegoed gaat alleen van de eerste keer af
    const zonderTegoed = berekenPrijs(u, a.dienst, a.duur, a.hondIds.length, model, extraPrijs);
    const prijs = berekenPrijs(u, a.dienst, a.duur, a.hondIds.length, model, { ...extraPrijs, tegoed: s.tegoed });
    let serieId: string | undefined;
    let moment = a.moment;
    let serie: Serie | null = null;
    if (a.moment.type === 'wekelijks') {
      serieId = nieuwId('s');
      serie = { id: serieId, uitlaterId: a.uitlaterId, dienst: a.dienst, hondIds: a.hondIds, duur: a.duur, dagen: a.moment.dagen, tijd: a.moment.tijd, actief: true, prijs: zonderTegoed };
      moment = { type: 'later', tijdstip: volgendeKeer(a.moment.dagen, a.moment.tijd, Date.now()) };
    }
    const b = basisBoeking({
      mijnRol: 'eigenaar',
      dienst: a.dienst,
      uitlaterId: a.uitlaterId,
      hondIds: a.hondIds,
      duur: a.duur,
      cameraInHuis: a.cameraInHuis,
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
    setState((st) => ({
      ...st,
      boekingen: [...st.boekingen, b],
      series: serie ? [...st.series, serie] : st.series,
      betaalmethode: a.betaalmethode,
      tegoed: Math.max(0, st.tegoed - prijs.korting),
    }));
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
      setState((s) => {
        const b = s.boekingen.find((x) => x.id === id);
        if (!b) return s;
        const kosten = b.mijnRol === 'eigenaar' ? annuleringskosten(b, Date.now()) : 0;
        // Gebruikt tegoed komt altijd terug; eventuele annuleringskosten worden apart afgerekend
        const terug = b.mijnRol === 'eigenaar' ? b.prijs.korting : 0;
        return {
          ...s,
          tegoed: s.tegoed + terug,
          boekingen: s.boekingen.map((x) => (x.id === id ? { ...x, status: 'geannuleerd', statusSinds: Date.now(), annuleringskosten: kosten } : x)),
        };
      }),
    [setState],
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
        // Bij oppas springt de demo een half uur vooruit
        if (b.status === 'bezig' && b.gestart) return { ...b, gestart: b.gestart - ((b.dienst === 'oppas' ? 30 : 5) * 60000) / factorVoor(b) };
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
        if (b.moment.type === 'nu' && b.soort === 'betaald') {
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
        basisDuur: x.duur,
        wandelroute: routeVoor(x),
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
              voortgang: b.dienst === 'oppas' ? scriptVoortgang(b, nu) : wandelVoortgang(b, nu),
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
        // Beëindigt de eigenaar (bij oppas: "Ik ben thuis"), dan laat de nagespeelde oppas nog een notitie achter
        const hond = ref.current.state.honden.find((h) => h.id === b.hondIds[0])?.naam ?? 'je hond';
        const notities = b.dienst === 'oppas' ? OPPAS_NOTITIES : AFSLUITENDE_NOTITIES;
        const tekst = b.mijnRol === 'eigenaar' ? notities[0].replace('{hond}', hond) : undefined;
        return {
          ...b,
          status: 'afgerond',
          statusSinds: nu,
          beeindigd: nu,
          gebeurtenissen: [
            ...b.gebeurtenissen,
            { id: nieuwId('g'), soort: 'einde', tijd: nu, voortgang: b.dienst === 'oppas' ? scriptVoortgang(b, nu) : wandelVoortgang(b, nu), tekst },
          ],
        };
      });
      setWachtSinds(Date.now());
    },
    [wijzigBoeking],
  );

  const verleng = useCallback(
    (id: string) =>
      wijzigBoeking(id, (b) => {
        if (b.dienst !== 'oppas' || !['gepland', 'onderweg', 'aangekomen', 'bezig'].includes(b.status)) return b;
        const u = uitlaterUit(ref.current.state, b.uitlaterId);
        if (!u) return b;
        const duur = b.duur + VERLENG_MINUTEN;
        const nu = Date.now();
        return {
          ...b,
          duur,
          // Zelfde verdienmodel, drukte en korting als bij het boeken
          prijs: berekenPrijs(u, 'oppas', duur, b.hondIds.length, modelVoor(b.prijs.modelId), {
            drukteFactor: b.prijs.drukteFactor,
            plus: b.prijs.plus,
            tegoed: b.prijs.korting,
          }),
          gebeurtenissen: [
            ...b.gebeurtenissen,
            { id: nieuwId('g'), soort: 'notitie', tijd: nu, voortgang: scriptVoortgang(b, nu), tekst: `Verlengd tot ${duurTekst(duur)}` },
          ],
        };
      }),
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

  const meld = useCallback((id: string, reden: string) => {
    // Gaat naar het moderatiescherm (Beheer), waar altijd een mens beslist
    setState((s) => ({ ...s, gemeld: s.gemeld.includes(id) ? s.gemeld : [...s.gemeld, id] }));
    if (!echt()) return;
    const ps = ref.current.state.plekken;
    const plek = ps.find((p) => p.id === id);
    const review = plek ? undefined : ps.flatMap((p) => p.reviews).find((r) => r.id === id);
    if (plek || review) plekkenDb.meld({ plek, review }, reden).catch(meldFout);
  }, [setState, echt, meldFout]);

  /** Sluit een melding en alle oudere meldingen voor dezelfde rol */
  const sluitMelding = useCallback(
    (id: string) =>
      zet('meldingen', (ms) => {
        const m = ms.find((x) => x.id === id);
        return m ? ms.filter((x) => !(x.rol === m.rol && x.tijd <= m.tijd)) : ms;
      }),
    [zet],
  );

  // Plekken

  const herlaadPlekken = useCallback(async () => {
    if (!echt()) return;
    try {
      const plekken = await plekkenDb.laadPlekken();
      setState((s) => ({ ...s, plekken }));
    } catch (e) {
      meldFout(e);
    }
  }, [echt, setState, meldFout]);

  const beoordeelPlek = useCallback(
    (plekId: string, sterren: number, tekst: string) => {
      if (echt()) {
        const bestaand = ref.current.state.plekken.find((p) => p.id === plekId)?.reviews.find((r) => r.vanMij);
        plekkenDb.schrijfReview(plekId, sterren, tekst.trim(), bestaand?.id).then(herlaadPlekken, meldFout);
      }
      setState((s) => ({
        ...s,
        plekken: s.plekken.map((p) =>
          p.id === plekId
            ? {
                ...p,
                reviews: [
                  { id: `mijn-${plekId}`, van: s.gebruiker?.voornaam ?? 'Ik', sterren, tekst: tekst.trim(), datum: Date.now(), vanMij: true },
                  ...p.reviews.filter((r) => !r.vanMij),
                ],
              }
            : p,
        ),
      }));
    },
    [setState, echt, herlaadPlekken, meldFout],
  );
  const verwijderPlekReview = useCallback(
    (plekId: string) => {
      if (echt()) plekkenDb.verwijderReview(plekId).catch(meldFout);
      zet('plekken', (ps) => ps.map((p) => (p.id === plekId ? { ...p, reviews: p.reviews.filter((r) => !r.vanMij) } : p)));
    },
    [zet, echt, meldFout],
  );

  const voegPlekToe = useCallback(
    async (nieuw: NieuwePlek) => {
      if (echt()) {
        // Fouten (zoals te veel plekken op een dag) gaan terug naar het scherm
        const id = await plekkenDb.voegPlekToe(nieuw, ref.current.state.gebruiker?.plaats || 'Nijmegen');
        await herlaadPlekken();
        return id;
      }
      const id = nieuwId('plek');
      setState((s) => ({
        ...s,
        plekken: [
          ...s.plekken,
          {
            ...nieuw,
            id,
            naam: nieuw.naam.trim(),
            omschrijving: nieuw.omschrijving.trim(),
            regels: nieuw.regels?.trim() || undefined,
            reviews: [],
            toegevoegdDoor: s.gebruiker?.voornaam,
            vanMij: true,
            gecontroleerd: false,
          },
        ],
      }));
      return id;
    },
    [setState, echt, herlaadPlekken],
  );
  const verwijderPlek = useCallback(
    (id: string) => {
      if (echt()) plekkenDb.verwijderPlek(id).catch(meldFout);
      zet('plekken', (ps) => ps.filter((p) => !(p.id === id && p.vanMij && !p.gecontroleerd)));
    },
    [zet, echt, meldFout],
  );

  const opnieuw = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setState((oud) => ({ ...LEEG, uitlaters: maakDemoUitlaters(), verdienmodelId: oud.verdienmodelId, drukteNagebootst: oud.drukteNagebootst }));
  }, [setState]);
  const accountVerwijderen = useCallback(async () => {
    if (echt()) {
      try {
        await account.verwijderAccount();
      } catch (e) {
        meldFout(e);
        return;
      }
    }
    opnieuw();
  }, [opnieuw, meldFout, echt]);
  const uitloggen = useCallback(async () => {
    // Ook vanuit de demo: een half afgemaakte aanmelding hoort er niet te blijven hangen
    await account.uitloggen().catch(() => undefined);
    opnieuw();
  }, [opnieuw]);

  // Verdienmodel en tegoed

  const zetVerdienmodel = useCallback((id: VerdienmodelId) => zet('verdienmodelId', () => id), [zet]);
  const zetDrukteNagebootst = useCallback((aan: boolean) => zet('drukteNagebootst', () => aan), [zet]);
  const zetPlus = useCallback((aan: boolean) => zet('plus', () => aan), [zet]);
  const verzilverCode = useCallback(
    (invoer: string) => {
      const code = invoer.trim().toUpperCase();
      const bedrag = DEMO_CODES[code];
      const s = ref.current.state;
      if (!bedrag) return { gelukt: false, tekst: 'Deze code kennen we niet.' };
      if (s.gebruikteCodes.includes(code)) return { gelukt: false, tekst: 'Deze code heb je al gebruikt.' };
      setState((st) => ({ ...st, tegoed: st.tegoed + bedrag, gebruikteCodes: [...st.gebruikteCodes, code] }));
      return { gelukt: true, tekst: `Gelukt! Er staat ${euro(bedrag)} extra tegoed voor je klaar.` };
    },
    [setState],
  );

  const verdienmodel = modelVoor(state.verdienmodelId);
  const prijsVoor = useCallback(
    (u: Uitlater, dienst: Dienst, duur: number, aantalHonden: number, moment: Moment, metTegoed = false) =>
      berekenPrijs(u, dienst, duur, aantalHonden, modelVoor(state.verdienmodelId), {
        ...prijsExtra(state, dienst, moment),
        tegoed: metTegoed ? state.tegoed : 0,
      }),
    [state],
  );

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
    () => state.boekingen.find((b) => b.mijnRol === 'eigenaar' && b.soort === 'betaald' && (LOPEND.includes(b.status) || (b.status === 'aangevraagd' && b.moment.type === 'nu'))),
    [state.boekingen],
  );
  const openVerzoek = useMemo(() => state.boekingen.find((b) => b.mijnRol === 'uitlater' && b.status === 'aangevraagd'), [state.boekingen]);
  const actieveOpdracht = useMemo(() => state.boekingen.find((b) => b.mijnRol === 'uitlater' && LOPEND.includes(b.status)), [state.boekingen]);

  const waarde: Context = {
    ...state,
    aanmelden,
    demoStart,
    uitloggen,
    bewaarHond,
    verwijderHond,
    wisselRol,
    bewaarProfiel,
    verifieer,
    zetOnline,
    zetConcept,
    zetBetaalmethode,
    vraagAan,
    zetVerdienmodel,
    zetDrukteNagebootst,
    zetPlus,
    verzilverCode,
    verdienmodel,
    prijsVoor,
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
    verleng,
    stuurBericht,
    blokkeer,
    meld,
    sluitMelding,
    beoordeelPlek,
    verwijderPlekReview,
    voegPlekToe,
    herlaadPlekken,
    verwijderPlek,
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
        extra.push(maakVerzoek(s, s.verzoekTeller));
        return { ...s, boekingen: [...boekingen, ...extra], verzoekTeller: s.verzoekTeller + 1 };
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
  // Afwisselend wandelingen en oppas, voor zover de uitlater die diensten aanbiedt
  const oppas = profiel.diensten.includes('oppas') && (!profiel.diensten.includes('uitlaten') || volgnummer % 3 === 1);
  const duren = oppas ? [120, 180, 240] : [30, 60, 45];
  const duur = duren[volgnummer % duren.length];
  const kennismaking = volgnummer % 4 === 3;
  const moment: Moment = kennismaking
    ? { type: 'later', tijdstip: tijdstipOp(1, '18:00') }
    : volgnummer % 5 === 4
      ? { type: 'later', tijdstip: tijdstipOp(1, oppas ? '19:30' : '12:30') }
      : { type: 'nu' };
  const dienst: Dienst = oppas ? 'oppas' : 'uitlaten';
  return basisBoeking({
    mijnRol: 'uitlater',
    soort: kennismaking ? 'kennismaking' : 'betaald',
    dienst,
    uitlaterId: profiel.id,
    klantId: k.id,
    hondIds: k.honden.map((h) => h.id),
    duur,
    moment,
    ophaalPunt: k.positie,
    adres: k.adres,
    sleutel: volgnummer % 2 === 0 ? 'thuis' : 'kastje',
    notitie: k.honden[0].bijzonderheden,
    prijs: kennismaking ? GRATIS : berekenPrijs(profiel, dienst, duur, k.honden.length, modelVoor(s.verdienmodelId), prijsExtra(s, dienst, moment)),
    startPositie: profiel.positie,
  });
}

function stapEigenaar(s: AppState, b: Boeking, nu: number, extra: Boeking[]): Boeking {
  const u = s.uitlaters.find((x) => x.id === b.uitlaterId);
  if (!u) return b;
  switch (b.status) {
    case 'aangevraagd': {
      if (nu - b.statusSinds < ACCEPTEER_NA_MS) return b;
      if (b.moment.type === 'nu' && b.soort === 'betaald') {
        return { ...b, status: 'onderweg', statusSinds: nu, startPositie: u.positie, routeNaarOphaal: routeTussen(u.positie, b.ophaalPunt) };
      }
      return { ...b, status: 'gepland', statusSinds: nu };
    }
    case 'gepland': {
      // Een geplande wandeling start vanzelf kort voor het afgesproken tijdstip
      if (b.soort === 'betaald' && b.moment.type === 'later' && nu >= b.moment.tijdstip - 10 * 60000 && nu < b.moment.tijdstip + 3600000) {
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
        basisDuur: b.duur,
        wandelroute: routeVoor(b),
        gebeurtenissen: [...b.gebeurtenissen, { id: nieuwId('g'), soort: 'start', tijd: nu, voortgang: 0 }],
      };
    case 'bezig': {
      const v = wandelVoortgang(b, nu);
      const sv = scriptVoortgang(b, nu);
      const hond = s.honden.find((h) => h.id === b.hondIds[0])?.naam ?? 'je hond';
      let stap = b.scriptStap;
      const nieuw = [...b.gebeurtenissen];
      const script = scriptVoor(b.dienst);
      while (stap < script.length && script[stap].bij <= sv) {
        const item = script[stap];
        nieuw.push({ id: nieuwId('g'), soort: item.soort, tijd: nu, voortgang: item.bij, tekst: item.tekst.replace('{hond}', hond), kleur: item.kleur });
        stap++;
      }
      if (v >= 1) {
        const notities = b.dienst === 'oppas' ? OPPAS_NOTITIES : AFSLUITENDE_NOTITIES;
        const notitie = notities[s.boekingen.indexOf(b) % notities.length].replace('{hond}', hond);
        nieuw.push({ id: nieuwId('g'), soort: 'einde', tijd: nu, voortgang: b.dienst === 'oppas' ? sv : 1, tekst: notitie });
        const serie = b.serieId ? s.series.find((x) => x.id === b.serieId) : undefined;
        const u = uitlaterUit(s, b.uitlaterId);
        if (serie?.actief && u) {
          const moment: Moment = { type: 'later', tijdstip: volgendeKeer(serie.dagen, serie.tijd, nu + 3600000) };
          extra.push(
            basisBoeking({
              ...b,
              id: nieuwId('b'),
              status: 'gepland',
              statusSinds: nu,
              aangemaakt: nu,
              moment,
              // Elke keer de prijs van het moment van inplannen, zoals vraag_boeking_aan() in de database
              prijs: berekenPrijs(u, b.dienst, b.duur, b.hondIds.length, modelVoor(s.verdienmodelId), prijsExtra(s, b.dienst, moment, nu)),
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
        tekst: `${k?.voornaam ?? 'Een eigenaar'} vraagt of je ${b.dienst === 'oppas' ? 'wilt oppassen op' : 'wilt uitlaten:'} ${k?.honden.map((h) => h.naam).join(' en ')}.`,
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
  const oppas = b.dienst === 'oppas';
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
        return { id, rol: 'eigenaar', tijd, icoon: 'bicycle', titel: `${naam} is onderweg`, tekst: oppas ? `Om op ${hond} te passen.` : `Om ${hond} op te halen.`, href };
      case 'aangekomen':
        return { id, rol: 'eigenaar', tijd, icoon: 'home', titel: `${naam} staat voor de deur`, tekst: `Noem de code ${b.ophaalcode}.`, href };
      case 'bezig':
        return oppas
          ? { id, rol: 'eigenaar', tijd, icoon: 'home', titel: 'De oppas is begonnen', tekst: `${hond} is in goede handen bij ${naam}. Fijne avond!`, href }
          : { id, rol: 'eigenaar', tijd, icoon: 'walk', titel: 'De wandeling is begonnen', tekst: `${hond} is op pad met ${naam}.`, href };
      case 'afgerond':
        return b.soort === 'betaald'
          ? oppas
            ? { id, rol: 'eigenaar', tijd, icoon: 'home', titel: 'De oppas is klaar', tekst: `Bekijk hoe het ging met ${hond}.`, href: `/rapport/${b.id}` }
            : { id, rol: 'eigenaar', tijd, icoon: 'home', titel: `${hond} is weer thuis`, tekst: 'Bekijk het wandelrapport.', href: `/rapport/${b.id}` }
          : null;
      default:
        return null;
    }
  }
  return { id, rol: 'eigenaar', tijd, icoon: 'camera', titel: `Nieuwe foto van ${hond}`, tekst: `${naam} stuurde een foto.`, href };
}
