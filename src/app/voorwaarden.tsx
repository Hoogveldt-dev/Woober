import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bewerkbaar } from '../components/Bewerkbaar';
import { Melding } from '../components/ui';
import type { TekstSleutel } from '../lib/teksten';
import { useTekst } from '../state/Teksten';
import { kleuren, ruimte } from '../theme';

/**
 * Gebruiksvoorwaarden (concept). Ook zonder account bereikbaar via woober.nl/voorwaarden; nodig voor de stores.
 * De keuzes volgen PLAN.md: marktplaats (Wet platformwerk), P2B-verordening voor uitlaters, DSA voor melden.
 * Naam, KvK, adres, contact, versie en de conceptwaarschuwing past een beheerder aan onder Beheer, Teksten.
 */
interface Gegevens {
  naam: string;
  kvk: string;
  adres: string;
  contact: string;
}

interface Sectie {
  titel: string;
  alineas?: string[];
  punten?: string[];
}

const secties = (g: Gegevens): Sectie[] => [
  {
    titel: '1. Wat Woober is',
    alineas: [
      `Woober is een online platform van ${g.naam} (KvK ${g.kvk}, ${g.adres}). Op Woober vinden hondeneigenaren mensen uit de buurt die hun hond uitlaten of op hun hond passen, en delen gebruikers hondvriendelijke plekken met reviews.`,
      'Woober brengt eigenaren en uitlaters bij elkaar, maar is zelf geen partij bij de afspraak tussen hen. De uitlater of oppas werkt zelfstandig: die bepaalt zelf het tarief, het werkgebied, de tijden en of een verzoek wordt aangenomen. Een verzoek weigeren heeft geen gevolgen en wordt niet bijgehouden. De eigenaar kiest zelf wie de hond uitlaat.',
    ],
  },
  {
    titel: '2. Je account',
    punten: [
      'Je bent 18 jaar of ouder en vult je eigen, juiste gegevens in. Eén account per persoon.',
      'Houd je inloggegevens voor jezelf. Wat er met je account gebeurt, valt onder jouw verantwoordelijkheid.',
      'Je kunt je account altijd zelf verwijderen in de app (Account, Account verwijderen).',
    ],
  },
  {
    titel: '3. Als eigenaar',
    punten: [
      'Je geeft eerlijke informatie over je hond: gedrag, gezondheid, medicijnen, angsten en hoe die met andere honden omgaat.',
      'Je blijft als eigenaar aansprakelijk voor schade die je hond veroorzaakt (artikel 6:179 Burgerlijk Wetboek). Een aansprakelijkheidsverzekering voor je hond is verstandig.',
      'Bij oppas aan huis meld je vooraf of er camera’s hangen. Iemand filmen zonder dat die het weet, mag niet.',
      'Je geeft je hond alleen mee aan iemand die de juiste ophaalcode noemt.',
    ],
  },
  {
    titel: '4. Als uitlater of oppas',
    punten: [
      'Je werkt als zelfstandige, niet in dienst van Woober. Je zorgt zelf voor belastingaangifte en, als dat nodig is, een inschrijving bij de KvK.',
      'Wat je verdient, komt op je saldo. Dat geld staat bij onze betaalpartner, een betaalinstelling met een vergunning, niet bij Woober. Je laat het uitbetalen wanneer je wilt, vanaf 10 euro of je hele saldo; staat geld 90 dagen op je saldo, dan maken we het automatisch over. Boek je zelf een uitlater of oppas, dan kun je met je saldo betalen; je geeft Woober daarmee toestemming dat bedrag van je saldo af te schrijven. Je account verwijderen kan als je saldo is uitbetaald.',
      'Voordat eigenaren je zien, controleert Woober je identiteit, je aansprakelijkheidsverzekering en je rekening. Een Verklaring Omtrent het Gedrag is niet verplicht.',
      'Je volgt de regels van de gemeente, zoals aanlijnen, opruimen en het maximum aantal honden tegelijk, en nooit meer dan acht honden.',
      'Je neemt een hond alleen mee na de juiste ophaalcode en deelt je locatie alleen tijdens de wandeling, met de eigenaar van die hond.',
    ],
  },
  {
    titel: '5. Boeken, prijs en annuleren',
    alineas: [
      'Zodra boeken in jouw buurt beschikbaar is, gelden deze regels. Je ziet vooraf de volledige prijs: het tarief van de uitlater, eventuele toeslagen en eventuele kosten van Woober. Annuleren is gratis tot 2 uur van tevoren, of zolang de uitlater nog niet onderweg is; daarna krijgt de uitlater 50% van het tarief. Fooi gaat volledig naar de uitlater. Betaal altijd via de app, zodat de afspraak en de verzekering duidelijk zijn.',
      'Kwam de uitlater niet opdagen of zegde die op het laatste moment af, meld dat dan in de app bij de boeking. Een medewerker van Woober beoordeelt de melding en vraagt de uitlater om een reactie. Krijg je gelijk, dan betaal je niets voor die boeking en krijg je terug wat je al betaalde. Andere gebruikers zien de melding niet.',
    ],
  },
  {
    titel: '6. Plekken en reviews',
    punten: [
      'Schrijf alleen over je eigen ervaring, eerlijk en zonder beledigingen, reclame of persoonsgegevens van anderen. Voeg geen woonadressen toe als plek.',
      'Een plek die je toevoegt, is meteen zichtbaar. Een medewerker kijkt er daarna naar en kan hem aanpassen of verbergen.',
      'Je blijft eigenaar van je tekst, maar geeft Woober toestemming om die in de app en op woober.nl te tonen zolang je account bestaat.',
      'Regels van plekken kunnen veranderen. Kijk ter plekke altijd op de borden.',
    ],
  },
  {
    titel: '7. Melden, blokkeren en schorsen',
    alineas: [
      'Je kunt een gebruiker, plek of review melden en een gebruiker blokkeren. Een medewerker beoordeelt elke melding; er beslist nooit alleen een computer. Neemt Woober een maatregel, zoals een review verwijderen of een account schorsen, dan leggen we uit waarom en kun je daarop reageren.',
    ],
  },
  {
    titel: '8. Aansprakelijkheid',
    alineas: [
      'Woober doet zijn best om het platform goed en veilig te laten werken, maar kan niet instaan voor wat eigenaren en uitlaters onderling afspreken of doen. Woober is niet aansprakelijk voor schade die ontstaat tijdens een wandeling of oppas, behalve bij opzet of grove schuld van Woober zelf. Dwingende rechten die je als consument hebt, blijven altijd gelden.',
    ],
  },
  {
    titel: '9. Wijzigingen',
    alineas: [
      'Woober kan deze voorwaarden aanpassen. We melden een wijziging vooraf in de app. Voor uitlaters en oppassen kondigen we een wijziging die voor hen nadelig is, zoals een hogere commissie, minstens 15 dagen van tevoren aan.',
    ],
  },
  {
    titel: '10. Vragen en klachten',
    alineas: [
      `Mail naar ${g.contact}. Op deze voorwaarden is Nederlands recht van toepassing. Komen we er samen niet uit, dan kun je naar de bevoegde rechter in Nederland.`,
    ],
  },
];

export default function Voorwaarden() {
  const gegevens: Gegevens = {
    naam: useTekst('privacy.organisatie'),
    kvk: useTekst('privacy.kvk'),
    adres: useTekst('privacy.adres'),
    contact: useTekst('contact.email'),
  };
  const versie = useTekst('voorwaarden.versie');
  const concept = useTekst('voorwaarden.concept');
  return (
    <ScrollView contentContainerStyle={s.inhoud}>
      <Text style={s.kop}>Gebruiksvoorwaarden</Text>
      <Bewerkbaar sleutels="voorwaarden.versie">
        <Text style={s.versie}>Versie {versie}</Text>
      </Bewerkbaar>
      <Bewerkbaar sleutels="voorwaarden.concept" leeg={!concept.trim()}>
        <Melding type="waarschuwing">{concept}</Melding>
      </Bewerkbaar>
      {secties(gegevens).map((sectie) => (
        <View key={sectie.titel} style={s.sectie}>
          {/* Naam, KvK, adres en e-mail staan midden in de tekst; de hamer staat bij de kop */}
          {sectie.titel === '1. Wat Woober is' ? (
            <Bewerkbaar sleutels={['privacy.organisatie', 'privacy.kvk', 'privacy.adres', 'contact.email'] as TekstSleutel[]}>
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
});
