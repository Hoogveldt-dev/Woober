import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { asMaximum, balkenVoor, DAGDOEL, demoWaarden, kmTekst, samenvatting, stappenTekst, venster, type Periode } from '../lib/fit';
import { telefoonWaarden } from '../lib/stappen';
import { kleuren, radius, ruimte } from '../theme';
import { Segment } from './blokken';

const GRAFIEK_HOOGTE = 140;

const PERIODES: { waarde: Periode; label: string }[] = [
  { waarde: 'dag', label: 'Dag' },
  { waarde: 'week', label: 'Week' },
  { waarde: 'maand', label: 'Maand' },
];

/**
 * Stappen per dag (per uur), week en maand (per dag), met een staafgrafiek. In de demo verzonnen;
 * bij echte accounts van de telefoon. `nu` ververst het scherm erboven als je de tab opent.
 */
export function Stappenteller({ bron, nu }: { bron: 'demo' | 'telefoon'; nu: Date }) {
  const [periode, setPeriode] = useState<Periode>('dag');
  const [terug, setTerug] = useState(0);
  const [gekozen, setGekozen] = useState<number | null>(null);

  const v = useMemo(() => venster(periode, terug, nu), [periode, terug, nu]);
  const sleutel = `${periode}:${v.begin.getTime()}:${nu.getTime()}`;

  const demo = useMemo(() => (bron === 'demo' ? demoWaarden(v, nu) : null), [bron, v, nu]);
  const [telefoon, setTelefoon] = useState<{ sleutel: string; waarden: (number | null)[] | 'fout' } | null>(null);
  useEffect(() => {
    if (bron !== 'telefoon') return;
    let weg = false;
    telefoonWaarden(v, nu).then(
      (waarden) => !weg && setTelefoon({ sleutel, waarden }),
      () => !weg && setTelefoon({ sleutel, waarden: 'fout' }),
    );
    return () => {
      weg = true;
    };
  }, [bron, v, nu, sleutel]);

  const waarden = demo ?? (telefoon?.sleutel === sleutel ? telefoon.waarden : null);

  const kies = (p: Periode) => {
    setPeriode(p);
    setTerug(0);
    setGekozen(null);
  };
  const schuif = (n: number) => {
    setTerug((t) => Math.max(0, t + n));
    setGekozen(null);
  };

  return (
    <View>
      <Segment opties={PERIODES} waarde={periode} onChange={kies} />

      <View style={s.navigatie}>
        <Pressable onPress={() => schuif(1)} accessibilityRole="button" accessibilityLabel="Vorige" hitSlop={10} style={s.pijl}>
          <Ionicons name="chevron-back" size={22} color={kleuren.tekst} />
        </Pressable>
        <Text style={s.titel}>{v.titel}</Text>
        <Pressable
          onPress={() => schuif(-1)}
          disabled={terug === 0}
          accessibilityRole="button"
          accessibilityLabel="Volgende"
          accessibilityState={{ disabled: terug === 0 }}
          hitSlop={10}
          style={[s.pijl, terug === 0 && { opacity: 0.25 }]}
        >
          <Ionicons name="chevron-forward" size={22} color={kleuren.tekst} />
        </Pressable>
      </View>

      {waarden === null ? (
        <View style={s.laden}>
          <ActivityIndicator color={kleuren.primair} />
        </View>
      ) : waarden === 'fout' ? (
        <Text style={s.leeg}>Je stappen konden niet worden gelezen. Probeer het later opnieuw.</Text>
      ) : (
        <Inhoud waarden={waarden} periode={periode} balken={balkenVoor(v, waarden)} gekozen={gekozen} onKies={setGekozen} v={v} />
      )}
    </View>
  );
}

function Inhoud({
  waarden,
  periode,
  balken,
  gekozen,
  onKies,
  v,
}: {
  waarden: (number | null)[];
  periode: Periode;
  balken: ReturnType<typeof balkenVoor>;
  gekozen: number | null;
  onKies: (i: number | null) => void;
  v: ReturnType<typeof venster>;
}) {
  const som = samenvatting(v, waarden);
  const bekend = waarden.some((w) => w !== null);
  const hoogste = Math.max(0, ...waarden.map((w) => w ?? 0));
  const doelLijn = periode !== 'dag';
  const max = asMaximum(Math.max(hoogste, doelLijn ? DAGDOEL : 0, 1));
  const doelY = (DAGDOEL / max) * GRAFIEK_HOOGTE;
  const keuze = gekozen !== null ? balken[gekozen] : null;

  if (!bekend) {
    return <Text style={s.leeg}>Van deze periode zijn geen stappen bekend.</Text>;
  }

  return (
    <>
      <View style={s.held}>
        <Text style={s.heldGetal}>{stappenTekst(som.totaal)}</Text>
        <Text style={s.heldEenheid}>stappen</Text>
      </View>
      <Text style={s.sub}>
        {periode === 'dag' ? `Ongeveer ${kmTekst(som.totaal)}` : `Gemiddeld ${stappenTekst(som.gemiddeld)} per dag, ongeveer ${kmTekst(som.totaal)}`}
      </Text>

      {periode === 'dag' ? (
        <View style={s.doel}>
          <View style={s.meter} accessibilityLabel={`${Math.min(100, Math.round((som.totaal / DAGDOEL) * 100))} procent van je dagdoel`}>
            <View style={[s.meterVulling, { width: `${Math.min(100, (som.totaal / DAGDOEL) * 100)}%` }]} />
          </View>
          <Text style={s.doelTekst}>
            {som.totaal >= DAGDOEL ? 'Dagdoel gehaald' : `Nog ${stappenTekst(DAGDOEL - som.totaal)} tot je dagdoel van ${stappenTekst(DAGDOEL)}`}
          </Text>
        </View>
      ) : (
        <View style={s.doelRij}>
          <Ionicons name="trophy" size={16} color={kleuren.ster} />
          <Text style={s.doelTekst}>
            Dagdoel van {stappenTekst(DAGDOEL)} gehaald op {som.dagenDoel} van {som.dagenGeteld} {som.dagenGeteld === 1 ? 'dag' : 'dagen'}
          </Text>
        </View>
      )}

      <Text style={s.gekozen} numberOfLines={1}>
        {keuze ? `${keuze.naam}: ${keuze.stappen === null ? 'nog niet bekend' : `${stappenTekst(keuze.stappen)} stappen`}` : 'Tik op een staaf voor de stappen'}
      </Text>

      <View style={s.grafiek}>
        <View style={{ flex: 1 }}>
          <View style={s.plot}>
            <View style={[s.raster, { position: 'absolute', top: 0, left: 0, right: 0 }]} />
            {doelLijn ? <View style={[s.doelLijn, { bottom: doelY }]} /> : null}
            <View style={s.staven}>
              {balken.map((b, i) => {
                const hoogte = b.stappen ? Math.max(2, (b.stappen / max) * GRAFIEK_HOOGTE) : 0;
                const actief = gekozen === null || gekozen === i;
                return (
                  <Pressable
                    key={b.sleutel}
                    onPress={() => onKies(gekozen === i ? null : i)}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.naam}: ${b.stappen === null ? 'nog niet bekend' : `${stappenTekst(b.stappen)} stappen`}`}
                    accessibilityState={{ selected: gekozen === i }}
                    style={s.slot}
                  >
                    <View style={[s.staaf, { height: hoogte, opacity: actief ? 1 : 0.35 }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={s.raster} />
          <View style={s.as}>
            {balken.map((b) => (
              <View key={b.sleutel} style={s.asSlot}>
                {/* Los van de smalle staaf, zodat "18" of "29" niet wordt afgekapt */}
                {b.as ? <Text style={s.asLabel}>{b.as}</Text> : null}
              </View>
            ))}
          </View>
        </View>
        {/* Waarden rechts naast de lijnen, half boven en half onder de lijn */}
        <View style={s.asKolom}>
          <Text style={[s.asWaarde, { top: 0 }]}>{stappenTekst(max)}</Text>
          {doelLijn ? <Text style={[s.asWaarde, { bottom: doelY }]}>doel</Text> : null}
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  navigatie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: ruimte(4) },
  pijl: { width: 36, height: 36, borderRadius: 18, backgroundColor: kleuren.vlak, alignItems: 'center', justifyContent: 'center' },
  titel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  laden: { height: GRAFIEK_HOOGTE + 140, alignItems: 'center', justifyContent: 'center' },
  leeg: { fontSize: 15, color: kleuren.gedempt, textAlign: 'center', marginVertical: ruimte(10), lineHeight: 21 },
  held: { flexDirection: 'row', alignItems: 'baseline', gap: ruimte(2), marginTop: ruimte(4) },
  heldGetal: { fontSize: 48, fontWeight: '800', color: kleuren.tekst, letterSpacing: -1 },
  heldEenheid: { fontSize: 17, fontWeight: '700', color: kleuren.gedempt },
  sub: { fontSize: 15, color: kleuren.gedempt },
  doel: { marginTop: ruimte(3), gap: ruimte(2) },
  doelRij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginTop: ruimte(3) },
  meter: { height: 8, borderRadius: radius.rond, backgroundColor: kleuren.primairVlak, overflow: 'hidden' },
  meterVulling: { height: 8, borderRadius: radius.rond, backgroundColor: kleuren.primair },
  doelTekst: { fontSize: 14, fontWeight: '600', color: kleuren.tekst },
  gekozen: { fontSize: 13, color: kleuren.gedempt, marginTop: ruimte(5), marginBottom: ruimte(5) },
  grafiek: { flexDirection: 'row', gap: ruimte(2) },
  plot: { height: GRAFIEK_HOOGTE },
  staven: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  staaf: { width: '100%', maxWidth: 24, backgroundColor: kleuren.primair, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  raster: { height: 1, backgroundColor: kleuren.rand },
  doelLijn: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: kleuren.gedempt, opacity: 0.6 },
  asKolom: { width: 40, height: GRAFIEK_HOOGTE + 14, marginTop: -7 },
  asWaarde: { position: 'absolute', left: 0, fontSize: 11, lineHeight: 14, color: kleuren.gedempt },
  as: { flexDirection: 'row', gap: 2, marginTop: ruimte(1) },
  asSlot: { flex: 1, height: 16 },
  asLabel: { position: 'absolute', top: 0, left: '50%', width: 32, marginLeft: -16, fontSize: 11, lineHeight: 16, color: kleuren.gedempt, textAlign: 'center' },
});
