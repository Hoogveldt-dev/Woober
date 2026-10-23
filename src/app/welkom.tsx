import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/merk';
import { Knop } from '../components/ui';
import { useApp } from '../state/AppContext';
import { kleuren, ruimte } from '../theme';

export default function Welkom() {
  const router = useRouter();
  const { demoStart } = useApp();

  return (
    <LinearGradient colors={kleuren.verloop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={s.vol}>
        <View style={s.midden}>
          <Logo grootte={88} kleur="#fff" binnen={kleuren.primair} />
          <Text style={s.logo}>woober</Text>
          <Text style={s.slogan}>Uitlaten of oppas voor je hond, door iemand uit de buurt. Zo geregeld.</Text>
        </View>

        <View style={s.knoppen}>
          <Knop titel="Account aanmaken" variant="secundair" stijl={s.witteKnop} onPress={() => router.push('/aanmelden')} />
          <View style={s.demoRij}>
            <Knop titel="Demo eigenaar" variant="tekst" icoon="paw" tekstKleur="#fff" stijl={{ flex: 1 }} onPress={() => demoStart('eigenaar')} />
            <Knop titel="Demo uitlater" variant="tekst" icoon="bicycle" tekstKleur="#fff" stijl={{ flex: 1 }} onPress={() => demoStart('uitlater')} />
          </View>
          <Text style={s.klein}>
            Het zusje van Woofer. Uitlaters bepalen zelf hun tarief en beschikbaarheid, en jij kiest zelf wie je hond uitlaat.
          </Text>
          <Text style={s.klein}>
            Dit is een demo met verzonnen gegevens; er wordt niets opgeslagen.{' '}
            <Text style={s.link} onPress={() => router.push('/privacy')}>
              Privacy
            </Text>
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  vol: { flex: 1, justifyContent: 'space-between', padding: ruimte(6) },
  midden: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#fff', fontSize: 56, fontWeight: '900', letterSpacing: -2, marginTop: ruimte(1) },
  slogan: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: ruimte(3), maxWidth: 320, lineHeight: 25, opacity: 0.95 },
  knoppen: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  witteKnop: { backgroundColor: '#fff', borderColor: '#fff' },
  demoRij: { flexDirection: 'row', gap: ruimte(2), marginTop: ruimte(2) },
  klein: { color: '#fff', opacity: 0.85, fontSize: 12, textAlign: 'center', marginTop: ruimte(4), lineHeight: 17 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
});
