import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { KaartPunt } from '../lib/kaart';
import { plekPunt } from '../lib/plekken';
import { begroeting } from '../lib/tijd';
import { staOpWachtlijst, zetOpWachtlijst } from '../lib/wachtlijst';
import { klaarVoorWerk, useApp } from '../state/AppContext';
import { useTekst } from '../state/Teksten';
import { kleuren, radius, ruimte, schaduw } from '../theme';
import { Bewerkbaar } from './Bewerkbaar';
import { Blad, RondeKnop } from './blokken';
import { EchteKaart } from './EchteKaart';
import { Woordmerk } from './merk';
import { Knop, Melding } from './ui';

/**
 * Startscherm voor echte accounts zolang boeken nog niet echt kan (stap 3 in PLAN.md): de kaart met
 * hondenplekken, de wachtlijst en, voor uitlaters, de stand van de verificatie. Geen verzonnen uitlaters of verzoeken.
 */
function StartEcht({ children }: { children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plekken } = useApp();
  const [bladHoogte, setBladHoogte] = useState(320);
  const punten = useMemo(() => plekken.map((p) => plekPunt(p)).filter((x): x is KaartPunt => x !== null), [plekken]);

  return (
    <View style={s.scherm}>
      <EchteKaart punten={punten} bovenmarge={insets.top + 64} ondermarge={bladHoogte} onKies={(id) => router.push({ pathname: '/plek/[id]', params: { id } })} />
      <View style={[s.boven, { top: insets.top + ruimte(2) }]} pointerEvents="box-none">
        <View style={[s.merkPil, schaduw]}>
          <Woordmerk grootte={20} />
        </View>
        <RondeKnop icoon="shield-checkmark" label="Veiligheid en hulp" kleur={kleuren.primair} onPress={() => router.push('/veiligheid')} />
      </View>
      <Blad onHoogte={setBladHoogte}>{children}</Blad>
    </View>
  );
}

function Wachtlijst() {
  const { rol } = useApp();
  const knop = useTekst('start.knop_wachtlijst');
  const opLijst = useTekst('start.op_wachtlijst');
  const [aan, setAan] = useState<boolean | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  useEffect(() => {
    staOpWachtlijst().then(setAan, () => setAan(false));
  }, []);
  const wissel = async () => {
    setFout(null);
    try {
      await zetOpWachtlijst(rol, !aan);
      setAan(!aan);
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Dat lukte niet.');
    }
  };
  if (aan === null) return null;
  return (
    <>
      {aan ? (
        <View style={s.opLijst}>
          <Ionicons name="checkmark-circle" size={20} color={kleuren.like} />
          <Bewerkbaar sleutels="start.op_wachtlijst" stijl={{ flex: 1 }}>
            <Text style={s.opLijstTekst}>{opLijst}</Text>
          </Bewerkbaar>
          <Text style={s.afmelden} onPress={wissel} accessibilityRole="button">
            Afmelden
          </Text>
        </View>
      ) : (
        <Bewerkbaar sleutels="start.knop_wachtlijst">
          <Knop titel={knop} icoon="notifications" onPress={wissel} />
        </Bewerkbaar>
      )}
      {fout ? <Melding type="fout">{fout}</Melding> : null}
    </>
  );
}

function Groet() {
  const { gebruiker } = useApp();
  const mededeling = useTekst('mededeling.tekst');
  return (
    <>
      <Text style={s.groet}>
        {begroeting()}, {gebruiker?.voornaam}
      </Text>
      <Bewerkbaar sleutels="mededeling.tekst" leeg={!mededeling.trim()}>
        <Melding type="info">{mededeling}</Melding>
      </Bewerkbaar>
    </>
  );
}

export function EigenaarStartEcht() {
  const router = useRouter();
  const binnenkort = useTekst('start.binnenkort_eigenaar');
  const titel = useTekst('start.titel_eigenaar');
  return (
    <StartEcht>
      <Groet />
      <View style={s.kaartje}>
        <Bewerkbaar sleutels="start.titel_eigenaar">
          <Text style={s.titel}>{titel}</Text>
        </Bewerkbaar>
        <Bewerkbaar sleutels="start.binnenkort_eigenaar" leeg={!binnenkort.trim()}>
          <Text style={s.tekst}>{binnenkort}</Text>
        </Bewerkbaar>
        <Wachtlijst />
      </View>
      <Knop titel="Plekken voor je hond" variant="secundair" icoon="location" onPress={() => router.push('/plekken')} />
    </StartEcht>
  );
}

export function UitlaterStartEcht() {
  const router = useRouter();
  const { mijnProfiel } = useApp();
  const binnenkort = useTekst('start.binnenkort_uitlater');
  const klaar = mijnProfiel ? klaarVoorWerk(mijnProfiel) : false;
  return (
    <StartEcht>
      <Groet />
      <View style={s.kaartje}>
        <Text style={s.titel}>{klaar ? 'Je profiel is gecontroleerd' : 'Nog even en je staat klaar'}</Text>
        <Bewerkbaar sleutels="start.binnenkort_uitlater" leeg={!binnenkort.trim()}>
          <Text style={s.tekst}>{binnenkort}</Text>
        </Bewerkbaar>
        {klaar ? (
          <Wachtlijst />
        ) : (
          <Knop titel="Verificatie bekijken" icoon="shield-checkmark" onPress={() => router.push('/verificatie')} />
        )}
      </View>
      <Knop titel="Profiel en tarief" variant="secundair" icoon="create" onPress={() => router.push('/profiel-uitlater')} />
    </StartEcht>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  boven: { position: 'absolute', left: ruimte(4), right: ruimte(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merkPil: { backgroundColor: '#fff', borderRadius: radius.rond, paddingHorizontal: ruimte(4), paddingVertical: ruimte(2) },
  groet: { fontSize: 24, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.5, marginBottom: ruimte(3) },
  kaartje: { backgroundColor: kleuren.vlak, borderRadius: radius.midden, padding: ruimte(4), gap: ruimte(3), marginBottom: ruimte(3) },
  titel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  tekst: { fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
  opLijst: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), flexWrap: 'wrap' },
  opLijstTekst: { flex: 1, fontSize: 14, fontWeight: '600', color: kleuren.tekst },
  afmelden: { fontSize: 13, color: kleuren.gedempt, textDecorationLine: 'underline' },
});
