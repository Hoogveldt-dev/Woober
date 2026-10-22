import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { kleuren, radius, ruimte } from '../theme';

type IconNaam = ComponentProps<typeof Ionicons>['name'];

export function Knop({
  titel,
  onPress,
  variant = 'primair',
  icoon,
  uitgeschakeld,
  stijl,
  tekstKleur,
}: {
  tekstKleur?: string;
  titel: string;
  onPress: () => void;
  variant?: 'primair' | 'secundair' | 'gevaar' | 'tekst';
  icoon?: IconNaam;
  uitgeschakeld?: boolean;
  stijl?: ViewStyle;
}) {
  const inhoud = (kleur: string) => (
    <View style={s.knopInhoud}>
      {icoon ? <Ionicons name={icoon} size={18} color={kleur} /> : null}
      <Text style={[s.knopTekst, { color: kleur }]}>{titel}</Text>
    </View>
  );

  if (variant === 'primair') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={uitgeschakeld}
        style={({ pressed }) => [{ opacity: uitgeschakeld ? 0.45 : pressed ? 0.85 : 1 }, stijl]}
      >
        <LinearGradient colors={kleuren.verloop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.knop}>
          {inhoud('#fff')}
        </LinearGradient>
      </Pressable>
    );
  }

  const kleur = tekstKleur ?? (variant === 'gevaar' ? kleuren.nope : variant === 'tekst' ? kleuren.gedempt : kleuren.tekst);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={uitgeschakeld}
      style={({ pressed }) => [
        s.knop,
        variant === 'tekst' ? null : { borderWidth: 1.5, borderColor: variant === 'gevaar' ? kleuren.nope : kleuren.rand },
        { opacity: uitgeschakeld ? 0.45 : pressed ? 0.7 : 1 },
        stijl,
      ]}
    >
      {inhoud(kleur)}
    </Pressable>
  );
}

export function Chip({ label, actief, onPress, icoon }: { label: string; actief: boolean; onPress: () => void; icoon?: IconNaam }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: actief }}
      onPress={onPress}
      style={[s.chip, actief ? s.chipActief : null]}
    >
      {icoon ? <Ionicons name={icoon} size={14} color={actief ? '#fff' : kleuren.tekst} /> : null}
      <Text style={[s.chipTekst, actief ? { color: '#fff' } : null]}>{label}</Text>
    </Pressable>
  );
}

export function Veld({ label, hulp, fout, ...props }: TextInputProps & { label: string; hulp?: string; fout?: string | null }) {
  return (
    <View style={{ marginBottom: ruimte(4) }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#A1A1AA"
        {...props}
        style={[s.invoer, fout ? { borderColor: kleuren.nope } : null, props.multiline ? { minHeight: 84, textAlignVertical: 'top' } : null]}
      />
      {fout ? <Text style={s.fout}>{fout}</Text> : hulp ? <Text style={s.hulp}>{hulp}</Text> : null}
    </View>
  );
}

export function Kop({ children }: { children: ReactNode }) {
  return <Text style={s.kop}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Melding({ type, children }: { type: 'fout' | 'waarschuwing' | 'goed' | 'info'; children: ReactNode }) {
  const config = {
    fout: { bg: kleuren.foutVlak, kleur: kleuren.nope, icoon: 'close-circle' as IconNaam },
    waarschuwing: { bg: kleuren.waarschuwingVlak, kleur: kleuren.waarschuwing, icoon: 'warning' as IconNaam },
    goed: { bg: kleuren.goedVlak, kleur: kleuren.like, icoon: 'checkmark-circle' as IconNaam },
    info: { bg: '#EEF4FF', kleur: kleuren.info, icoon: 'information-circle' as IconNaam },
  }[type];
  return (
    <View style={[s.melding, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icoon} size={18} color={config.kleur} style={{ marginTop: 1 }} />
      <Text style={s.meldingTekst}>{children}</Text>
    </View>
  );
}

export function Badge({ tekst, icoon, kleur = kleuren.like }: { tekst: string; icoon?: IconNaam; kleur?: string }) {
  return (
    <View style={[s.badge, { backgroundColor: kleur }]}>
      {icoon ? <Ionicons name={icoon} size={12} color="#fff" /> : null}
      <Text style={s.badgeTekst}>{tekst}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  knop: {
    height: 52,
    borderRadius: radius.rond,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ruimte(6),
  },
  knopInhoud: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  knopTekst: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.rond,
    borderWidth: 1.5,
    borderColor: kleuren.rand,
    backgroundColor: '#fff',
  },
  chipActief: { backgroundColor: kleuren.primair, borderColor: kleuren.primair },
  chipTekst: { fontSize: 14, fontWeight: '600', color: kleuren.tekst },
  label: { fontSize: 13, fontWeight: '700', color: kleuren.gedempt, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  invoer: {
    borderWidth: 1.5,
    borderColor: kleuren.rand,
    borderRadius: radius.midden,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: kleuren.tekst,
    backgroundColor: '#fff',
  },
  hulp: { fontSize: 12, color: kleuren.gedempt, marginTop: 4 },
  fout: { fontSize: 12, color: kleuren.nope, marginTop: 4, fontWeight: '600' },
  kop: { fontSize: 28, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.5 },
  melding: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.midden, marginBottom: ruimte(2) },
  meldingTekst: { flex: 1, fontSize: 14, lineHeight: 20, color: kleuren.tekst },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.rond },
  badgeTekst: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});
