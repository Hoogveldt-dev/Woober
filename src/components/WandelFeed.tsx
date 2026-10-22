import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { tijdTekst } from '../lib/tijd';
import { kleuren, ruimte } from '../theme';
import type { WandelGebeurtenis } from '../types';
import { WandelFoto } from './avatars';
import { gebeurtenisIcoon } from './Kaart';

const TEKST: Record<WandelGebeurtenis['soort'], string> = {
  start: 'Wandeling gestart',
  foto: 'Foto',
  plas: 'Plasje gedaan',
  poep: 'Poep gedaan en opgeruimd',
  water: 'Water gedronken',
  notitie: 'Notitie',
  einde: 'Weer thuis',
  incident: 'Incident gemeld',
};

/**
 * Foto's en gebeurtenissen van een wandeling, nieuwste bovenaan.
 * Met start en duur tonen we de tijd op de klok van de wandeling (in de demo loopt de tijd sneller).
 */
export function WandelFeed({ gebeurtenissen, compact, start, duur }: { gebeurtenissen: WandelGebeurtenis[]; compact?: boolean; start?: number; duur?: number }) {
  const tijdVan = (g: WandelGebeurtenis) => (start && duur ? start + g.voortgang * duur * 60000 : g.tijd);
  const fotos = gebeurtenissen.filter((g) => g.soort === 'foto' && g.kleur);
  const lijst = [...gebeurtenissen].reverse().slice(0, compact ? 3 : undefined);

  return (
    <View>
      {fotos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fotos}>
          {[...fotos].reverse().map((f) => (
            <WandelFoto key={f.id} kleur={f.kleur!} grootte={compact ? 96 : 132} onderschrift={compact ? undefined : f.tekst} />
          ))}
        </ScrollView>
      ) : null}
      {lijst.map((g) => {
        const icoon = gebeurtenisIcoon(g.soort);
        return (
          <View key={g.id} style={s.rij}>
            <View style={s.icoon}>
              <MaterialCommunityIcons name={icoon.naam} size={16} color={icoon.kleur} />
            </View>
            <Text style={s.tekst} numberOfLines={compact ? 1 : 3}>
              {g.soort === 'foto' || g.soort === 'notitie' || g.soort === 'einde' || g.soort === 'incident' ? (g.tekst ?? TEKST[g.soort]) : TEKST[g.soort]}
            </Text>
            <Text style={s.tijd}>{tijdTekst(tijdVan(g))}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  fotos: { gap: ruimte(2), paddingBottom: ruimte(3) },
  rij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingVertical: 7 },
  icoon: { width: 30, height: 30, borderRadius: 15, backgroundColor: kleuren.vlak, alignItems: 'center', justifyContent: 'center' },
  tekst: { flex: 1, fontSize: 14, color: kleuren.tekst },
  tijd: { fontSize: 12, color: kleuren.gedempt },
});
