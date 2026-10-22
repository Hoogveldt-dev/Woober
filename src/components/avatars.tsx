import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Hond } from '../types';

/** Plaatsvervanger voor de foto van een hond, tot er echte uploads zijn (zelfde aanpak als Woofer) */
export function HondAvatar({ hond, grootte, stijl }: { hond: Pick<Hond, 'kleur'>; grootte: number; stijl?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={hond.kleur}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[{ width: grootte, height: grootte, borderRadius: grootte / 2 }, s.midden, stijl]}
    >
      <MaterialCommunityIcons name="dog" size={grootte * 0.55} color="rgba(255,255,255,0.92)" />
    </LinearGradient>
  );
}

/** Meerdere honden overlappend naast elkaar */
export function HondenStapel({ honden, grootte }: { honden: Pick<Hond, 'kleur' | 'id'>[]; grootte: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {honden.map((h, i) => (
        <HondAvatar key={h.id} hond={h} grootte={grootte} stijl={[s.stapelRand, i > 0 ? { marginLeft: -grootte * 0.35 } : null]} />
      ))}
    </View>
  );
}

/** Avatar van een persoon: verloop met de eerste letter, tot er echte profielfoto's zijn */
export function PersoonAvatar({
  naam,
  kleur,
  grootte,
  stijl,
}: {
  naam: string;
  kleur: [string, string];
  grootte: number;
  stijl?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={kleur}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[{ width: grootte, height: grootte, borderRadius: grootte / 2 }, s.midden, stijl]}
    >
      <Text style={[s.letter, { fontSize: grootte * 0.42 }]}>{naam.slice(0, 1).toUpperCase()}</Text>
    </LinearGradient>
  );
}

/** Foto tijdens de wandeling. In de demo een kleurvlak met een icoon. */
export function WandelFoto({ kleur, grootte, onderschrift }: { kleur: [string, string]; grootte: number; onderschrift?: string }) {
  return (
    <LinearGradient colors={kleur} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.foto, { width: grootte, height: grootte }]}>
      <MaterialCommunityIcons name="dog-side" size={grootte * 0.42} color="rgba(255,255,255,0.88)" />
      <MaterialCommunityIcons name="tree" size={grootte * 0.22} color="rgba(255,255,255,0.6)" style={s.boom} />
      {onderschrift ? (
        <Text style={s.onderschrift} numberOfLines={2}>
          {onderschrift}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  midden: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letter: { color: '#fff', fontWeight: '800' },
  stapelRand: { borderWidth: 2, borderColor: '#fff' },
  foto: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  boom: { position: 'absolute', top: 8, right: 8 },
  onderschrift: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 6,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 3,
  },
});
