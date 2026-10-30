import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bewerkbaar } from '../components/Bewerkbaar';
import { gedeeldeStijl } from '../components/blokken';
import { Badge, Knop, Melding } from '../components/ui';
import { klaarVoorWerk, useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Verificatie } from '../types';
import { useTekst } from '../state/Teksten';

const STAPPEN: { id: keyof Verificatie; titel: string; tekst: string; icoon: ComponentProps<typeof Ionicons>['name']; verplicht: boolean }[] = [
  {
    id: 'identiteit',
    titel: 'Identiteit',
    tekst: 'Foto van je paspoort of ID-kaart en een selfie. Gecontroleerd door Stripe Identity; Woober bewaart zelf geen kopie.',
    icoon: 'id-card',
    verplicht: true,
  },
  {
    id: 'verzekering',
    titel: 'Aansprakelijkheidsverzekering',
    tekst: 'Een polis die schade dekt die een hond onder jouw toezicht veroorzaakt. Een gewone AVP dekt dit vaak niet bij betaald uitlaten.',
    icoon: 'umbrella',
    verplicht: true,
  },
  {
    id: 'uitbetaling',
    titel: 'Rekening voor uitbetaling',
    tekst: 'Je eigen IBAN via Stripe Connect. Werk je als bedrijf, dan vul je hier ook je KvK-nummer in.',
    icoon: 'card',
    verplicht: true,
  },
  {
    id: 'vog',
    titel: 'Verklaring Omtrent het Gedrag',
    tekst: 'Optioneel. Eigenaren zien een VOG als extra vertrouwen op je profiel.',
    icoon: 'document-text',
    verplicht: false,
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
          <Text style={s.titel}>18 jaar of ouder</Text>
          <Text style={s.tekst}>Bevestigd bij het aanmelden.</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={s.titel}>{stap.titel}</Text>
                {!stap.verplicht ? <Badge tekst="OPTIONEEL" kleur={kleuren.gedempt} /> : null}
              </View>
              <Text style={s.tekst}>{stap.tekst}</Text>
              {!gedaan && modus === 'demo' ? <Knop titel="Controleren (demo)" variant="secundair" onPress={() => verifieer(stap.id)} stijl={{ marginTop: ruimte(2), alignSelf: 'flex-start', height: 42 }} /> : null}
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
              : 'In de echte app regelt Stripe de controle van je identiteit en je rekening. In deze demo vink je de stappen zelf af.'}
          </Melding>
        </Bewerkbaar>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  stap: { flexDirection: 'row', gap: ruimte(3), padding: ruimte(4), borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, marginBottom: ruimte(3), alignItems: 'flex-start' },
  icoon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titel: { fontSize: 16, fontWeight: '800', color: kleuren.tekst },
  tekst: { fontSize: 13, color: kleuren.gedempt, lineHeight: 18 },
});
