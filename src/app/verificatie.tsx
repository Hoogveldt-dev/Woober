import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bewerkbaar } from '../components/Bewerkbaar';
import { gedeeldeStijl } from '../components/blokken';
import { KnopOpSlot } from '../components/Slotje';
import { Knop, Melding } from '../components/ui';
import { koppelMollie, mijnKoppeling, MOLLIE_KOPPELEN_KLAAR, type Koppelstatus } from '../lib/betalen';
import { klaarVoorWerk, useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Verificatie } from '../types';
import { useTekst } from '../state/Teksten';

// Geen verzekering en geen VOG: de eigenaar blijft aansprakelijk voor de hond, en een VOG kost geld en tijd
const STAPPEN: { id: keyof Verificatie; titel: string; tekst: string; icoon: ComponentProps<typeof Ionicons>['name'] }[] = [
  {
    id: 'identiteit',
    titel: 'Identiteit',
    tekst: 'Foto van je paspoort of ID-kaart en een selfie, in de app. Gecontroleerd door onze betaalpartner; Woober bewaart zelf geen kopie.',
    icoon: 'id-card',
  },
  {
    id: 'uitbetaling',
    titel: 'Rekening voor uitbetaling',
    tekst: 'Een eigen account bij onze betaalpartner Mollie, met je IBAN. Daar komt je saldo op als je uitbetaalt; Mollie controleert je gegevens.',
    icoon: 'card',
  },
];

export default function VerificatieScherm() {
  const router = useRouter();
  const { mijnProfiel, verifieer, modus } = useApp();
  const uitlegEcht = useTekst('verificatie.echt');
  if (!mijnProfiel) return null;
  const klaar = klaarVoorWerk(mijnProfiel);

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud}>
      <Text style={gedeeldeStijl.titel}>Veilig voor iedereen</Text>
      <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(5) }]}>Eigenaren geven je hun hond en soms hun sleutel. Daarom controleren we een paar dingen voordat je online kunt.</Text>

      <View style={s.stap}>
        <View style={[s.icoon, { backgroundColor: kleuren.goedVlak }]}>
          <Ionicons name="person" size={20} color={kleuren.like} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.titel}>14 jaar of ouder</Text>
          <Text style={s.tekst}>Bevestigd bij het aanmelden. Ben je jonger dan 18, dan met toestemming van je ouder of voogd.</Text>
        </View>
        <Ionicons name="checkmark-circle" size={24} color={kleuren.like} />
      </View>

      {STAPPEN.map((stap) => {
        const gedaan = mijnProfiel.verificatie[stap.id];
        return (
          <View key={stap.id} style={s.stap}>
            <View style={[s.icoon, { backgroundColor: gedaan ? kleuren.goedVlak : kleuren.vlak }]}>
              <Ionicons name={stap.icoon} size={20} color={gedaan ? kleuren.like : kleuren.gedempt} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.titel}>{stap.titel}</Text>
              <Text style={s.tekst}>{stap.tekst}</Text>
              {!gedaan && modus === 'demo' ? <Knop titel="Controleren (demo)" variant="secundair" onPress={() => verifieer(stap.id)} stijl={{ marginTop: ruimte(2), alignSelf: 'flex-start', height: 42 }} /> : null}
              {!gedaan && modus === 'echt' && stap.id === 'uitbetaling' ? (
                MOLLIE_KOPPELEN_KLAAR ? (
                  <MollieKoppeling />
                ) : (
                  <View style={{ marginTop: ruimte(2) }}>
                    <KnopOpSlot titel="Koppelen via Mollie" icoon="card" />
                  </View>
                )
              ) : null}
            </View>
            {gedaan ? <Ionicons name="checkmark-circle" size={24} color={kleuren.like} /> : null}
          </View>
        );
      })}

      {klaar ? (
        <>
          <Melding type="goed">Alles is in orde. Je kunt online gaan wanneer je wilt.</Melding>
          <Knop titel="Naar de kaart" icoon="navigate" onPress={() => router.replace('/werk')} stijl={{ marginTop: ruimte(3) }} />
        </>
      ) : (
        <Bewerkbaar sleutels="verificatie.echt">
          <Melding type="info">
            {modus === 'echt'
              ? uitlegEcht
              : 'In de echte app regelt onze betaalpartner de controle van je identiteit en je rekening, in de app. In deze demo vink je de stappen zelf af.'}
          </Melding>
        </Bewerkbaar>
      )}
    </ScrollView>
  );
}

/** Echte uitlaters: eigen Mollie-account koppelen en zien hoe ver dat is (Edge Functions mollie-aansluiten en mollie-oauth) */
function MollieKoppeling() {
  const { mollie } = useLocalSearchParams<{ mollie?: string }>();
  const [status, setStatus] = useState<Koppelstatus | undefined>(undefined);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      mijnKoppeling().then(setStatus, () => setStatus(null));
    }, []),
  );
  const koppel = async () => {
    setBezig(true);
    setFout(null);
    try {
      await koppelMollie();
      setStatus(await mijnKoppeling());
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Koppelen lukte niet.');
    } finally {
      setBezig(false);
    }
  };
  if (status === undefined) return null;
  const uitleg =
    status === 'in controle'
      ? 'Gekoppeld. Mollie controleert nu je gegevens; dat duurt meestal een paar werkdagen.'
      : status === 'gegevens nodig'
        ? 'Gekoppeld, maar Mollie heeft nog gegevens van je nodig. Vul ze aan bij Mollie.'
        : status === 'klaar'
          ? 'Je Mollie-account is klaar. Staat het vinkje er nog niet, open de app dan opnieuw.'
          : null;
  return (
    <View style={{ gap: ruimte(2), marginTop: ruimte(2) }}>
      {mollie === 'afgebroken' || mollie === 'mislukt' ? <Melding type="fout">Koppelen met Mollie is niet gelukt. Probeer het nog eens.</Melding> : null}
      {uitleg ? <Melding type="info">{uitleg}</Melding> : null}
      {status === 'gegevens nodig' ? (
        <Knop titel="Verder bij Mollie" variant="secundair" icoon="open-outline" onPress={() => Linking.openURL('https://my.mollie.com/dashboard')} stijl={{ alignSelf: 'flex-start', height: 42 }} />
      ) : status !== 'in controle' && status !== 'klaar' ? (
        <Knop titel="Koppelen via Mollie" icoon="card" uitgeschakeld={bezig} onPress={koppel} stijl={{ alignSelf: 'flex-start', height: 42 }} />
      ) : null}
      {fout ? <Melding type="fout">{fout}</Melding> : null}
    </View>
  );
}

const s = StyleSheet.create({
  stap: { flexDirection: 'row', gap: ruimte(3), padding: ruimte(4), borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, marginBottom: ruimte(3), alignItems: 'flex-start' },
  icoon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titel: { fontSize: 16, fontWeight: '800', color: kleuren.tekst },
  tekst: { fontSize: 13, color: kleuren.gedempt, lineHeight: 18 },
});
