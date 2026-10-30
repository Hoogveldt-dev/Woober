import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { kleuren, radius, ruimte } from '../theme';

/** Grijs label met een slotje: deze functie komt binnenkort (koppelingen in Woober Fit, inloggen met Apple) */
export function Slotje() {
  return (
    <View style={s.slot}>
      <Ionicons name="lock-closed" size={12} color={kleuren.gedempt} />
      <Text style={s.slotTekst}>Binnenkort</Text>
    </View>
  );
}

/** Knop die er nog niet is, in de vorm van een gewone knop met een slotje; doet niets */
export function KnopOpSlot({ titel, icoon }: { titel: string; icoon: ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={s.knop} accessible accessibilityLabel={`${titel}, nog niet beschikbaar`} accessibilityState={{ disabled: true }}>
      <Ionicons name={icoon} size={18} color={kleuren.gedempt} />
      <Text style={s.knopTekst}>{titel}</Text>
      <Slotje />
    </View>
  );
}

const s = StyleSheet.create({
  slot: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: kleuren.vlak, borderRadius: radius.rond, paddingHorizontal: 10, paddingVertical: 5 },
  slotTekst: { fontSize: 12, fontWeight: '700', color: kleuren.gedempt },
  knop: {
    height: 52,
    borderRadius: radius.rond,
    borderWidth: 1.5,
    borderColor: kleuren.rand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ruimte(2),
    paddingLeft: ruimte(6),
    paddingRight: 8,
  },
  knopTekst: { flex: 1, fontSize: 16, fontWeight: '700', color: kleuren.gedempt, letterSpacing: 0.2 },
});
