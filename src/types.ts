/** Positie op de demokaart. 1 eenheid is 1 meter. Later: breedte- en lengtegraad. */
export interface Punt {
  x: number;
  y: number;
}

export type Rol = 'eigenaar' | 'uitlater';

/** Wat je boekt, zoals de ritsoorten bij Uber: een wandeling of oppas aan huis */
export type Dienst = 'uitlaten' | 'oppas';

/** Duur van een wandeling in minuten */
export type WandelDuur = 30 | 45 | 60;
/** Duur van oppas aan huis in minuten */
export type OppasDuur = 120 | 180 | 240 | 300;

export type Grootte = 'klein' | 'middel' | 'groot';
export type Energie = 'rustig' | 'gemiddeld' | 'energiek';
export type Aanlijnen = 'altijd' | 'losloop-ok';
export type MetHonden = 'goed' | 'soms' | 'liever-niet';

export interface Hond {
  id: string;
  naam: string;
  /** Ras of "Kruising" */
  ras: string;
  /** ISO-datum, bijv. 2022-04-15 */
  geboortedatum: string;
  grootte: Grootte;
  energie: Energie;
  aanlijnen: Aanlijnen;
  metHonden: MetHonden;
  /** Karakter in eigen woorden */
  karakter: string;
  /** Medicatie, allergieën, angsten, trekken aan de lijn */
  bijzonderheden: string;
  dierenarts: string;
  /** Twee kleuren voor de avatar, tot er echte foto's zijn */
  kleur: [string, string];
}

export type Dag = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = maandag
export type Dagdeel = 'ochtend' | 'middag' | 'avond';
export type Beschikbaarheid = Record<Dag, Dagdeel[]>;

export type Vervoer = 'lopend' | 'fiets' | 'auto';

export interface Review {
  id: string;
  van: string;
  sterren: number;
  tekst: string;
  /** Unix-tijd in ms */
  datum: number;
}

export interface Verificatie {
  identiteit: boolean;
  verzekering: boolean;
  uitbetaling: boolean;
  /** Verklaring Omtrent het Gedrag: open punt of dit gevraagd mag worden */
  vog: boolean;
}

export interface Uitlater {
  id: string;
  voornaam: string;
  leeftijd: number;
  /** Wijk of plaats, nooit het adres */
  wijk: string;
  bio: string;
  ervaring: string;
  /** Professionele uitlaatservice met KvK-nummer, of particulier */
  professioneel: boolean;
  bedrijfsnaam?: string;
  /** Welke diensten deze persoon aanbiedt */
  diensten: Dienst[];
  /** Eigen tarief van de uitlater in centen, per wandelduur */
  tarieven: Record<WandelDuur, number>;
  /** Eigen uurtarief voor oppas aan huis in centen, 0 als die dienst niet wordt aangeboden */
  oppasPerUur: number;
  /** Toeslag per extra hond van hetzelfde huishouden, in centen */
  toeslagExtraHond: number;
  maxHonden: number;
  werkgebiedKm: number;
  vervoer: Vervoer;
  beschikbaarheid: Beschikbaarheid;
  verificatie: Verificatie;
  beoordeling: number;
  aantalBeoordelingen: number;
  aantalWandelingen: number;
  reageertBinnen: string;
  reviews: Review[];
  positie: Punt;
  online: boolean;
  kleur: [string, string];
}

/** Hondeneigenaar zoals een uitlater die ziet (demo-klanten in uitlatermodus) */
export interface Klant {
  id: string;
  voornaam: string;
  wijk: string;
  adres: string;
  positie: Punt;
  honden: Hond[];
  beoordeling: number;
}

export type Moment =
  | { type: 'nu' }
  | { type: 'later'; tijdstip: number }
  | { type: 'wekelijks'; dagen: Dag[]; tijd: string };

export type Betaalmethode = 'ideal' | 'applepay' | 'kaart';
export type Sleutel = 'thuis' | 'kastje' | 'overhandigd';

/**
 * Prijs van één boeking, in centen. Wordt bij de boeking bewaard, met het verdienmodel waarmee hij is berekend,
 * zodat een latere wijziging van het model niets verandert aan eerdere boekingen.
 */
export interface PrijsOpbouw {
  /** Verdienmodel waarmee deze prijs is berekend (zie src/lib/verdienmodel.ts) */
  modelId: string;
  /** Eigen tarief van de uitlater */
  tarief: number;
  /** Toeslag voor extra honden, ook door de uitlater bepaald */
  toeslag: number;
  /** Drukte-factor op het moment van boeken; 1 betekent geen drukte */
  drukteFactor: number;
  /** Drukte-toeslag bovenop tarief en toeslag */
  drukte: number;
  /** Deel van de drukte-toeslag dat naar de uitlater gaat */
  drukteUitlater: number;
  servicekosten: number;
  /** Eigenaar had het abonnement (Woober Plus) en kreeg daardoor korting op de servicekosten */
  plus: boolean;
  /** Vast bedrag per boeking voor de eigenaar */
  boekingskosten: number;
  /** Tegoed of korting, betaald door Woober */
  korting: number;
  /** Wat de eigenaar betaalt, zonder fooi */
  totaal: number;
  commissie: number;
  /** Wat de uitlater ontvangt, zonder fooi */
  uitbetaling: number;
  /** Wat Woober overhoudt vóór betaalkosten; negatief als Woober korting geeft */
  platform: number;
}

export type BoekingStatus =
  | 'aangevraagd'
  | 'gepland'
  | 'onderweg'
  | 'aangekomen'
  | 'bezig'
  | 'afgerond'
  | 'geannuleerd'
  | 'geweigerd';

export type GebeurtenisSoort = 'start' | 'foto' | 'plas' | 'poep' | 'water' | 'eten' | 'spelen' | 'slapen' | 'notitie' | 'einde' | 'incident';

export interface WandelGebeurtenis {
  id: string;
  soort: GebeurtenisSoort;
  tijd: number;
  /** Plek op de wandelroute, van 0 tot 1. Bij oppas: tijd sinds de start als deel van de basisduur. */
  voortgang: number;
  tekst?: string;
  /** Plaatsvervanger voor een foto */
  kleur?: [string, string];
}

export interface Beoordeling {
  sterren: number;
  tags: string[];
  tekst: string;
}

export interface Boeking {
  id: string;
  /** Betaalde boeking (uitlaten of oppas, zie dienst) of een gratis kennismaking */
  soort: 'betaald' | 'kennismaking';
  dienst: Dienst;
  /** Vanuit welke rol de gebruiker deze boeking ziet */
  mijnRol: Rol;
  uitlaterId: string;
  /** Alleen in uitlatermodus: de eigenaar die boekt */
  klantId?: string;
  hondIds: string[];
  /** Geboekte duur in minuten */
  duur: number;
  moment: Moment;
  serieId?: string;
  ophaalPunt: Punt;
  adres: string;
  sleutel: Sleutel;
  notitie: string;
  /** Alleen bij oppas: de eigenaar meldt vooraf dat er camera's in huis hangen */
  cameraInHuis?: boolean;
  betaalmethode: Betaalmethode;
  prijs: PrijsOpbouw;
  fooi: number;
  status: BoekingStatus;
  statusSinds: number;
  aangemaakt: number;
  /** Code die de eigenaar bij de overdracht aan de uitlater geeft */
  ophaalcode: string;
  startPositie: Punt;
  routeNaarOphaal: Punt[];
  wandelroute: Punt[];
  gebeurtenissen: WandelGebeurtenis[];
  scriptStap: number;
  gestart?: number;
  /** Geboekte duur op het moment van starten. Verlengen verandert alleen duur, zodat eerdere momenten op hun plek blijven. */
  basisDuur?: number;
  beeindigd?: number;
  annuleringskosten?: number;
  beoordelingDoorMij?: Beoordeling;
  reden?: string;
}

export interface Serie {
  id: string;
  uitlaterId: string;
  dienst: Dienst;
  hondIds: string[];
  duur: number;
  dagen: Dag[];
  tijd: string;
  actief: boolean;
  prijs: PrijsOpbouw;
}

export interface Bericht {
  id: string;
  van: 'ik' | 'ander';
  tekst: string;
  tijd: number;
}

export interface Gesprek {
  /** Id van de ander: een uitlater of een klant */
  id: string;
  rol: Rol;
  berichten: Bericht[];
}

export interface Gebruiker {
  voornaam: string;
  email: string;
  postcode: string;
  plaats: string;
  /** Straat en huisnummer. Een uitlater ziet dit pas na een geaccepteerde boeking. */
  adres: string;
  /** Alleen in de demo: vaste plek op de kaart */
  thuis: Punt;
}

export interface AppMelding {
  id: string;
  rol: Rol;
  titel: string;
  tekst: string;
  icoon: 'checkmark-circle' | 'bicycle' | 'home' | 'camera' | 'walk' | 'notifications' | 'chatbubble' | 'alert-circle' | 'cash';
  href?: string;
  tijd: number;
}

export interface BoekConcept {
  dienst: Dienst;
  hondIds: string[];
  duur: number;
  moment: Moment;
  uitlaterId: string | null;
}

/** Plekken op de kaart voor hondeneigenaren en uitlaters */
export type PlekSoort = 'losloop' | 'strand' | 'horeca' | 'overig';

/** Review van een plek door een gebruiker. Eén per persoon per plek, aan te passen. */
export interface PlekReview {
  id: string;
  /** Alleen de voornaam */
  van: string;
  sterren: number;
  tekst: string;
  /** Unix-tijd in ms */
  datum: number;
  /** Door de gebruiker zelf geschreven */
  vanMij?: boolean;
  /** Alleen bij echte plekken: account van de schrijver, om te kunnen melden */
  auteurId?: string;
}

export interface Plek {
  id: string;
  soort: PlekSoort;
  naam: string;
  punt: Punt;
  omschrijving: string;
  /** Korte feiten, zoals "Omheind" of "Waterbak bij de deur" */
  kenmerken: string[];
  /** Regels die per seizoen of tijdstip verschillen, zoals een strandverbod in de zomer */
  regels?: string;
  reviews: PlekReview[];
  /** Voornaam van de gebruiker die de plek heeft toegevoegd; leeg als Woober hem heeft toegevoegd */
  toegevoegdDoor?: string;
  /** Door de gebruiker zelf toegevoegd */
  vanMij?: boolean;
  /** Een medewerker heeft de plek bekeken. Nieuwe plekken van gebruikers zijn meteen zichtbaar, met een label. */
  gecontroleerd: boolean;
  /** Alleen bij echte plekken uit de database: de plek op de wereldkaart. De demo gebruikt `punt`. */
  ligging?: { lat: number; lng: number };
  /** Woonplaats of gemeente van de plek */
  plaats?: string;
  /** Alleen bij echte plekken: account van de toevoeger, om te kunnen melden */
  toegevoegdDoorId?: string;
  /** Alleen voor beheerders zichtbaar als die 'verborgen' is */
  status?: 'nieuw' | 'gecontroleerd' | 'verborgen';
}

/** Wat een gebruiker invult bij het toevoegen van een plek */
export type NieuwePlek = Pick<Plek, 'soort' | 'naam' | 'punt' | 'omschrijving' | 'kenmerken' | 'regels' | 'ligging'>;
