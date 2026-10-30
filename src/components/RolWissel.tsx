import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte, schaduw } from '../theme';
import type { Rol } from '../types';

/**
 * Wisselen tussen eigenaar en uitlater met één tik, bovenaan Account. Zonder hond of uitlaatprofiel stuurt de
 * navigatie je eerst naar het scherm om dat aan te maken.
 */
export function RolWissel() {
  const { rol, wisselRol, honden, mijnProfiel } = useApp();
  const opties: { rol: Rol; titel: string; sub: string; icoon: ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
    { rol: 'eigenaar', titel: 'Eigenaar', sub: honden.length ? 'Je hond laten uitlaten' : 'Hond toevoegen', icoon: 'dog-side' },
    { rol: 'uitlater', titel: 'Uitlater', sub: mijnProfiel ? 'Uitlaten en verdienen' : 'Profiel maken', icoon: 'walk' },
  ];
  return (
    <View style={s.wissel} accessibilityRole="tablist">
      {opties.map((o) => {
        const actief = o.rol === rol;
        return (
          <Pressable
            key={o.rol}
            onPress={() => !actief && wisselRol(o.rol)}
            accessibilityRole="tab"
            accessibilityState={{ selected: actief }}
            accessibilityLabel={`${o.titel}, ${o.sub}`}
            style={({ pressed }) => [s.optie, actief && s.actief, pressed && !actief && { opacity: 0.6 }]}
          >
            <MaterialCommunityIcons name={o.icoon} size={24} color={actief ? kleuren.primair : kleuren.gedempt} />
            <Text style={[s.titel, !actief && { color: kleuren.gedempt }]}>{o.titel}</Text>
            <Text style={s.sub} numberOfLines={1}>
              {o.sub}
            </Text>
          </Pressable>
        );
      })}
      <View style={s.midden} pointerEvents="none">
        <Ionicons name="swap-horizontal" size={14} color={kleuren.gedempt} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wissel: { flexDirection: 'row', backgroundColor: kleuren.vlak, borderRadius: radius.midden, padding: 4, marginBottom: ruimte(5) },
  optie: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: ruimte(3), paddingHorizontal: ruimte(2), borderRadius: radius.midden - 2 },
  actief: { backgroundColor: '#fff', ...schaduw, shadowOpacity: 0.08, elevation: 2 },
  titel: { fontSize: 15, fontWeight: '800', color: kleuren.tekst, marginTop: 2 },
  sub: { fontSize: 12, color: kleuren.gedempt },
  midden: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    borderRadius: 13,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: kleuren.rand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
