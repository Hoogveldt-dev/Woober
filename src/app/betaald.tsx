import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl } from '../components/blokken';
import { Knop } from '../components/ui';
import { betaalstatus } from '../lib/betalen';
import { kleuren, ruimte } from '../theme';

/**
 * Hier komt de eigenaar terug van de betaalpagina van Mollie. De webhook verwerkt de betaling; dit scherm wacht tot de
 * stand in de database staat. Mollie zegt niet zelf of het gelukt is, daarom vragen we het een paar keer op.
 */
export default function Betaald() {
  const router = useRouter();
  const { boeking } = useLocalSearchParams<{ boeking?: string }>();
  const [status, setStatus] = useState<'open' | 'betaald' | 'mislukt' | null>(null);
  const [opgegeven, setOpgegeven] = useState(false);

  useEffect(() => {
    if (!boeking) return;
    let keer = 0;
    let weg = false;
    const kijk = async () => {
      const st = await betaalstatus(boeking).catch(() => null);
      if (weg) return;
      setStatus(st);
      if (st === 'betaald' || st === 'mislukt') return;
      if (++keer >= 15) setOpgegeven(true);
      else setTimeout(kijk, 2000);
    };
    kijk();
    return () => {
      weg = true;
    };
  }, [boeking]);

  const naarActiviteit = () => router.replace('/activiteit');

  return (
    <View style={[gedeeldeStijl.scherm, s.midden]}>
      {status === 'betaald' ? (
        <>
          <Ionicons name="checkmark-circle" size={64} color={kleuren.like} />
          <Text style={s.titel}>Betaald</Text>
          <Text style={s.tekst}>Je aanvraag is verstuurd. Je hoort het zodra de uitlater heeft gereageerd. Annuleer je op tijd, dan krijg je alles terug.</Text>
          <Knop titel="Naar je boekingen" onPress={naarActiviteit} stijl={{ marginTop: ruimte(4) }} />
        </>
      ) : status === 'mislukt' ? (
        <>
          <Ionicons name="close-circle" size={64} color={kleuren.nope} />
          <Text style={s.titel}>Betaling niet gelukt</Text>
          <Text style={s.tekst}>Er is niets afgeschreven en je aanvraag is niet verstuurd. Probeer het nog eens.</Text>
          <Knop titel="Naar de start" onPress={() => router.replace('/')} stijl={{ marginTop: ruimte(4) }} />
        </>
      ) : opgegeven || !boeking ? (
        <>
          <Ionicons name="time" size={64} color={kleuren.gedempt} />
          <Text style={s.titel}>Nog geen bevestiging</Text>
          <Text style={s.tekst}>We hebben nog niets van de bank gehoord. Onder Activiteit zie je de stand zodra die er is.</Text>
          <Knop titel="Naar je boekingen" variant="secundair" onPress={naarActiviteit} stijl={{ marginTop: ruimte(4) }} />
        </>
      ) : (
        <>
          <ActivityIndicator color={kleuren.primair} />
          <Text style={s.tekst}>We wachten op de bevestiging van je betaling.</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  midden: { alignItems: 'center', justifyContent: 'center', padding: ruimte(8), gap: ruimte(2) },
  titel: { fontSize: 22, fontWeight: '800', color: kleuren.tekst, marginTop: ruimte(2) },
  tekst: { fontSize: 15, color: kleuren.gedempt, textAlign: 'center', lineHeight: 21, maxWidth: 420 },
});
