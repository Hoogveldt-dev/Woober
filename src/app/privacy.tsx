import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Melding } from '../components/ui';
import { kleuren, ruimte } from '../theme';

/**
 * Privacy- en cookieverklaring voor de demo (AVG art. 13, Telecommunicatiewet art. 11.7a).
 * De demo slaat niets op; vervang deze tekst zodra echte accounts en Supabase erin zitten.
 * Op het web ook bereikbaar via woober.nl/privacy; die link is nodig voor App Store en Google Play.
 */
const ORGANISATIE = {
  naam: '[Naam onderneming] (handelsnaam Woober)',
  kvk: '[KvK-nummer]',
  adres: '[Vestigingsadres]',
  email: '[privacy@woober.nl]',
};
const VERSIE = '22 oktober 2026';
const IS_CONCEPT = true;

interface Sectie {
  titel: string;
  alineas?: string[];
  punten?: string[];
}

const SECTIES: Sectie[] = [
  {
    titel: 'Wie zijn wij',
    alineas: [
      `Woober is een app waarmee hondeneigenaren een uitlater of oppas uit de buurt boeken. ${ORGANISATIE.naam} is verantwoordelijk voor de verwerking van je persoonsgegevens (verwerkingsverantwoordelijke).`,
      `KvK-nummer: ${ORGANISATIE.kvk}. Adres: ${ORGANISATIE.adres}. Vragen over privacy: ${ORGANISATIE.email}.`,
    ],
  },
  {
    titel: 'Dit is een demo',
    alineas: [
      'Deze versie van Woober is een demo. Alle uitlaters, eigenaren, honden, boekingen en betalingen zijn verzonnen. Wat je invult, zoals een naam, je hond of een bericht, blijft alleen in het geheugen van je browser of telefoon en verdwijnt als je de pagina ververst of de app sluit. We sturen het nergens naartoe en bewaren het niet.',
      'De demo gebruikt geen locatie, geen camera en geen echte kaartdienst; de kaart is een verzonnen wijk die in de app zelf getekend wordt.',
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
      'De demo plaatst geen cookies en slaat niets op in je browser. We gebruiken geen analysediensten, advertenties of trackers.',
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
  return (
    <ScrollView contentContainerStyle={s.inhoud}>
      <Text style={s.kop}>Privacy- en cookieverklaring</Text>
      <Text style={s.versie}>Versie {VERSIE}</Text>
      {IS_CONCEPT ? <Melding type="waarschuwing">Concept. Deze tekst is nog niet definitief en nog niet juridisch gecontroleerd.</Melding> : null}

      {SECTIES.map((sectie) => (
        <View key={sectie.titel} style={s.sectie}>
          <Text style={s.titel}>{sectie.titel}</Text>
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
