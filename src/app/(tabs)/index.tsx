import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PersoonAvatar } from '../../components/avatars';
import { Blad, RondeKnop, Sterren, useNu } from '../../components/blokken';
import { Kaart, type KaartMarker } from '../../components/Kaart';
import { Woordmerk } from '../../components/merk';
import { Chip } from '../../components/ui';
import { boekingOpKaart } from '../../lib/kaartLagen';
import { routeTussen } from '../../lib/route';
import { reistijdMin, resterendeRitMin, verstrekenMin } from '../../lib/simulatie';
import { begroeting } from '../../lib/tijd';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte, schaduw } from '../../theme';
import type { BoekConcept } from '../../types';

export default function Uitlaten() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nu = useNu(400);
  const { gebruiker, honden, uitlaters, bekend, geblokkeerd, actieveBoeking, zetConcept, uitlater } = useApp();
  const [bladHoogte, setBladHoogte] = useState(330);

  const thuis = gebruiker?.thuis;
  const eta = useMemo(() => {
    const m = new Map<string, number>();
    if (thuis) for (const u of uitlaters) m.set(u.id, Math.round(reistijdMin(routeTussen(u.positie, thuis), u.vervoer)));
    return m;
  }, [uitlaters, thuis]);

  if (!gebruiker || !thuis) return null;

  const actief = actieveBoeking;
  const actieveUitlater = actief ? uitlater(actief.uitlaterId) : undefined;
  const online = uitlaters.filter((u) => u.online && !geblokkeerd.includes(u.id));
  const mijnUitlaters = uitlaters.filter((u) => bekend.includes(u.id) && !geblokkeerd.includes(u.id));
  const hondNamen = honden.map((h) => h.naam).join(' en ');

  const start = (deel: Partial<BoekConcept>) => {
    zetConcept({ hondIds: honden.slice(0, 1).map((h) => h.id), duur: 30, moment: { type: 'nu' }, uitlaterId: null, ...deel });
    router.push('/boeken');
  };

  let markers: KaartMarker[] = [];
  let routes: ReturnType<typeof boekingOpKaart>['routes'] = [];
  let focus = [thuis, ...[...online].sort((a, b) => (eta.get(a.id) ?? 0) - (eta.get(b.id) ?? 0)).slice(0, 5).map((u) => u.positie)];

  if (actief && actieveUitlater && actief.status !== 'aangevraagd') {
    const laag = boekingOpKaart(actief, nu, actieveUitlater, honden.find((h) => h.id === actief.hondIds[0])?.kleur ?? kleuren.verloop.slice() as [string, string]);
    markers = laag.markers;
    routes = laag.routes;
    focus = laag.focus;
  } else {
    markers = [
      { id: 'thuis', soort: 'thuis', punt: thuis },
      ...online.map(
        (u): KaartMarker => ({
          id: u.id,
          soort: 'uitlater',
          punt: u.positie,
          naam: u.voornaam,
          kleur: u.kleur,
          vervoer: u.vervoer,
          bubbel: `${eta.get(u.id)} min`,
          onPress: () => router.push({ pathname: '/uitlater/[id]', params: { id: u.id } }),
        }),
      ),
    ];
  }

  let statusTekst = '';
  if (actief && actieveUitlater) {
    switch (actief.status) {
      case 'aangevraagd':
        statusTekst = `Aanvraag verstuurd naar ${actieveUitlater.voornaam}`;
        break;
      case 'onderweg':
        statusTekst = `${actieveUitlater.voornaam} is onderweg, nog ${Math.max(1, Math.round(resterendeRitMin(actief, actieveUitlater.vervoer, nu)))} min`;
        break;
      case 'aangekomen':
        statusTekst = `${actieveUitlater.voornaam} staat voor de deur`;
        break;
      case 'bezig':
        statusTekst = `Aan het wandelen, ${Math.min(actief.duur, Math.floor(verstrekenMin(actief, nu)))} van ${actief.duur} min`;
        break;
    }
  }

  return (
    <View style={s.scherm}>
      <Kaart markers={markers} routes={routes} focus={focus} bovenmarge={insets.top + 64} ondermarge={bladHoogte} />

      <View style={[s.boven, { top: insets.top + ruimte(2) }]} pointerEvents="box-none">
        <View style={[s.merkPil, schaduw]}>
          <Woordmerk grootte={20} />
        </View>
        <RondeKnop icoon="shield-checkmark" label="Veiligheid en hulp" kleur={kleuren.primair} onPress={() => router.push('/veiligheid')} />
      </View>

      <Blad onHoogte={setBladHoogte}>
        {actief && actieveUitlater ? (
          <Pressable onPress={() => router.push({ pathname: '/wandeling/[id]', params: { id: actief.id } })} accessibilityRole="button">
            <LinearGradient colors={kleuren.verloop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.actief}>
              <PersoonAvatar naam={actieveUitlater.voornaam} kleur={actieveUitlater.kleur} grootte={40} stijl={s.actiefAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.actiefTitel}>{statusTekst}</Text>
                <Text style={s.actiefSub}>Tik om live te volgen</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : null}

        <Text style={s.groet}>
          {begroeting(nu)}, {gebruiker.voornaam}
        </Text>

        <Pressable onPress={() => start({})} accessibilityRole="button" style={({ pressed }) => [s.zoek, pressed && { backgroundColor: kleuren.rand }]}>
          <MaterialCommunityIcons name="paw" size={22} color={kleuren.primair} />
          <Text style={s.zoekTekst} numberOfLines={1}>
            Wie laat {honden.length > 1 ? 'je honden' : hondNamen} uit?
          </Text>
          <View style={s.nuPil}>
            <Ionicons name="time" size={14} color={kleuren.tekst} />
            <Text style={s.nuTekst}>Nu</Text>
          </View>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.snelRij}>
          <Chip label="Nu, 30 min" icoon="flash" actief={false} onPress={() => start({ duur: 30 })} />
          <Chip label="Nu, 60 min" actief={false} onPress={() => start({ duur: 60 })} />
          <Chip label="Later vandaag" icoon="calendar" actief={false} onPress={() => start({ moment: { type: 'later', tijdstip: 0 } })} />
          <Chip label="Elke week" icoon="repeat" actief={false} onPress={() => start({ moment: { type: 'wekelijks', dagen: [0, 2, 4], tijd: '12:30' } })} />
        </ScrollView>

        {mijnUitlaters.length > 0 ? (
          <>
            <Text style={s.kopje}>Jouw uitlaters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mijnRij}>
              {mijnUitlaters.map((u) => (
                <Pressable key={u.id} onPress={() => start({ uitlaterId: u.id })} accessibilityRole="button" style={s.mijnKaart}>
                  <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={48} />
                  <View>
                    <Text style={s.mijnNaam}>{u.voornaam}</Text>
                    <Sterren waarde={u.beoordeling} grootte={12} />
                    <Text style={[s.mijnStatus, u.online && { color: kleuren.like }]}>{u.online ? `Online, ${eta.get(u.id)} min` : 'Offline, inplannen'}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={s.voet}>
          <View style={s.stip} />
          <Text style={s.voetTekst}>{online.length} uitlaters online bij jou in de buurt</Text>
        </View>
      </Blad>
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  boven: { position: 'absolute', left: ruimte(4), right: ruimte(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merkPil: { backgroundColor: '#fff', borderRadius: radius.rond, paddingLeft: 8, paddingRight: 14, paddingVertical: 6 },
  actief: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), padding: ruimte(3), borderRadius: radius.midden, marginBottom: ruimte(3) },
  actiefAvatar: { borderWidth: 2, borderColor: '#fff' },
  actiefTitel: { color: '#fff', fontSize: 16, fontWeight: '800' },
  actiefSub: { color: '#fff', opacity: 0.9, fontSize: 13, marginTop: 1 },
  groet: { fontSize: 22, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.4, marginBottom: ruimte(3) },
  zoek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruimte(3),
    backgroundColor: kleuren.vlak,
    borderRadius: radius.midden,
    paddingHorizontal: ruimte(4),
    paddingVertical: ruimte(4),
  },
  zoekTekst: { flex: 1, fontSize: 18, fontWeight: '700', color: kleuren.tekst },
  nuPil: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: radius.rond, paddingHorizontal: 10, paddingVertical: 6 },
  nuTekst: { fontSize: 14, fontWeight: '700', color: kleuren.tekst },
  snelRij: { gap: ruimte(2), paddingVertical: ruimte(3) },
  kopje: { fontSize: 13, fontWeight: '800', color: kleuren.primair, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: ruimte(1), marginBottom: ruimte(2) },
  mijnRij: { gap: ruimte(3), paddingBottom: ruimte(2) },
  mijnKaart: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(3), paddingRight: ruimte(4) },
  mijnNaam: { fontSize: 16, fontWeight: '800', color: kleuren.tekst },
  mijnStatus: { fontSize: 12, color: kleuren.gedempt, marginTop: 2, fontWeight: '600' },
  voet: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginTop: ruimte(2) },
  stip: { width: 8, height: 8, borderRadius: 4, backgroundColor: kleuren.like },
  voetTekst: { fontSize: 13, color: kleuren.gedempt },
});
