import { Linking, StyleSheet, Text } from 'react-native';
import { JuridischeTekst, type Sectie } from '../components/JuridischeTekst';
import { useTekst } from '../state/Teksten';
import { kleuren, ruimte } from '../theme';

/**
 * Privacy- en cookieverklaring (AVG art. 13, Telecommunicatiewet art. 11.7a).
 * Vul deze aan zodra er meer echt wordt: boekingen, locatie, betalingen, foto's en pushmeldingen.
 * Op het web ook bereikbaar via woober.nl/privacy; die link is nodig voor App Store en Google Play.
 */
// Naam, KvK, adres, e-mail, versie en de conceptwaarschuwing past een beheerder aan onder Beheer, Teksten.
interface Organisatie {
  naam: string;
  kvk: string;
  adres: string;
  email: string;
}


const secties = (ORGANISATIE: Organisatie): Sectie[] => [
  {
    titel: 'Wie zijn wij',
    alineas: [
      `Woober is een app waarmee hondeneigenaren een uitlater of oppas uit de buurt boeken. ${ORGANISATIE.naam} is verantwoordelijk voor de verwerking van je persoonsgegevens (verwerkingsverantwoordelijke).`,
      `KvK-nummer: ${ORGANISATIE.kvk}. Adres: ${ORGANISATIE.adres}. Vragen over privacy: ${ORGANISATIE.email}.`,
    ],
  },
  {
    titel: 'Welke gegevens we bewaren',
    punten: [
      'Je account: je e-mailadres en, als je inlogt met Apple of Google, de naam die je daar gebruikt. Bij Apple kun je je e-mailadres verbergen; we krijgen dan een doorstuuradres.',
      'Wat je zelf invult: voornaam, adres, postcode en woonplaats, en of je eigenaar of uitlater bent.',
      'Je honden: naam, ras, geboortedatum, karakter, bijzonderheden en dierenarts.',
      'Als uitlater of oppas: je profiel met tarieven, werkgebied, beschikbaarheid en leeftijd, en als je honden thuis ontvangt een beschrijving van je huis (zonder adres). Om je te kunnen verifiëren, ziet een medewerker van Woober je e-mailadres.',
      'Plekken en reviews die je schrijft. Andere gebruikers zien daarbij alleen je voornaam.',
      'Of je op de wachtlijst staat, zodat we je kunnen mailen zodra Woober in je buurt start. Afmelden kan op het startscherm.',
      'Wanneer je met de gebruiksvoorwaarden akkoord ging en welke versie dat was.',
      'Meldingen die je doet over een plek of review. Een medewerker leest die.',
      'Doel: je laten inloggen en je account, honden en profiel bewaren. Grondslag: de overeenkomst met jou (het gebruik van Woober).',
      'Andere gebruikers zien nooit je e-mailadres, en je adres alleen voor een boeking die is geaccepteerd: een uitlater of oppas dat van de eigenaar, niet als je de hond op een ander punt afgeeft; bij oppas bij de oppas thuis ziet de eigenaar het adres van de oppas. Afspraken over je huis (camera’s, wat de oppas mag gebruiken, wat privé is) ziet alleen de oppas van die boeking, al bij het verzoek.',
    ],
  },
  {
    titel: 'Waar en hoe lang',
    punten: [
      'We bewaren je gegevens bij Supabase, in een datacenter in Frankfurt (Duitsland). Supabase verwerkt ze in onze opdracht. Supabase is een Amerikaans bedrijf; doorgifte buiten de Europese Unie gebeurt op basis van het EU-VS Data Privacy Framework of de standaardcontractbepalingen van de Europese Commissie.',
      'We bewaren je gegevens zolang je een account hebt. Verwijder je je account in de app (Account, Account verwijderen), dan verwijderen we je profiel, adres, honden, uitlaatprofiel, reviews en wachtlijst direct. Plekken die je hebt toegevoegd blijven staan voor anderen, zonder je naam. Alleen betaalgegevens die we volgens de wet zeven jaar moeten bewaren, houden we, zonder je naam.',
    ],
  },
  {
    titel: 'De kaart',
    alineas: [
      'De kaart komt van PDOK, de dienst voor kaarten van de Nederlandse overheid (Kadaster). Je telefoon of browser haalt de kaartbeelden daar rechtstreeks op; PDOK ziet daarbij je IP-adres, net als bij elke website. De app gebruikt je eigen locatie niet.',
    ],
  },
  {
    titel: 'Betalen en uitbetalen',
    alineas: [
      'Betalingen en uitbetalingen lopen via Mollie B.V. in Amsterdam, een betaalinstelling met een vergunning van De Nederlandsche Bank. Je betaalgegevens geef je op de betaalpagina van Mollie, niet aan Woober. Woober bewaart per betaling alleen het kenmerk, het bedrag, de betaalmethode en of het gelukt is. Laat je een betaling via je bank terugdraaien, dan bewaren we ook dat, en wat een medewerker daarover besloot.',
      'Als uitlater koppel je een eigen account bij Mollie; Mollie controleert daarbij je identiteit en je rekening. Woober bewaart alleen het kenmerk van je Mollie-account, hoe ver het aansluiten is en een sleutel om dat bij Mollie op te vragen.',
      'Mollie verwerkt deze gegevens ook zelf, volgens zijn eigen privacyverklaring. Grondslag voor Woober: de overeenkomst met jou.',
    ],
  },
  {
    titel: 'Woober Fit',
    alineas: [
      'Op een iPhone kan Woober je stappen tellen met de bewegingssensor van je telefoon, alleen als je dat zelf aanzet en toestemming geeft. Woober bewaart je stappen per dag op je telefoon, zodat je ook je week en maand ziet. Ze gaan niet naar Woober of naar anderen, en verdwijnen van je telefoon als je uitlogt of je account verwijdert. Je toestemming intrekken kan in de instellingen van je iPhone, bij Woober.',
      'Koppelingen met Apple Gezondheid, Google Fit, Strava en Garmin zijn er nog niet. Komen ze er, dan passen we deze verklaring eerst aan.',
    ],
  },
  {
    titel: 'Nog in opbouw',
    alineas: [
      'Boeken, chatten en betalen zijn nog niet beschikbaar. De demo op het welkomscherm laat zien hoe het gaat werken; wat je in de demo doet, blijft alleen op je eigen apparaat en verdwijnt als je de app sluit. Zodra boeken, locatie tijdens een wandeling, foto’s of betalen echt worden, passen we deze verklaring aan en laten we het je weten.',
    ],
  },
  {
    titel: 'Hosting',
    punten: [
      'De web-app op woober.nl staat bij Netlify. Netlify legt bij elk verzoek technische gegevens vast, zoals je IP-adres, het tijdstip en je browser (serverlogs), om de site te leveren en te beveiligen. Netlify verwerkt deze gegevens in onze opdracht en bewaart ze kort.',
      'Netlify is een Amerikaans bedrijf. Doorgifte buiten de Europese Unie gebeurt op basis van het EU-VS Data Privacy Framework of de standaardcontractbepalingen van de Europese Commissie.',
      'Grondslag: ons gerechtvaardigd belang om de site veilig en bereikbaar te houden.',
    ],
  },
  {
    titel: 'Cookies',
    alineas: [
      'Als je inlogt, bewaart Woober een inlogsleutel op je apparaat (in de browser in de lokale opslag), zodat je ingelogd blijft. Dat is nodig om de app te laten werken; daar vragen we geen toestemming voor. Bij uitloggen verdwijnt hij. We gebruiken geen analysediensten, advertenties of trackers.',
    ],
  },
  {
    titel: 'Jouw rechten',
    alineas: [
      `Je mag vragen welke gegevens we van je hebben en die laten inzien, verbeteren of verwijderen, en je mag bezwaar maken. Mail naar ${ORGANISATIE.email}. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.`,
    ],
  },
];

export default function Privacy() {
  const organisatie: Organisatie = {
    naam: useTekst('privacy.organisatie'),
    kvk: useTekst('privacy.kvk'),
    adres: useTekst('privacy.adres'),
    email: useTekst('privacy.email'),
  };
  return (
    <JuridischeTekst
      kop="Privacy- en cookieverklaring"
      versie="privacy.versie"
      concept="privacy.concept"
      gegevens={['privacy.organisatie', 'privacy.kvk', 'privacy.adres', 'privacy.email']}
      secties={secties(organisatie)}
    >
      <Text style={s.link} onPress={() => Linking.openURL('https://www.autoriteitpersoonsgegevens.nl')}>
        Naar de Autoriteit Persoonsgegevens
      </Text>
    </JuridischeTekst>
  );
}

const s = StyleSheet.create({
  link: { fontSize: 15, color: kleuren.primair, fontWeight: '700', marginTop: ruimte(6) },
});
