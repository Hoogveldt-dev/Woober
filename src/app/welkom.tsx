import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bewerkbaar } from '../components/Bewerkbaar';
import { Logo } from '../components/merk';
import { Knop } from '../components/ui';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import { useTekst } from '../state/Teksten';

export default function Welkom() {
  return <WelkomScherm />;
}

/** Ook te zien voor beheerders onder Beheer, Welkomscherm bekijken (`voorbeeld`): dan doen de knoppen niets */
export function WelkomScherm({ voorbeeld }: { voorbeeld?: boolean }) {
  const router = useRouter();
  const { demoStart: start } = useApp();
  const demoStart = (rol: 'eigenaar' | 'uitlater') => !voorbeeld && start(rol);
  const slogan = useTekst('welkom.slogan');
  const knop = useTekst('welkom.knop');
  const ondertitel = useTekst('welkom.ondertitel');
  const demoUitleg = useTekst('welkom.demo');
  const [demoKeuze, setDemoKeuze] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={kleuren.verloop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={s.vol}>
        <View style={s.midden}>
          <Logo grootte={88} kleur="#fff" binnen={kleuren.primair} />
          <Text style={s.logo}>woober</Text>
          <Bewerkbaar sleutels="welkom.slogan">
            <Text style={s.slogan}>{slogan}</Text>
          </Bewerkbaar>
        </View>

        <View style={s.knoppen}>
          <Bewerkbaar sleutels="welkom.knop">
            <Knop titel={knop} variant="secundair" stijl={s.witteKnop} onPress={() => !voorbeeld && router.push('/aanmelden')} />
          </Bewerkbaar>
          <Bewerkbaar sleutels="welkom.ondertitel">
            <Text style={s.klein}>{ondertitel}</Text>
          </Bewerkbaar>
          <Text style={s.klein}>
            <Text style={s.link} onPress={() => !voorbeeld && router.push('/privacy')}>
              Privacy
            </Text>
            {'   '}
            <Text style={s.link} onPress={() => !voorbeeld && router.push('/voorwaarden')}>
              Voorwaarden
            </Text>
          </Text>
        </View>

        {/* Eerst rondkijken zonder account: de demo met verzonnen gegevens, klein linksonder (rechtsonder zit op het web het Netlify-logo) */}
        <View style={[s.demo, { bottom: insets.bottom + ruimte(4), left: insets.left + ruimte(4) }]} pointerEvents="box-none">
          {demoKeuze ? (
            <View style={s.demoKaart}>
              <Bewerkbaar sleutels="welkom.demo">
                <Text style={s.demoUitleg}>{demoUitleg}</Text>
              </Bewerkbaar>
              <Pressable onPress={() => demoStart('eigenaar')} accessibilityRole="button" style={({ pressed }) => [s.demoOptie, pressed && { opacity: 0.6 }]}>
                <Ionicons name="paw" size={15} color={kleuren.primair} />
                <Text style={s.demoOptieTekst}>Als eigenaar</Text>
              </Pressable>
              <Pressable onPress={() => demoStart('uitlater')} accessibilityRole="button" style={({ pressed }) => [s.demoOptie, pressed && { opacity: 0.6 }]}>
                <Ionicons name="bicycle" size={15} color={kleuren.primair} />
                <Text style={s.demoOptieTekst}>Als uitlater</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            onPress={() => setDemoKeuze((k) => !k)}
            accessibilityRole="button"
            accessibilityLabel={demoKeuze ? 'Demo sluiten' : 'Demo bekijken'}
            style={({ pressed }) => [s.demoKnop, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name={demoKeuze ? 'close' : 'eye-outline'} size={14} color="#fff" />
            <Text style={s.demoKnopTekst}>{demoKeuze ? 'Sluiten' : 'Demo bekijken'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  vol: { flex: 1, justifyContent: 'space-between', padding: ruimte(6), paddingBottom: ruimte(14) },
  midden: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#fff', fontSize: 56, fontWeight: '900', letterSpacing: -2, marginTop: ruimte(1) },
  slogan: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: ruimte(3), maxWidth: 320, lineHeight: 25, opacity: 0.95 },
  knoppen: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  witteKnop: { backgroundColor: '#fff', borderColor: '#fff' },
  demo: { position: 'absolute', alignItems: 'flex-start', gap: ruimte(2) },
  demoKnop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.rond,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  demoKnopTekst: { color: '#fff', fontSize: 12, fontWeight: '700' },
  demoKaart: { backgroundColor: '#fff', borderRadius: radius.midden, padding: ruimte(3), width: 210, gap: ruimte(1) },
  demoUitleg: { fontSize: 12, color: kleuren.gedempt, lineHeight: 16, marginBottom: ruimte(1) },
  demoOptie: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), paddingVertical: 8 },
  demoOptieTekst: { fontSize: 14, fontWeight: '700', color: kleuren.tekst },
  klein: { color: '#fff', opacity: 0.85, fontSize: 12, textAlign: 'center', marginTop: ruimte(4), lineHeight: 17 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
});
