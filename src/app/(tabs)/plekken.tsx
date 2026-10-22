import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Blad, Sterren } from '../../components/blokken';
import { Kaart, type KaartMarker } from '../../components/Kaart';
import { Chip, Knop } from '../../components/ui';
import { PLEK_SOORTEN, plekScore } from '../../lib/plekken';
import { afstand, formatAfstand } from '../../lib/route';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte, schaduw } from '../../theme';
import type { PlekSoort } from '../../types';

type Filter = PlekSoort | 'alles';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'alles', label: 'Alles' },
  ...(Object.keys(PLEK_SOORTEN) as PlekSoort[]).map((id) => ({ id, label: PLEK_SOORTEN[id].meervoud })),
];

export default function Plekken() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gebruiker, plekken } = useApp();
  const [filter, setFilter] = useState<Filter>('alles');
  const [gekozen, setGekozen] = useState<string | null>(null);
  const [bladHoogte, setBladHoogte] = useState(260);

  const thuis = gebruiker?.thuis;
  const zichtbaar = useMemo(
    () =>
      plekken
        .filter((p) => filter === 'alles' || p.soort === filter)
        .map((p) => ({ plek: p, meter: thuis ? afstand(thuis, p.punt) : 0 }))
        .sort((a, b) => a.meter - b.meter),
    [plekken, filter, thuis],
  );
  // Alleen opnieuw richten bij een ander filter, niet bij het kiezen van een plek
  const focus = useMemo(() => [...(thuis ? [thuis] : []), ...zichtbaar.map((z) => z.plek.punt)], [zichtbaar, thuis]);

  if (!gebruiker || !thuis) return null;

  const open = (id: string) => router.push({ pathname: '/plek/[id]', params: { id } });
  const markers: KaartMarker[] = [
    { id: 'thuis', soort: 'thuis', punt: thuis },
    ...zichtbaar.map(
      ({ plek: p }): KaartMarker => ({
        id: p.id,
        soort: 'plek',
        punt: p.punt,
        naam: p.naam,
        plekSoort: p.soort,
        actief: p.id === gekozen,
        onPress: () => (p.id === gekozen ? open(p.id) : setGekozen(p.id)),
      }),
    ),
  ];
  const keuze = zichtbaar.find((z) => z.plek.id === gekozen);

  return (
    <View style={s.scherm}>
      <Kaart markers={markers} focus={focus} bovenmarge={insets.top + 60} ondermarge={bladHoogte} maxZoom={0.8} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.filters, { top: insets.top + ruimte(2) }]}
        contentContainerStyle={s.filterRij}
      >
        {FILTERS.map((f) => (
          <View key={f.id} style={[s.filterSchaduw, schaduw]}>
            <Chip
              label={f.label}
              actief={filter === f.id}
              onPress={() => {
                setFilter(f.id);
                setGekozen(null);
              }}
            />
          </View>
        ))}
      </ScrollView>

      <Blad onHoogte={setBladHoogte}>
        {keuze ? (
          <PlekKaartje
            naam={keuze.plek.naam}
            soort={keuze.plek.soort}
            meter={keuze.meter}
            score={plekScore(keuze.plek)}
            regels={keuze.plek.regels}
            onPress={() => open(keuze.plek.id)}
            onSluit={() => setGekozen(null)}
          />
        ) : (
          <>
            <View style={s.kopRij}>
              <Text style={s.titel}>Plekken voor je hond</Text>
              <Pressable
                onPress={() => router.push('/plek-toevoegen')}
                accessibilityRole="button"
                accessibilityLabel="Plek toevoegen"
                hitSlop={6}
                style={({ pressed }) => [s.toevoegen, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="add" size={18} color={kleuren.primair} />
                <Text style={s.toevoegenTekst}>Toevoegen</Text>
              </Pressable>
            </View>
            <Text style={s.sub}>Losloopgebieden, stranden, cafés en meer, met reviews van andere baasjes. Mis je een plek? Voeg hem toe.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.lijst}>
              {zichtbaar.map(({ plek: p, meter }) => {
                const soort = PLEK_SOORTEN[p.soort];
                const score = plekScore(p);
                return (
                  <Pressable key={p.id} onPress={() => open(p.id)} accessibilityRole="button" style={({ pressed }) => [s.tegel, pressed && { backgroundColor: kleuren.vlak }]}>
                    <View style={[s.icoon, { backgroundColor: soort.kleur }]}>
                      <MaterialCommunityIcons name={soort.icoon} size={18} color="#fff" />
                    </View>
                    <Text style={s.tegelNaam} numberOfLines={2}>
                      {p.naam}
                    </Text>
                    <Sterren waarde={score.gemiddelde} aantal={score.aantal} grootte={12} />
                    <Text style={s.tegelSub}>{formatAfstand(meter)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </Blad>
    </View>
  );
}

function PlekKaartje({
  naam,
  soort,
  meter,
  score,
  regels,
  onPress,
  onSluit,
}: {
  naam: string;
  soort: PlekSoort;
  meter: number;
  score: { gemiddelde: number; aantal: number };
  regels?: string;
  onPress: () => void;
  onSluit: () => void;
}) {
  const config = PLEK_SOORTEN[soort];
  return (
    <View>
      <View style={s.kaartjeKop}>
        <View style={[s.icoonGroot, { backgroundColor: config.kleur }]}>
          <MaterialCommunityIcons name={config.icoon} size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.kaartjeNaam}>{naam}</Text>
          <Text style={s.tegelSub}>
            {config.label}, {formatAfstand(meter)}
          </Text>
        </View>
        <Pressable onPress={onSluit} accessibilityRole="button" accessibilityLabel="Sluiten" hitSlop={8}>
          <Ionicons name="close" size={22} color={kleuren.gedempt} />
        </Pressable>
      </View>
      <Sterren waarde={score.gemiddelde} aantal={score.aantal} />
      {regels ? (
        <View style={s.regels}>
          <Ionicons name="information-circle" size={16} color={kleuren.waarschuwing} />
          <Text style={s.regelsTekst}>{regels}</Text>
        </View>
      ) : null}
      <Knop titel="Bekijk plek en reviews" icoon="chatbubbles" onPress={onPress} stijl={{ marginTop: ruimte(3) }} />
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  filters: { position: 'absolute', left: 0, right: 0, flexGrow: 0 },
  filterRij: { gap: ruimte(2), paddingHorizontal: ruimte(4), paddingBottom: ruimte(3) },
  filterSchaduw: { borderRadius: radius.rond, shadowOpacity: 0.08 },
  kopRij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ruimte(2) },
  toevoegen: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: kleuren.primairVlak, borderRadius: radius.rond, paddingLeft: 8, paddingRight: 12, paddingVertical: 6 },
  toevoegenTekst: { fontSize: 14, fontWeight: '700', color: kleuren.primair },
  titel: { flexShrink: 1, fontSize: 20, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.4 },
  sub: { fontSize: 13, color: kleuren.gedempt, marginTop: 2, lineHeight: 18 },
  lijst: { gap: ruimte(3), paddingVertical: ruimte(3) },
  tegel: { width: 140, gap: 4, borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(3) },
  icoon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  tegelNaam: { fontSize: 14, fontWeight: '800', color: kleuren.tekst, minHeight: 36 },
  tegelSub: { fontSize: 12, color: kleuren.gedempt, fontWeight: '600' },
  kaartjeKop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), marginBottom: ruimte(2) },
  icoonGroot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  kaartjeNaam: { fontSize: 18, fontWeight: '800', color: kleuren.tekst },
  regels: { flexDirection: 'row', gap: 6, backgroundColor: kleuren.waarschuwingVlak, borderRadius: radius.klein, padding: ruimte(2), marginTop: ruimte(3) },
  regelsTekst: { flex: 1, fontSize: 13, color: kleuren.tekst, lineHeight: 18 },
});
