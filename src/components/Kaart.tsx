import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import {
  LOSLOOPGEBIED,
  PARK,
  PARK_PAD,
  PARK_ZIJPADEN,
  RIVIER_RAND,
  STRATEN,
  UITERWAARD_RAND,
  VIJVER,
  XS,
  YS,
} from '../data/stad';
import { gladmaken, omvatting } from '../lib/route';
import { kaartKleuren, kleuren, schaduw } from '../theme';
import type { GebeurtenisSoort, Punt, Vervoer } from '../types';

export type KaartMarker =
  | { id: string; soort: 'thuis' | 'klant'; punt: Punt; label?: string }
  | { id: string; soort: 'uitlater'; punt: Punt; naam: string; kleur: [string, string]; vervoer: Vervoer; bubbel?: string; actief?: boolean; onPress?: () => void }
  | { id: string; soort: 'hond'; punt: Punt; kleur: [string, string] }
  | { id: string; soort: 'ik'; punt: Punt }
  | { id: string; soort: 'gebeurtenis'; punt: Punt; gebeurtenis: GebeurtenisSoort };

export interface KaartRoute {
  id: string;
  punten: Punt[];
  kleur: string;
  /** Dikte in pixels */
  dikte?: number;
  gestippeld?: boolean;
}

const pts = (p: Punt[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

/** De vaste ondergrond van de demokaart. Wordt één keer opgebouwd. */
/** Schreefloze letter voor kaartteksten; zonder dit valt de browser terug op een schreefletter */
const LETTER = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' : undefined;

/** Doorlopende straten buiten de demowijk, alleen voor het beeld */
const BUITENWEGEN: Punt[][] = [
  ...YS.flatMap((y) =>
    y > PARK.y1 && y < PARK.y2
      ? [
          [{ x: -400, y }, { x: PARK.x1, y }],
          [{ x: PARK.x2, y }, { x: 1400, y }],
        ]
      : [[{ x: -400, y }, { x: 1400, y }]],
  ),
  ...XS.flatMap((x) =>
    x > PARK.x1 && x < PARK.x2
      ? [
          [{ x, y: YS[0] }, { x, y: PARK.y1 }],
          [{ x, y: PARK.y2 }, { x, y: 1900 }],
        ]
      : [[{ x, y: YS[0] }, { x, y: 1900 }]],
  ),
];

/** @param t Schaal van de teksten, zodat straatnamen bij elke zoom leesbaar blijven */
const Ondergrond = memo(function Ondergrond({ t }: { t: number }) {
  const XB = [-260, ...XS, 1260];
  const YB = [...YS, 1680];
  const blokken: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < XB.length - 1; i++) {
    for (let j = 0; j < YB.length - 1; j++) {
      const x1 = XB[i];
      const x2 = XB[i + 1];
      const y1 = YB[j];
      const y2 = YB[j + 1];
      const inPark = x1 >= PARK.x1 && x2 <= PARK.x2 && y1 >= PARK.y1 && y2 <= PARK.y2;
      if (inPark) continue;
      const m = 16;
      const w = x2 - x1 - 2 * m;
      const h = y2 - y1 - 2 * m;
      if (w <= 0 || h <= 0) continue;
      if (w > 170) {
        const half = (w - 10) / 2;
        blokken.push({ x: x1 + m, y: y1 + m, w: half, h }, { x: x1 + m + half + 10, y: y1 + m, w: half, h });
      } else {
        blokken.push({ x: x1 + m, y: y1 + m, w, h });
      }
    }
  }
  const parkLus = gladmaken(PARK_PAD, 8);

  return (
    <G>
      <Rect x={-400} y={-400} width={1800} height={2300} fill={kaartKleuren.land} />
      <Path d={`M -400 -400 H 1400 V ${RIVIER_RAND - 30} C 900 ${RIVIER_RAND + 20}, 300 ${RIVIER_RAND - 30}, -400 ${RIVIER_RAND + 10} Z`} fill={kaartKleuren.water} />
      <Path
        d={`M -400 ${RIVIER_RAND + 10} C 300 ${RIVIER_RAND - 30}, 900 ${RIVIER_RAND + 20}, 1400 ${RIVIER_RAND - 30} V ${UITERWAARD_RAND} H -400 Z`}
        fill={kaartKleuren.park}
      />
      <SvgText x={500} y={70} fontSize={30 * Math.min(t, 1.6)} fontStyle="italic" fontWeight="600" fill="#6FA3CF" textAnchor="middle" fontFamily={LETTER}>
        Waal
      </SvgText>
      <SvgText x={160} y={160} fontSize={11 * t} fill="#5E9467" textAnchor="middle" fontFamily={LETTER}>
        Uiterwaarden
      </SvgText>

      {blokken.map((b, i) => (
        <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill={kaartKleuren.blok} />
      ))}

      <Rect x={PARK.x1 + 10} y={PARK.y1 + 10} width={PARK.x2 - PARK.x1 - 20} height={PARK.y2 - PARK.y1 - 20} rx={22} fill={kaartKleuren.park} />
      <Rect
        x={LOSLOOPGEBIED.x1}
        y={LOSLOOPGEBIED.y1}
        width={LOSLOOPGEBIED.x2 - LOSLOOPGEBIED.x1}
        height={LOSLOOPGEBIED.y2 - LOSLOOPGEBIED.y1}
        rx={16}
        fill={kaartKleuren.losloop}
        stroke="#7CC488"
        strokeWidth={2}
        strokeDasharray="8 6"
      />
      <SvgText x={(LOSLOOPGEBIED.x1 + LOSLOOPGEBIED.x2) / 2} y={LOSLOOPGEBIED.y1 + 66} fontSize={Math.min(11 * t, 20)} fontWeight="700" fill="#3F7A4A" textAnchor="middle" fontFamily={LETTER}>
        Losloop
      </SvgText>
      <Ellipse cx={VIJVER.cx} cy={VIJVER.cy} rx={VIJVER.rx} ry={VIJVER.ry} fill={kaartKleuren.water} />
      <Polyline points={pts(parkLus)} fill="none" stroke={kaartKleuren.parkPad} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      {PARK_ZIJPADEN.map((p, i) => (
        <Polyline key={i} points={pts(p)} fill="none" stroke={kaartKleuren.parkPad} strokeWidth={8} strokeLinecap="round" />
      ))}
      <SvgText x={(PARK.x1 + PARK.x2) / 2 - 20} y={PARK.y1 + 120} fontSize={14 * t} fontWeight="700" fill="#4E8A5A" textAnchor="middle" fontFamily={LETTER}>
        Stadspark
      </SvgText>

      {BUITENWEGEN.map((p, i) => (
        <Polyline key={`b${i}`} points={pts(p)} fill="none" stroke={kaartKleuren.wegRand} strokeWidth={15} strokeLinecap="round" />
      ))}
      {BUITENWEGEN.map((p, i) => (
        <Polyline key={`bw${i}`} points={pts(p)} fill="none" stroke={kaartKleuren.weg} strokeWidth={12} strokeLinecap="round" />
      ))}
      {STRATEN.map((s, i) => (
        <Polyline
          key={`r${i}`}
          points={pts(s.punten)}
          fill="none"
          stroke={kaartKleuren.wegRand}
          strokeWidth={(s.hoofdweg ? 20 : 14) + 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {STRATEN.map((s, i) => (
        <Polyline
          key={`w${i}`}
          points={pts(s.punten)}
          fill="none"
          stroke={kaartKleuren.weg}
          strokeWidth={s.hoofdweg ? 20 : 14}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {STRATEN.flatMap((s, i) =>
        s.punten.slice(1).map((b, j) => {
          const a = s.punten[j];
          const verticaal = a.x === b.x;
          // Om en om een straatnaam, zodat niet elk stukje een label krijgt
          if ((j + (verticaal ? 1 : 0)) % 2 === 1 && s.punten.length > 2) return null;
          const x = (a.x + b.x) / 2;
          const y = (a.y + b.y) / 2;
          const grootte = Math.min(10 * t, 20);
          return (
            <SvgText
              key={`l${i}-${j}`}
              x={x}
              y={y + grootte * 0.35}
              fontSize={grootte}
              fontFamily={LETTER}
              fontWeight="600"
              fill={kaartKleuren.label}
              textAnchor="middle"
              transform={verticaal ? `rotate(-90 ${x} ${y})` : undefined}
            >
              {s.naam}
            </SvgText>
          );
        }),
      )}

      <Rect x={918} y={372} width={22} height={22} rx={6} fill="#FF6B6B" />
      <Rect x={926} y={377} width={6} height={12} fill="#fff" />
      <Rect x={923} y={380} width={12} height={6} fill="#fff" />
      <SvgText x={929} y={398 + 12 * t} fontSize={10 * t} fontWeight="700" fill="#C44D4D" textAnchor="middle" fontFamily={LETTER}>
        Dierenkliniek
      </SvgText>
    </G>
  );
});

type IonNaam = ComponentProps<typeof Ionicons>['name'];
type MciNaam = ComponentProps<typeof MaterialCommunityIcons>['name'];

const GEBEURTENIS_ICOON: Record<GebeurtenisSoort, { naam: MciNaam; kleur: string }> = {
  start: { naam: 'flag-variant', kleur: kleuren.like },
  foto: { naam: 'camera', kleur: kleuren.primair },
  plas: { naam: 'water', kleur: '#E2B714' },
  poep: { naam: 'emoticon-poop', kleur: '#8B5E3C' },
  water: { naam: 'cup-water', kleur: kleuren.info },
  notitie: { naam: 'note-text', kleur: kleuren.gedempt },
  einde: { naam: 'home', kleur: kleuren.like },
  incident: { naam: 'alert', kleur: kleuren.nope },
};

export function gebeurtenisIcoon(soort: GebeurtenisSoort) {
  return GEBEURTENIS_ICOON[soort];
}

const VERVOER_ICOON: Record<Vervoer, IonNaam> = { lopend: 'walk', fiets: 'bicycle', auto: 'car' };

function Puls({ kleur, grootte }: { kleur: string; grootte: number }) {
  const [waarde] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const lus = Animated.loop(
      Animated.timing(waarde, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
    );
    lus.start();
    return () => lus.stop();
  }, [waarde]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: grootte,
        height: grootte,
        borderRadius: grootte / 2,
        backgroundColor: kleur,
        opacity: waarde.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
        transform: [{ scale: waarde.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
      }}
    />
  );
}

function MarkerInhoud({ m }: { m: KaartMarker }) {
  switch (m.soort) {
    case 'thuis':
    case 'klant':
      return (
        <View style={s.midden}>
          {m.label ? (
            <View style={s.bubbelVak}>
              <View style={s.bubbel}>
                <Text style={s.bubbelTekst}>{m.label}</Text>
              </View>
            </View>
          ) : null}
          <View style={[s.thuis, schaduw]}>
            <Ionicons name={m.soort === 'thuis' ? 'home' : 'location'} size={18} color="#fff" />
          </View>
        </View>
      );
    case 'uitlater':
      return (
        <View style={s.midden}>
          {m.bubbel ? (
            <View style={s.bubbelVak}>
              <View style={[s.bubbel, m.actief ? { backgroundColor: kleuren.primair } : null]}>
                <Text style={s.bubbelTekst} numberOfLines={1}>
                  {m.bubbel}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={[s.uitlaterRand, schaduw, m.actief ? { borderColor: kleuren.primair } : null]}>
            <LinearGradient colors={m.kleur} style={s.uitlater}>
              <Text style={s.uitlaterLetter}>{m.naam.slice(0, 1)}</Text>
            </LinearGradient>
            <View style={s.vervoer}>
              <Ionicons name={VERVOER_ICOON[m.vervoer]} size={11} color={kleuren.tekst} />
            </View>
          </View>
        </View>
      );
    case 'hond':
      return (
        <View style={s.midden}>
          <Puls kleur={kleuren.primair} grootte={46} />
          <View style={[s.hondRand, schaduw]}>
            <LinearGradient colors={m.kleur} style={s.hond}>
              <MaterialCommunityIcons name="dog" size={22} color="#fff" />
            </LinearGradient>
          </View>
        </View>
      );
    case 'ik':
      return (
        <View style={s.midden}>
          <Puls kleur={kleuren.locatie} grootte={40} />
          <View style={s.ik} />
        </View>
      );
    case 'gebeurtenis': {
      const icoon = GEBEURTENIS_ICOON[m.gebeurtenis];
      return (
        <View style={[s.gebeurtenis, schaduw]}>
          <MaterialCommunityIcons name={icoon.naam} size={13} color={icoon.kleur} />
        </View>
      );
    }
  }
}

/**
 * Kaart van de demowijk met markers en routes. Schuiven kan met een vinger of muis.
 * Zelfde opzet als een echte kaartcomponent, zodat deze later te vervangen is.
 */
export function Kaart({
  markers = [],
  routes = [],
  focus,
  bovenmarge = 0,
  ondermarge = 0,
  maxZoom = 0.95,
  minZoom = 0.3,
  vast,
  stijl,
}: {
  markers?: KaartMarker[];
  routes?: KaartRoute[];
  /** Punten die in beeld moeten zijn */
  focus: Punt[];
  bovenmarge?: number;
  ondermarge?: number;
  maxZoom?: number;
  minZoom?: number;
  /** Niet verschuifbaar, bijvoorbeeld binnen een scrollende pagina */
  vast?: boolean;
  stijl?: StyleProp<ViewStyle>;
}) {
  const [maat, setMaat] = useState({ w: 0, h: 0 });
  const [verschuiving, setVerschuiving] = useState({ x: 0, y: 0 });
  const [sleep, setSleep] = useState({ x: 0, y: 0 });

  const camera = useMemo(() => {
    const { w, h } = maat;
    const beschikbaarH = Math.max(120, h - bovenmarge - ondermarge);
    const o = omvatting(focus.length ? focus : [{ x: 500, y: 600 }]);
    const marge = 56;
    const bw = Math.max(1, o.maxX - o.minX);
    const bh = Math.max(1, o.maxY - o.minY);
    let z = Math.min((w - 2 * marge) / bw, (beschikbaarH - 2 * marge) / bh);
    if (!Number.isFinite(z) || z <= 0) z = maxZoom;
    // Eén punt in beeld: niet maximaal inzoomen, zodat de straten eromheen zichtbaar blijven
    if (bw < 60 && bh < 60) z = Math.min(z, 0.75);
    z = Math.max(minZoom, Math.min(maxZoom, z));
    const cx = (o.minX + o.maxX) / 2;
    const cy = (o.minY + o.maxY) / 2;
    const x0 = cx - w / 2 / z;
    const y0 = cy - (bovenmarge + beschikbaarH / 2) / z;
    return { z, x0, y0 };
  }, [maat, focus, bovenmarge, ondermarge, maxZoom, minZoom]);

  const tekstSchaal = Math.round(Math.min(2.2, Math.max(1, 1 / camera.z)) * 5) / 5;
  const dx = verschuiving.x + sleep.x;
  const dy = verschuiving.y + sleep.y;
  const x0 = camera.x0 - dx / camera.z;
  const y0 = camera.y0 - dy / camera.z;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onPanResponderMove: (_e, g) => setSleep({ x: g.dx, y: g.dy }),
        onPanResponderRelease: (_e, g) => {
          setVerschuiving((v) => ({ x: v.x + g.dx, y: v.y + g.dy }));
          setSleep({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => setSleep({ x: 0, y: 0 }),
      }),
    [],
  );

  const scherm = (p: Punt) => ({ left: (p.x - x0) * camera.z, top: (p.y - y0) * camera.z });
  const verschoven = verschuiving.x !== 0 || verschuiving.y !== 0;

  return (
    <View style={[s.kaart, stijl]} onLayout={(e) => setMaat({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...(vast ? {} : pan.panHandlers)}>
      {maat.w > 0 ? (
        <>
          <Svg width={maat.w} height={maat.h} viewBox={`${x0} ${y0} ${maat.w / camera.z} ${maat.h / camera.z}`} preserveAspectRatio="none">
            <Ondergrond t={tekstSchaal} />
            {routes.map((r) =>
              r.punten.length > 1 ? (
                <G key={r.id}>
                  {!r.gestippeld ? (
                    <Polyline
                      points={pts(r.punten)}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={((r.dikte ?? 5) + 4) / camera.z}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  <Polyline
                    points={pts(r.punten)}
                    fill="none"
                    stroke={r.kleur}
                    strokeWidth={(r.dikte ?? 5) / camera.z}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={r.gestippeld ? `${2 / camera.z} ${9 / camera.z}` : undefined}
                  />
                </G>
              ) : null,
            )}
          </Svg>
          {markers.map((m) => {
            const pos = scherm(m.punt);
            const inhoud = <MarkerInhoud m={m} />;
            return (
              <View key={m.id} style={[s.marker, { left: pos.left, top: pos.top }]} pointerEvents="box-none">
                <View style={s.anker} pointerEvents="box-none">
                  {m.soort === 'uitlater' && m.onPress ? (
                    <Pressable onPress={m.onPress} accessibilityRole="button" accessibilityLabel={`Uitlater ${m.naam}`}>
                      {inhoud}
                    </Pressable>
                  ) : (
                    inhoud
                  )}
                </View>
              </View>
            );
          })}
          {verschoven ? (
            <Pressable
              onPress={() => setVerschuiving({ x: 0, y: 0 })}
              accessibilityRole="button"
              accessibilityLabel="Kaart centreren"
              style={[s.centreer, schaduw, { bottom: ondermarge + 14 }]}
            >
              <Ionicons name="locate" size={20} color={kleuren.tekst} />
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { flex: 1, overflow: 'hidden', backgroundColor: kaartKleuren.land },
  marker: { position: 'absolute', width: 0, height: 0, overflow: 'visible' },
  anker: { position: 'absolute', width: 120, height: 120, left: -60, top: -60, alignItems: 'center', justifyContent: 'center' },
  midden: { alignItems: 'center', justifyContent: 'center' },
  thuis: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: kleuren.primair,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbelVak: { position: 'absolute', bottom: 42, width: 120, alignItems: 'center' },
  bubbel: {
    backgroundColor: kleuren.tekst,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bubbelTekst: { color: '#fff', fontSize: 11, fontWeight: '800' },
  uitlaterRand: { width: 38, height: 38, borderRadius: 19, borderWidth: 2.5, borderColor: '#fff', backgroundColor: '#fff' },
  uitlater: { flex: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  uitlaterLetter: { color: '#fff', fontWeight: '900', fontSize: 15 },
  vervoer: {
    position: 'absolute',
    right: -6,
    bottom: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: kleuren.rand,
  },
  hondRand: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#fff', backgroundColor: '#fff' },
  hond: { flex: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ik: { width: 18, height: 18, borderRadius: 9, backgroundColor: kleuren.locatie, borderWidth: 3, borderColor: '#fff' },
  gebeurtenis: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreer: {
    position: 'absolute',
    right: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
