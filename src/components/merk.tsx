import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte, schaduw } from '../theme';
import type { AppMelding } from '../types';

/** Beeldmerk: een locatiespeld met een pootje, in de kleuren van Woofer */
export function Logo({ grootte, kleur = kleuren.primair, binnen = '#fff' }: { grootte: number; kleur?: string; binnen?: string }) {
  return (
    <View style={{ width: grootte, height: grootte }}>
      <MaterialCommunityIcons name="map-marker" size={grootte} color={kleur} />
      <MaterialCommunityIcons
        name="paw"
        size={grootte * 0.34}
        color={binnen}
        style={{ position: 'absolute', top: grootte * 0.19, left: (grootte - grootte * 0.34) / 2 }}
      />
    </View>
  );
}

export function Woordmerk({ grootte = 26, kleur = kleuren.primair }: { grootte?: number; kleur?: string }) {
  return (
    <View style={s.woordmerk}>
      <Logo grootte={grootte * 1.15} kleur={kleur} binnen={kleur === '#fff' ? kleuren.primair : '#fff'} />
      <Text style={[s.woord, { fontSize: grootte, color: kleur }]}>woober</Text>
    </View>
  );
}

function Banner({ melding, onSluit }: { melding: AppMelding; onSluit: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-120));
  const sluit = useRef(onSluit);
  useEffect(() => {
    sluit.current = onSluit;
  });

  useEffect(() => {
    Animated.spring(y, { toValue: 0, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
    const t = setTimeout(() => sluit.current(), 4200);
    return () => clearTimeout(t);
  }, [y]);

  return (
    <Animated.View style={[s.bannerBuiten, { top: insets.top + ruimte(2), transform: [{ translateY: y }] }]} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          onSluit();
          if (melding.href) router.push(melding.href as Href);
        }}
        accessibilityRole="button"
        style={[s.banner, schaduw]}
      >
        <View style={s.bannerIcoon}>
          <Ionicons name={melding.icoon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitel}>{melding.titel}</Text>
          <Text style={s.bannerTekst} numberOfLines={2}>
            {melding.tekst}
          </Text>
        </View>
        <Text style={s.bannerApp}>woober</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Toont meldingen bovenin, zoals pushmeldingen in de echte app */
export function MeldingBanner() {
  const { meldingen, rol, sluitMelding, gebruiker } = useApp();
  const pad = usePathname();
  const huidige = [...meldingen].reverse().find((m) => m.rol === rol);
  const opZelfdeScherm = huidige?.href === pad;

  useEffect(() => {
    if (huidige && opZelfdeScherm) sluitMelding(huidige.id);
  }, [huidige, opZelfdeScherm, sluitMelding]);

  if (!gebruiker || !huidige || opZelfdeScherm) return null;
  return <Banner key={huidige.id} melding={huidige} onSluit={() => sluitMelding(huidige.id)} />;
}

const s = StyleSheet.create({
  woordmerk: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  woord: { fontWeight: '900', letterSpacing: -1 },
  bannerBuiten: { position: 'absolute', left: ruimte(3), right: ruimte(3), alignItems: 'center', zIndex: 50 },
  banner: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruimte(3),
    backgroundColor: '#fff',
    borderRadius: radius.groot,
    padding: ruimte(3),
  },
  bannerIcoon: { width: 38, height: 38, borderRadius: 12, backgroundColor: kleuren.primair, alignItems: 'center', justifyContent: 'center' },
  bannerTitel: { fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  bannerTekst: { fontSize: 14, color: kleuren.gedempt, marginTop: 1 },
  bannerApp: { fontSize: 11, fontWeight: '800', color: kleuren.primair, alignSelf: 'flex-start' },
});
