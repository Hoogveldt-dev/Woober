import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { kleuren, radius, ruimte, schaduw } from '../theme';

type IconNaam = ComponentProps<typeof Ionicons>['name'];

/** Huidige tijd die elke paar honderd milliseconden ververst, voor bewegende kaarten en timers */
export function useNu(intervalMs = 300): number {
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNu(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return nu;
}

/** Blad dat van onderen over het scherm schuift, voor melden, incidenten en teksten aanpassen. Tikken ernaast sluit het. */
export function OnderBlad({ zichtbaar, sluit, children, stijl }: { zichtbaar: boolean; sluit: () => void; children: ReactNode; stijl?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={zichtbaar} transparent animationType="slide" onRequestClose={sluit}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.onderAchtergrond} onPress={sluit} accessibilityLabel="Sluiten" />
        <View style={[s.onderBlad, { paddingBottom: Math.max(insets.bottom, ruimte(5)) }, stijl]}>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Paneel onderaan over de kaart, zoals in taxi-apps */
export function Blad({ children, onHoogte, stijl }: { children: ReactNode; onHoogte?: (h: number) => void; stijl?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bladBuiten]} pointerEvents="box-none">
      <View
        style={[s.blad, schaduw, { paddingBottom: Math.max(insets.bottom, ruimte(4)) }, stijl]}
        onLayout={(e) => onHoogte?.(e.nativeEvent.layout.height)}
      >
        <View style={s.greep} />
        {children}
      </View>
    </View>
  );
}

export function Rij({ label, waarde, sterk }: { label: string; waarde: string; sterk?: boolean }) {
  return (
    <View style={s.rij}>
      <Text style={[s.rijLabel, sterk && { color: kleuren.tekst, fontWeight: '700' }]}>{label}</Text>
      <Text style={[s.rijWaarde, sterk && { fontWeight: '800' }]}>{waarde}</Text>
    </View>
  );
}

export function Blok({ children, stijl }: { children: ReactNode; stijl?: StyleProp<ViewStyle> }) {
  return <View style={[s.blok, stijl]}>{children}</View>;
}

export function Sectie({ children, actie }: { children: string; actie?: { titel: string; onPress: () => void } }) {
  return (
    <View style={s.sectieRij}>
      <Text style={s.sectie}>{children}</Text>
      {actie ? (
        <Pressable onPress={actie.onPress} accessibilityRole="button" hitSlop={8}>
          <Text style={s.sectieActie}>{actie.titel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Sterren({ waarde, aantal, grootte = 14 }: { waarde: number; aantal?: number; grootte?: number }) {
  return (
    <View style={s.sterren}>
      <Ionicons name="star" size={grootte} color={kleuren.ster} />
      <Text style={[s.sterTekst, { fontSize: grootte }]}>{waarde ? waarde.toFixed(1).replace('.', ',') : 'Nieuw'}</Text>
      {aantal !== undefined && aantal > 0 ? <Text style={[s.sterAantal, { fontSize: grootte - 1 }]}>({aantal})</Text> : null}
    </View>
  );
}

export function SterrenKiezer({ waarde, onChange }: { waarde: number; onChange: (n: number) => void }) {
  return (
    <View style={s.kiezer}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" accessibilityLabel={`${n} sterren`} hitSlop={4}>
          <Ionicons name={n <= waarde ? 'star' : 'star-outline'} size={36} color={n <= waarde ? kleuren.ster : kleuren.rand} />
        </Pressable>
      ))}
    </View>
  );
}

export function RondeKnop({
  icoon,
  onPress,
  label,
  stijl,
  kleur = kleuren.tekst,
}: {
  icoon: IconNaam;
  onPress: () => void;
  label: string;
  stijl?: StyleProp<ViewStyle>;
  kleur?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.rondeKnop, schaduw, pressed && { transform: [{ scale: 0.94 }] }, stijl]}
    >
      <Ionicons name={icoon} size={22} color={kleur} />
    </Pressable>
  );
}

/** Kleine knop met icoon en tekst eronder, voor acties tijdens een wandeling */
export function ActieKnop({ icoon, titel, onPress, kleur = kleuren.tekst }: { icoon: ComponentProps<typeof MaterialCommunityIcons>['name']; titel: string; onPress: () => void; kleur?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.actie, pressed && { backgroundColor: kleuren.rand }]}>
      <MaterialCommunityIcons name={icoon} size={24} color={kleur} />
      <Text style={s.actieTekst}>{titel}</Text>
    </Pressable>
  );
}

export function Tegel({ waarde, label, klein }: { waarde: string; label: string; klein?: boolean }) {
  return (
    <View style={s.tegel}>
      <Text style={[s.tegelWaarde, klein && { fontSize: 16 }]} numberOfLines={1}>
        {waarde}
      </Text>
      <Text style={s.tegelLabel}>{label}</Text>
    </View>
  );
}

export function Leeg({ icoon, titel, tekst, children }: { icoon: ComponentProps<typeof MaterialCommunityIcons>['name']; titel: string; tekst: string; children?: ReactNode }) {
  return (
    <View style={s.leeg}>
      <MaterialCommunityIcons name={icoon} size={64} color={kleuren.rand} />
      <Text style={s.leegTitel}>{titel}</Text>
      <Text style={s.leegTekst}>{tekst}</Text>
      {children}
    </View>
  );
}

export function Segment<T extends string | number>({
  opties,
  waarde,
  onChange,
}: {
  opties: { waarde: T; label: string }[];
  waarde: T;
  onChange: (w: T) => void;
}) {
  return (
    <View style={s.segment}>
      {opties.map((o) => {
        const actief = o.waarde === waarde;
        return (
          <Pressable
            key={String(o.waarde)}
            onPress={() => onChange(o.waarde)}
            accessibilityRole="button"
            accessibilityState={{ selected: actief }}
            style={[s.segmentOptie, actief && s.segmentActief]}
          >
            <Text style={[s.segmentTekst, actief && { color: kleuren.tekst }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Rij die je kunt aantikken, met icoon links en pijltje rechts */
export function MenuRij({ icoon, titel, sub, onPress, kleur = kleuren.tekst }: { icoon: IconNaam; titel: string; sub?: string; onPress: () => void; kleur?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.menuRij, pressed && { backgroundColor: kleuren.vlak }]}>
      <View style={s.menuIcoon}>
        <Ionicons name={icoon} size={20} color={kleur} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuTitel, { color: kleur }]}>{titel}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={kleuren.gedempt} />
    </Pressable>
  );
}

export function Vinkje({ aan, onPress, children }: { aan: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={s.vinkRij} accessibilityRole="checkbox" accessibilityState={{ checked: aan }}>
      <Ionicons name={aan ? 'checkbox' : 'square-outline'} size={22} color={aan ? kleuren.primair : kleuren.gedempt} />
      <Text style={s.vinkTekst}>{children}</Text>
    </Pressable>
  );
}

export const gedeeldeStijl = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  inhoud: { padding: ruimte(5), paddingBottom: ruimte(14), width: '100%', maxWidth: 560, alignSelf: 'center' },
  rij: { flexDirection: 'row', flexWrap: 'wrap', gap: ruimte(2) },
  hulp: { fontSize: 13, color: kleuren.gedempt, lineHeight: 18 },
  klein: { fontSize: 12, color: kleuren.gedempt, lineHeight: 17, textAlign: 'center' },
  titel: { fontSize: 22, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.4 },
  sub: { fontSize: 15, color: kleuren.gedempt, marginTop: 2, lineHeight: 20 },
});

const s = StyleSheet.create({
  onderAchtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  onderBlad: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.groot,
    borderTopRightRadius: radius.groot,
    paddingHorizontal: ruimte(5),
    paddingTop: ruimte(5),
  },
  bladBuiten: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  blad: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.groot,
    borderTopRightRadius: radius.groot,
    paddingHorizontal: ruimte(5),
    paddingTop: ruimte(2),
  },
  greep: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: kleuren.rand, marginBottom: ruimte(3) },
  rij: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ruimte(4),
    paddingHorizontal: ruimte(4),
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: kleuren.vlak,
  },
  rijLabel: { fontSize: 15, color: kleuren.gedempt, flexShrink: 1 },
  rijWaarde: { fontSize: 15, color: kleuren.tekst, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  blok: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, marginBottom: ruimte(5), overflow: 'hidden' },
  sectieRij: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: ruimte(2), marginBottom: ruimte(3) },
  sectie: { fontSize: 13, fontWeight: '800', color: kleuren.primair, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectieActie: { fontSize: 14, fontWeight: '700', color: kleuren.gedempt },
  sterren: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sterTekst: { fontWeight: '700', color: kleuren.tekst },
  sterAantal: { color: kleuren.gedempt },
  kiezer: { flexDirection: 'row', gap: ruimte(2), justifyContent: 'center', marginVertical: ruimte(2) },
  rondeKnop: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  actie: {
    flex: 1,
    minWidth: 64,
    alignItems: 'center',
    gap: 4,
    paddingVertical: ruimte(3),
    borderRadius: radius.midden,
    backgroundColor: kleuren.vlak,
  },
  actieTekst: { fontSize: 12, fontWeight: '700', color: kleuren.tekst },
  tegel: { flex: 1, backgroundColor: kleuren.vlak, borderRadius: radius.midden, padding: ruimte(3), alignItems: 'center' },
  tegelWaarde: { fontSize: 20, fontWeight: '800', color: kleuren.tekst },
  tegelLabel: { fontSize: 12, color: kleuren.gedempt, marginTop: 2 },
  leeg: { alignItems: 'center', justifyContent: 'center', padding: ruimte(8) },
  leegTitel: { fontSize: 19, fontWeight: '800', color: kleuren.tekst, marginTop: ruimte(3), textAlign: 'center' },
  leegTekst: { fontSize: 15, color: kleuren.gedempt, textAlign: 'center', marginTop: ruimte(2), lineHeight: 21 },
  segment: { flexDirection: 'row', backgroundColor: kleuren.vlak, borderRadius: radius.rond, padding: 4 },
  segmentOptie: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.rond },
  segmentActief: { backgroundColor: '#fff', ...schaduw, shadowOpacity: 0.08, elevation: 2 },
  segmentTekst: { fontSize: 15, fontWeight: '700', color: kleuren.gedempt },
  menuRij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingVertical: 13, paddingHorizontal: ruimte(4) },
  menuIcoon: { width: 34, height: 34, borderRadius: 17, backgroundColor: kleuren.vlak, alignItems: 'center', justifyContent: 'center' },
  menuTitel: { fontSize: 16, fontWeight: '600' },
  menuSub: { fontSize: 13, color: kleuren.gedempt, marginTop: 1 },
  vinkRij: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: ruimte(3) },
  vinkTekst: { flex: 1, fontSize: 15, color: kleuren.tekst, lineHeight: 21 },
});
