import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Sectie } from '../components/blokken';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import { useTekst } from '../state/Teksten';

type IconNaam = ComponentProps<typeof Ionicons>['name'];

function Punt({ icoon, titel, tekst }: { icoon: IconNaam; titel: string; tekst: string }) {
  return (
    <View style={s.punt}>
      <View style={s.icoon}>
        <Ionicons name={icoon} size={18} color={kleuren.primair} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.titel}>{titel}</Text>
        <Text style={s.tekst}>{tekst}</Text>
      </View>
    </View>
  );
}

export default function Veiligheid() {
  const { rol } = useApp();
  const nood = useTekst('veiligheid.nood');
  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud}>
      <View style={s.nood}>
        <Ionicons name="call" size={22} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={s.noodTitel}>Noodgeval</Text>
          <Text style={s.noodTekst}>{nood}</Text>
        </View>
      </View>

      {rol === 'eigenaar' ? (
        <>
          <Sectie>Zo beschermen we je hond</Sectie>
          <Punt icoon="hand-left" titel="Eerst kennismaken" tekst="Je eerste wandeling met een nieuwe uitlater boek je pas na een kennismaking." />
          <Punt icoon="keypad" titel="Ophaalcode" tekst="Je hond gaat alleen mee met iemand die jouw code van 4 cijfers krijgt." />
          <Punt icoon="id-card" titel="Gecontroleerde uitlaters" tekst="Iedere uitlater is 18 jaar of ouder, heeft een gecontroleerde identiteit en een aansprakelijkheidsverzekering." />
          <Punt icoon="navigate" titel="Live meekijken" tekst="Tijdens de wandeling zie je de route, foto's en plas- en poepmomenten." />
          <Punt icoon="star" titel="Echte reviews" tekst="Alleen wie een betaalde wandeling heeft gehad, kan een review schrijven." />
          <Punt icoon="key" titel="Sleutels" tekst="Deel sleutelcodes pas na een bevestigde boeking, en alleen via de chat in de app." />
          <Sectie>Oppas aan huis</Sectie>
          <Punt icoon="home" titel="Iemand in je huis" tekst="Kies voor oppas iemand die je al kent van een kennismaking. Leg huisregels, eten en de plek van de riem vast in je bericht." />
          <Punt icoon="videocam" titel="Camera's" tekst="Hangen er camera's in huis, meld dat bij het boeken. Iemand filmen zonder dat die het weet mag niet." />
          <Punt icoon="time" titel="Later thuis" tekst="Verleng in de app met een uur. De oppas ziet het direct; het extra uur betaal je achteraf." />
        </>
      ) : (
        <>
          <Sectie>Jij bepaalt</Sectie>
          <Punt icoon="pricetag" titel="Eigen tarief" tekst="Je kiest zelf wat je vraagt per wandeling. Woober rekent servicekosten bij de eigenaar en houdt commissie in." />
          <Punt icoon="close-circle" titel="Weigeren zonder gevolgen" tekst="Je kiest zelf welke verzoeken je aanneemt. We houden niet bij hoe vaak je weigert of afzegt." />
          <Punt icoon="time" titel="Werken wanneer je wilt" tekst="Online gaan, een rooster en een werkgebied: allemaal jouw keuze." />
          <Punt icoon="people" titel="Altijd een mens" tekst="Een melding over jou wordt altijd door een medewerker bekeken. Je krijgt uitleg en kunt reageren voordat er iets gebeurt." />
          <Sectie>Onderweg</Sectie>
          <Punt icoon="keypad" titel="Ophaalcode" tekst="Vraag bij de deur altijd om de code. Zo weet de eigenaar dat de juiste persoon de hond meeneemt." />
          <Punt icoon="umbrella" titel="Verzekerd" tekst="Je aansprakelijkheidsverzekering dekt schade die een hond onder jouw toezicht veroorzaakt, en bij oppas ook schade in het huis." />
          <Punt icoon="home" titel="Oppas aan huis" tekst="Je bent te gast. Ga alleen in de ruimtes die de eigenaar noemt, en meld camera's of iets vreemds via de app." />
        </>
      )}

      <Sectie>Regels in de gemeente</Sectie>
      <Punt icoon="link" titel="Aanlijnen" tekst="Buiten losloopgebieden geldt meestal een aanlijnplicht. Op de kaart zie je het losloopgebied in het Stadspark." />
      <Punt icoon="trash" titel="Opruimplicht" tekst="Poep altijd opruimen. Neem genoeg zakjes mee." />
      <Punt icoon="paw" titel="Aantal honden" tekst="Sommige gemeenten vragen een vergunning bij meer dan 3 honden tegelijk. Woober staat nooit meer dan 8 toe." />

      <Sectie>Privacy</Sectie>
      <Punt
        icoon="lock-closed"
        titel="Locatie alleen tijdens de wandeling"
        tekst="De uitlater deelt zijn locatie vanaf de start tot het einde van een wandeling, alleen met de eigenaar. Routes worden na 30 dagen verwijderd en niet gebruikt om uitlaters te beoordelen."
      />
      <Punt icoon="server" titel="In Europa" tekst="Alle gegevens staan op servers in de EU (Frankfurt)." />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  nood: { flexDirection: 'row', gap: ruimte(3), alignItems: 'center', backgroundColor: kleuren.nope, borderRadius: radius.midden, padding: ruimte(4), marginBottom: ruimte(4) },
  noodTitel: { color: '#fff', fontSize: 17, fontWeight: '800' },
  noodTekst: { color: '#fff', fontSize: 14, lineHeight: 19, marginTop: 2 },
  punt: { flexDirection: 'row', gap: ruimte(3), marginBottom: ruimte(4) },
  icoon: { width: 36, height: 36, borderRadius: 18, backgroundColor: kleuren.primairVlak, alignItems: 'center', justifyContent: 'center' },
  titel: { fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  tekst: { fontSize: 14, color: kleuren.gedempt, lineHeight: 20, marginTop: 2 },
});
