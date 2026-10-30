import { supabase } from './supabase';

/**
 * Teksten die een beheerder in de app zelf aanpast (Account, Beheer, Teksten). De standaard staat hier;
 * aanpassingen staan in de tabel teksten en gelden voor alle gebruikers, ook zonder account.
 * Nieuwe aanpasbare tekst: voeg hem hier toe en gebruik useTekst() in het scherm. De database hoeft niet mee.
 */
export interface TekstDefinitie {
  groep: string;
  label: string;
  standaard: string;
  /** Uitleg voor de beheerder, bijvoorbeeld wat een lege tekst doet */
  hulp?: string;
  /** Langere tekst in een groter invulveld */
  lang?: boolean;
}

export const TEKSTEN = {
  'mededeling.tekst': {
    groep: 'Mededeling',
    label: 'Mededeling voor iedereen',
    standaard: '',
    hulp: 'Staat bovenaan het startscherm van eigenaren en uitlaters. Leeg laten om niets te tonen.',
    lang: true,
  },
  'welkom.slogan': { groep: 'Welkomscherm', label: 'Slogan', standaard: 'Uitlaten of oppas voor je hond, door iemand uit de buurt. Zo geregeld.', lang: true },
  'welkom.knop': { groep: 'Welkomscherm', label: 'Knop', standaard: 'Inloggen of account maken' },
  'welkom.ondertitel': {
    groep: 'Welkomscherm',
    label: 'Tekst onder de knop',
    standaard: 'Het zusje van Woofer. Uitlaters bepalen zelf hun tarief en beschikbaarheid, en jij kiest zelf wie je hond uitlaat.',
    lang: true,
  },
  'welkom.zusterapp': {
    groep: 'Welkomscherm',
    label: 'Zin over Woofer',
    standaard: 'Op zoek naar een betrouwbare fokpartner voor je hond?',
    hulp: 'Onderaan het welkomscherm, gevolgd door de link "Probeer Woofer". Leeg laten om de link weg te halen.',
  },
  'welkom.demo': { groep: 'Welkomscherm', label: 'Uitleg bij Demo bekijken', standaard: 'Kijk rond met verzonnen gegevens. Er wordt niets opgeslagen.' },
  'inloggen.titel': { groep: 'Inloggen', label: 'Titel', standaard: 'Welkom bij Woober' },
  'inloggen.sub': { groep: 'Inloggen', label: 'Ondertitel', standaard: 'Log in of maak een account. Nieuw? Dan vul je daarna je gegevens aan.', lang: true },
  'inloggen.privacy': {
    groep: 'Inloggen',
    label: 'Zin over je e-mailadres',
    standaard: 'Je e-mailadres zien andere gebruikers nooit. Woober gebruikt het alleen om je in te laten loggen en je over je boekingen te berichten.',
    lang: true,
  },
  'start.titel_eigenaar': { groep: 'Startscherm', label: 'Titel voor eigenaren', standaard: 'Uitlaten en oppas in jouw buurt' },
  'start.knop_wachtlijst': { groep: 'Startscherm', label: 'Knop voor de wachtlijst', standaard: 'Laat het me weten' },
  'start.op_wachtlijst': { groep: 'Startscherm', label: 'Tekst als je op de wachtlijst staat', standaard: 'Je staat op de lijst. We mailen je zodra het kan.' },
  'start.binnenkort_eigenaar': {
    groep: 'Startscherm',
    label: 'Melding voor eigenaren',
    standaard: 'Woober zoekt nu uitlaters en oppassen in jouw buurt. Zet jezelf op de wachtlijst, dan hoor je het als eerste zodra je kunt boeken.',
    hulp: 'Op het startscherm van echte accounts, boven de knop voor de wachtlijst. Leeg laten om niets te tonen.',
    lang: true,
  },
  'start.binnenkort_uitlater': {
    groep: 'Startscherm',
    label: 'Melding voor uitlaters',
    standaard: 'Zodra eigenaren in jouw buurt kunnen boeken, komen hun verzoeken hier binnen. Rond alvast je verificatie af, dan sta je klaar.',
    hulp: 'Op het startscherm van echte uitlaters. Leeg laten om niets te tonen.',
    lang: true,
  },
  'fit.intro': {
    groep: 'Woober Fit',
    label: 'Tekst onder de titel',
    standaard: 'Ga wandelen en neem een hond mee. Hier zie je hoeveel je loopt, per dag, week en maand.',
    hulp: 'Bovenaan de tab Fit van uitlaters. Leeg laten om niets te tonen.',
    lang: true,
  },
  'verificatie.echt': {
    groep: 'Uitlaters',
    label: 'Uitleg bij verificatie',
    standaard: 'Je profiel is opgeslagen. Woober neemt per e-mail contact met je op om je identiteit, verzekering en rekening te controleren. Daarna kun je online.',
    lang: true,
  },
  'veiligheid.nood': {
    groep: 'Veiligheid',
    label: 'Noodgeval',
    standaard: '112 bij gevaar voor mensen. 144 voor dieren in nood. Meld daarna ook een incident in de app.',
    lang: true,
  },
  'contact.email': {
    groep: 'Contact',
    label: 'E-mailadres voor hulp',
    standaard: '[hulp@woober.nl]',
    hulp: 'Staat bij Veiligheid en hulp, onder Account en in de gebruiksvoorwaarden.',
  },
  'voorwaarden.versie': { groep: 'Gebruiksvoorwaarden', label: 'Datum van deze versie', standaard: '30 oktober 2026', hulp: 'Bij het aanmelden bewaren we welke versie iemand heeft geaccepteerd.' },
  'voorwaarden.concept': {
    groep: 'Gebruiksvoorwaarden',
    label: 'Waarschuwing bovenaan',
    standaard: 'Concept. Deze voorwaarden zijn nog niet definitief en nog niet juridisch gecontroleerd.',
    hulp: 'Leeg laten zodra de voorwaarden definitief zijn.',
  },
  'privacy.organisatie': { groep: 'Privacyverklaring', label: 'Naam onderneming', standaard: 'Woofer Inc. (handelsnaam Woober)' },
  'privacy.kvk': { groep: 'Privacyverklaring', label: 'KvK-nummer', standaard: '71670912' },
  'privacy.adres': { groep: 'Privacyverklaring', label: 'Vestigingsadres', standaard: 'Kwekerijweg 81, 6525 RZ Nijmegen' },
  'privacy.email': { groep: 'Privacyverklaring', label: 'E-mailadres voor privacyvragen', standaard: '[privacy@woober.nl]' },
  'privacy.versie': { groep: 'Privacyverklaring', label: 'Datum van deze versie', standaard: '30 oktober 2026' },
  'privacy.concept': {
    groep: 'Privacyverklaring',
    label: 'Waarschuwing bovenaan',
    standaard: 'Concept. Deze tekst is nog niet definitief en nog niet juridisch gecontroleerd.',
    hulp: 'Leeg laten zodra de verklaring definitief is.',
  },
} satisfies Record<string, TekstDefinitie>;

export type TekstSleutel = keyof typeof TEKSTEN;
export type Aanpassingen = Partial<Record<TekstSleutel, string>>;

const OPSLAG = 'woober.teksten';

/** Laatst bekende aanpassingen op dit apparaat, zodat de app meteen de goede tekst toont */
export function bewaardeAanpassingen(): Aanpassingen {
  try {
    return JSON.parse(localStorage.getItem(OPSLAG) ?? '{}') as Aanpassingen;
  } catch {
    return {};
  }
}

export async function laadAanpassingen(): Promise<Aanpassingen> {
  const { data, error } = await supabase.from('teksten').select('sleutel, waarde');
  if (error) throw new Error(error.message);
  const uit: Aanpassingen = {};
  for (const r of data ?? []) if (r.sleutel in TEKSTEN) uit[r.sleutel as TekstSleutel] = r.waarde;
  try {
    localStorage.setItem(OPSLAG, JSON.stringify(uit));
  } catch {
    // Zonder opslag werkt het ook; dan komt de tekst pas na het laden
  }
  return uit;
}

export async function bewaarTekst(sleutel: TekstSleutel, waarde: string) {
  const { error } = await supabase.from('teksten').upsert({ sleutel, waarde });
  if (error) throw new Error(error.message.includes('row-level security') ? 'Alleen beheerders kunnen teksten aanpassen.' : 'Opslaan lukte niet. Probeer het nog eens.');
}

export async function zetTekstTerug(sleutel: TekstSleutel) {
  const { error } = await supabase.from('teksten').delete().eq('sleutel', sleutel);
  if (error) throw new Error('Terugzetten lukte niet. Probeer het nog eens.');
}
