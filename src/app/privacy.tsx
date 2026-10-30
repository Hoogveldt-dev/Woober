import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bewerkbaar } from '../components/Bewerkbaar';
import { Melding } from '../components/ui';
import type { TekstSleutel } from '../lib/teksten';
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

interface Sectie {
  titel: string;
  alineas?: string[];
  punten?: string[];
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
      'Als uitlater of oppas: je profiel met tarieven, werkgebied, beschikbaarheid en leeftijd. Om je te kunnen verifiëren, ziet een medewerker van Woober je e-mailadres.',
      'Plekken en reviews die je schrijft. Andere gebruikers zien daarbij alleen je voornaam.',
      'Of je op de wachtlijst staat, zodat we je kunnen mailen zodra Woober in je buurt start. Afmelden kan op het startscherm.',
      'Wanneer je met de gebruiksvoorwaarden akkoord ging en welke versie dat was.',
      'Meldingen die je doet over een plek of review. Een medewerker leest die.',
      'Doel: je laten inloggen en je account, honden en profiel bewaren. Grondslag: de overeenkomst met jou (het gebruik van Woober).',
      'Andere gebruikers zien nooit je e-mailadres of adres. Een uitlater ziet het adres van een eigenaar pas na een geaccepteerde boeking.',
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
  const versie = useTekst('privacy.versie');
  const concept = useTekst('privacy.concept');
  return (
    <ScrollView contentContainerStyle={s.inhoud}>
      <Text style={s.kop}>Privacy- en cookieverklaring</Text>
      <Bewerkbaar sleutels="privacy.versie">
        <Text style={s.versie}>Versie {versie}</Text>
      </Bewerkbaar>
      <Bewerkbaar sleutels="privacy.concept" leeg={!concept.trim()}>
        <Melding type="waarschuwing">{concept}</Melding>
      </Bewerkbaar>

      {secties(organisatie).map((sectie) => (
        <View key={sectie.titel} style={s.sectie}>
          {/* Naam, KvK, adres en e-mail staan midden in de tekst; de hamer staat bij de kop */}
          {sectie.titel === 'Wie zijn wij' ? (
            <Bewerkbaar sleutels={['privacy.organisatie', 'privacy.kvk', 'privacy.adres', 'privacy.email'] as TekstSleutel[]}>
              <Text style={s.titel}>{sectie.titel}</Text>
            </Bewerkbaar>
          ) : (
            <Text style={s.titel}>{sectie.titel}</Text>
          )}
          {sectie.punten?.map((p) => (
            <View key={p} style={s.punt}>
              <Ionicons name="ellipse" size={6} color={kleuren.primair} style={{ marginTop: 8 }} />
              <Text style={s.tekst}>{p}</Text>
            </View>
          ))}
          {sectie.alineas?.map((a) => (
            <Text key={a} style={[s.tekst, s.alinea]}>
              {a}
            </Text>
          ))}
        </View>
      ))}

      <Text style={s.link} onPress={() => Linking.openURL('https://www.autoriteitpersoonsgegevens.nl')}>
        Naar de Autoriteit Persoonsgegevens
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  inhoud: { padding: ruimte(5), paddingBottom: ruimte(14), width: '100%', maxWidth: 680, alignSelf: 'center' },
  kop: { fontSize: 26, fontWeight: '900', color: kleuren.tekst, letterSpacing: -0.5 },
  versie: { fontSize: 13, color: kleuren.gedempt, marginTop: 4, marginBottom: ruimte(4) },
  sectie: { marginTop: ruimte(5), paddingTop: ruimte(4), borderTopWidth: 1, borderTopColor: kleuren.rand },
  titel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst, marginBottom: ruimte(2) },
  punt: { flexDirection: 'row', gap: 10, marginBottom: ruimte(2), alignItems: 'flex-start' },
  tekst: { flex: 1, fontSize: 15, color: kleuren.tekst, lineHeight: 22 },
  alinea: { marginBottom: ruimte(2) },
  link: { fontSize: 15, color: kleuren.primair, fontWeight: '700', marginTop: ruimte(6) },
});
