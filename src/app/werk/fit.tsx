import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bewerkbaar } from '../../components/Bewerkbaar';
import { Blok, gedeeldeStijl, Sectie, Tegel } from '../../components/blokken';
import { Slotje } from '../../components/Slotje';
import { Stappenteller } from '../../components/Stappenteller';
import { Knop, Kop } from '../../components/ui';
import { venster } from '../../lib/fit';
import { bewaarRecenteDagen, stappenStatus, vraagToestemming, type StappenStatus } from '../../lib/stappen';
import { afgerondeOpdrachten } from '../../lib/verdiensten';
import { useApp } from '../../state/AppContext';
import { useTekst } from '../../state/Teksten';
import { kleuren, radius, ruimte } from '../../theme';

/** Nog niet gekoppeld: wat de beheerder eerst moet regelen staat in ACTIES.md */
const KOPPELINGEN: { naam: string; sub: string; icoon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { naam: 'Apple Fitness', sub: 'Via Apple Gezondheid', icoon: 'logo-apple' },
  { naam: 'Google Fit', sub: 'Via Health Connect', icoon: 'logo-google' },
  { naam: 'Strava', sub: 'Wandelingen en routes', icoon: 'pulse' },
  { naam: 'Garmin', sub: 'Van je horloge', icoon: 'watch' },
];

/**
 * Woober Fit, de tab Fit van uitlaters: je eigen stappen per dag, week en maand, hoeveel je deze week met honden
 * hebt gewandeld, en koppelingen met fitness-apps (nog op slot). Verdiensten staan onder Account.
 */
export default function WooberFit() {
  const { modus } = useApp();
  const intro = useTekst('fit.intro');
  const [nu, setNu] = useState(() => new Date());
  const [status, setStatus] = useState<StappenStatus | null>(null);

  // Bij elk openen van de tab de stappen verversen
  useFocusEffect(
    useCallback(() => {
      setNu(new Date());
      if (modus !== 'echt') return;
      let weg = false;
      stappenStatus().then((st) => {
        if (weg) return;
        setStatus(st);
        if (st === 'aan') bewaarRecenteDagen(new Date()).catch(() => undefined);
      });
      return () => {
        weg = true;
      };
    }, [modus]),
  );

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['top']}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud}>
        <Kop>Woober Fit</Kop>
        <Bewerkbaar sleutels="fit.intro" leeg={!intro.trim()} stijl={{ marginTop: ruimte(1) }}>
          <Text style={gedeeldeStijl.sub}>{intro}</Text>
        </Bewerkbaar>
        <View style={{ height: ruimte(5) }} />

        <Sectie>Stappen</Sectie>
        <View style={s.kaart}>
          {modus === 'demo' ? (
            <Stappenteller bron="demo" nu={nu} />
          ) : status === null ? (
            <ActivityIndicator color={kleuren.primair} style={{ marginVertical: ruimte(8) }} />
          ) : status === 'aan' ? (
            <Stappenteller bron="telefoon" nu={nu} />
          ) : (
            <StappenUit status={status} onStatus={setStatus} />
          )}
        </View>
        <Text style={[gedeeldeStijl.hulp, s.onder]}>
          {modus === 'demo'
            ? 'In de demo zijn de stappen verzonnen. De afstand is een schatting.'
            : status === 'aan'
              ? 'Je stappen blijven op je telefoon; Woober stuurt ze nergens heen. Je iPhone bewaart ze 7 dagen. Open Woober Fit af en toe, dan blijven je week en maand compleet.'
              : 'Je stappen blijven op je telefoon; Woober stuurt ze nergens heen.'}
        </Text>

        <MetHonden />

        <Sectie>Koppelingen</Sectie>
        <Blok stijl={{ marginBottom: ruimte(2) }}>
          {KOPPELINGEN.map((k) => (
            <View key={k.naam} style={s.koppeling} accessible accessibilityLabel={`${k.naam}, nog niet beschikbaar`} accessibilityState={{ disabled: true }}>
              <View style={s.koppelingIcoon}>
                <Ionicons name={k.icoon} size={20} color={kleuren.gedempt} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.koppelingNaam}>{k.naam}</Text>
                <Text style={s.koppelingSub}>{k.sub}</Text>
              </View>
              <Slotje />
            </View>
          ))}
        </Blok>
        <Text style={[gedeeldeStijl.hulp, s.onder]}>Koppelen kan binnenkort. Je kiest dan zelf wat Woober mag lezen, en je kunt het altijd weer uitzetten.</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

/** Uitlaatopdrachten die deze week (vanaf maandag) zijn afgerond */
function MetHonden() {
  const { boekingen, modus } = useApp();
  const [nu] = useState(() => new Date());
  const begin = venster('week', 0, nu).begin.getTime();
  const deze = afgerondeOpdrachten(boekingen).filter((b) => b.dienst === 'uitlaten' && (b.beeindigd ?? 0) >= begin);
  const minuten = deze.reduce((t, b) => t + b.duur, 0);
  const honden = deze.reduce((t, b) => t + b.hondIds.length, 0);
  return (
    <>
      <Sectie>Deze week met honden</Sectie>
      {deze.length > 0 ? (
        <View style={s.tegels}>
          <Tegel waarde={String(deze.length)} label={deze.length === 1 ? 'wandeling' : 'wandelingen'} />
          <Tegel waarde={minuten < 90 ? `${minuten} min` : `${(minuten / 60).toFixed(1).replace('.', ',')} uur`} label="gewandeld" klein />
          <Tegel waarde={String(honden)} label={honden === 1 ? 'hond' : 'honden'} />
        </View>
      ) : (
        <Text style={[gedeeldeStijl.hulp, s.onder]}>
          {modus === 'demo'
            ? 'Nog geen wandelingen deze week. Ga online op het werkscherm, dan komen er verzoeken binnen.'
            : 'Zodra je via Woober honden uitlaat, zie je hier hoeveel je met ze wandelt.'}
        </Text>
      )}
    </>
  );
}

/** Echte accounts waarbij de telefoon (nog) geen stappen geeft */
function StappenUit({ status, onStatus }: { status: Exclude<StappenStatus, 'aan'>; onStatus: (s: StappenStatus) => void }) {
  if (status === 'vragen') {
    return (
      <View style={s.uit}>
        <Ionicons name="footsteps" size={36} color={kleuren.primair} />
        <Text style={s.uitTekst}>Woober telt je stappen met de bewegingssensor van je iPhone. Je ziet dan per dag, week en maand hoeveel je loopt.</Text>
        <Knop titel="Stappen tellen aanzetten" icoon="footsteps" onPress={() => vraagToestemming().then(onStatus)} />
      </View>
    );
  }
  if (status === 'geweigerd') {
    return (
      <View style={s.uit}>
        <Ionicons name="footsteps" size={36} color={kleuren.gedempt} />
        <Text style={s.uitTekst}>Woober mag je stappen nog niet lezen. Zet Beweging en fitness aan bij Woober in de instellingen van je iPhone.</Text>
        <Knop titel="Naar Instellingen" variant="secundair" icoon="settings" onPress={() => Linking.openSettings()} />
      </View>
    );
  }
  return (
    <View style={s.uit}>
      <Ionicons name="footsteps" size={36} color={kleuren.gedempt} />
      <Text style={s.uitTekst}>
        {Platform.OS === 'web'
          ? 'Stappen tellen werkt in de Woober-app op je telefoon, niet in de browser.'
          : Platform.OS === 'android'
            ? 'Op Android haalt Woober je stappen straks uit Google Fit en Health Connect. Die koppeling staat hieronder en komt binnenkort.'
            : 'Dit apparaat houdt geen stappen bij.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4) },
  onder: { marginTop: ruimte(2), marginBottom: ruimte(5) },
  tegels: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(5) },
  koppeling: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingVertical: 13, paddingHorizontal: ruimte(4), borderBottomWidth: 1, borderBottomColor: kleuren.vlak },
  koppelingIcoon: { width: 34, height: 34, borderRadius: 17, backgroundColor: kleuren.vlak, alignItems: 'center', justifyContent: 'center' },
  koppelingNaam: { fontSize: 16, fontWeight: '600', color: kleuren.gedempt },
  koppelingSub: { fontSize: 13, color: kleuren.gedempt, marginTop: 1 },
  uit: { alignItems: 'center', gap: ruimte(3), paddingVertical: ruimte(4) },
  uitTekst: { fontSize: 15, color: kleuren.tekst, textAlign: 'center', lineHeight: 21 },
});
