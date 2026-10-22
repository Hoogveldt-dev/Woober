import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte, schaduw } from '../theme';
import type { AppMelding } from '../types';

// Vormen uit Material Design Icons (map-marker en paw), als vaste paden zodat het pootje de speld goed vult.
const SPELD = 'M12 2.016Q10.078 2.016 8.484 2.953Q6.891 3.891 5.953 5.484Q5.016 7.078 5.016 8.953Q5.016 10.828 6.094 13.266Q6.984 15.188 8.484 17.484Q9.609 19.078 10.922 20.719L12 21.984L13.078 20.719Q14.391 19.078 15.516 17.484Q17.016 15.188 17.906 13.266Q18.984 10.828 18.984 8.953Q18.984 7.078 18.047 5.484Q17.109 3.891 15.516 2.953Q13.922 2.016 12 2.016Z';
const POOT = 'M8.344 3Q9.234 2.859 10.055 3.703Q10.875 4.547 11.133 5.883Q11.391 7.219 10.969 8.25Q10.547 9.281 9.68 9.422Q8.813 9.563 7.969 8.719Q7.125 7.875 6.867 6.539Q6.609 5.203 7.031 4.172Q7.453 3.141 8.344 3ZM15.516 3Q16.406 3.141 16.828 4.172Q17.25 5.203 16.992 6.539Q16.734 7.875 15.914 8.719Q15.094 9.563 14.203 9.422Q13.313 9.281 12.867 8.25Q12.422 7.219 12.703 5.883Q12.984 4.547 13.805 3.703Q14.625 2.859 15.516 3ZM3 7.594Q3.844 7.219 4.875 7.805Q5.906 8.391 6.492 9.563Q7.078 10.734 6.891 11.836Q6.703 12.938 5.859 13.289Q5.016 13.641 4.008 13.078Q3 12.516 2.414 11.32Q1.828 10.125 1.992 9.047Q2.156 7.969 3 7.594ZM21 7.594Q21.844 7.969 22.008 9.047Q22.172 10.125 21.586 11.32Q21 12.516 19.992 13.078Q18.984 13.641 18.141 13.289Q17.297 12.938 17.109 11.836Q16.922 10.734 17.508 9.563Q18.094 8.391 19.125 7.805Q20.156 7.219 21 7.594ZM19.313 18.375Q19.359 19.078 18.914 19.758Q18.469 20.438 17.766 20.766Q17.063 21.094 16.125 20.906Q15.563 20.813 14.344 20.438Q13.547 20.156 13.125 20.063Q12.422 19.875 11.883 19.875Q11.344 19.875 10.688 20.063Q10.266 20.156 9.422 20.438Q8.25 20.859 7.641 20.953Q6.703 21.094 5.977 20.742Q5.25 20.391 4.805 19.547Q4.359 18.703 4.453 17.859Q4.5 17.203 5.109 16.547Q5.484 16.125 6.375 15.469Q7.125 14.813 7.453 14.484Q7.922 14.063 8.719 12.938Q9.609 11.719 10.125 11.25Q10.969 10.453 11.906 10.453Q12.844 10.453 13.734 11.25Q14.25 11.766 15.188 13.078Q15.938 14.109 16.313 14.484Q16.594 14.859 17.344 15.516Q18.328 16.359 18.656 16.828Q19.313 17.578 19.313 18.375Z';

/** Beeldmerk: een locatiespeld met een pootje, in de kleuren van Woofer */
export function Logo({ grootte, kleur = kleuren.primair, binnen = '#fff' }: { grootte: number; kleur?: string; binnen?: string }) {
  return (
    <Svg width={grootte} height={grootte} viewBox="0 0 24 24">
      <Path d={SPELD} fill={kleur} />
      <G transform="translate(12 9.1) scale(0.43) translate(-12 -12)">
        <Path d={POOT} fill={binnen} />
      </G>
    </Svg>
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
