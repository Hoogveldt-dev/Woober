import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HondAvatar, PersoonAvatar } from '../components/avatars';
import { Segment, Sterren } from '../components/blokken';
import { Kaart, type KaartMarker } from '../components/Kaart';
import { Badge, Chip, Knop, Label, Melding } from '../components/ui';
import { DUREN, euro, euroKort, OPPAS_DUREN } from '../lib/prijs';
import { formatAfstand } from '../lib/route';
import { DAGEN_KORT, dagVan, duurTekst, tijdstipOp, tijdTekst } from '../lib/tijd';
import { factorTekst } from '../lib/verdienmodel';
import { uitlaterOpties, type Sortering, type UitlaterOptie } from '../lib/zoeken';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Dag, Dienst, Moment, OppasPlek } from '../types';

const TIJDEN = ['07:30', '09:00', '10:30', '12:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30'];
/** Oppas vooral 's avonds, maar ook overdag als je een dag weg bent */
const OPPAS_TIJDEN = ['09:00', '13:00', '17:00', '18:00', '19:00', '19:30', '20:00', '21:00'];

function dagLabel(i: number, nu: number) {
  if (i === 0) return 'Vandaag';
  if (i === 1) return 'Morgen';
  const d = new Date(nu + i * 86400000);
  return `${DAGEN_KORT[dagVan(d)]} ${d.getDate()}`;
}

function OptieRij({ o, gekozen, onKies, onInfo, dienst }: { o: UitlaterOptie; gekozen: boolean; onKies: () => void; onInfo: () => void; dienst: Dienst }) {
  return (
    <Pressable
      onPress={onKies}
      disabled={!o.beschikbaar}
      accessibilityRole="radio"
      accessibilityState={{ selected: gekozen, disabled: !o.beschikbaar }}
      style={[s.optie, gekozen && s.optieGekozen, !o.beschikbaar && { opacity: 0.45 }]}
    >
      <PersoonAvatar naam={o.u.voornaam} kleur={o.u.kleur} grootte={52} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.naamRij}>
          <Text style={s.naam}>{o.u.voornaam}</Text>
          {o.bekend ? <Badge tekst="KEN JE" icoon="heart" kleur={kleuren.primair} /> : null}
          {o.u.professioneel ? <Badge tekst="KVK" icoon="briefcase" kleur={kleuren.info} /> : null}
        </View>
        <Sterren waarde={o.u.beoordeling} aantal={o.u.aantalBeoordelingen} grootte={13} />
        <Text style={s.optieSub} numberOfLines={1}>
          {o.beschikbaar ? `${o.etaMin} min, ${formatAfstand(o.afstandM)}` : o.reden}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={s.prijs}>{euro(o.prijs.totaal)}</Text>
        {dienst === 'oppas' ? <Text style={s.perUur}>{euroKort(o.u.oppasPerUur)} per uur</Text> : null}
        <Pressable onPress={onInfo} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Profiel van ${o.u.voornaam}`}>
          <Ionicons name="information-circle-outline" size={22} color={kleuren.gedempt} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function Boeken() {
  const router = useRouter();
  const { concept, zetConcept, honden, gebruiker, uitlaters, bekend, geblokkeerd, prijsVoor, verdienmodel } = useApp();
  const [nu] = useState(() => Date.now());

  const [dienst, setDienst] = useState<Dienst>(concept?.dienst ?? 'uitlaten');
  const tijdenLijst = dienst === 'oppas' ? OPPAS_TIJDEN : TIJDEN;

  const beginMoment = (): Moment => {
    const m = concept?.moment ?? { type: 'nu' };
    if (m.type === 'later' && m.tijdstip < nu) {
      const lijst = concept?.dienst === 'oppas' ? OPPAS_TIJDEN.filter((t) => t >= '17:00') : TIJDEN;
      const vrij = lijst.map((t) => tijdstipOp(0, t, nu)).find((t) => t > nu + 30 * 60000);
      return { type: 'later', tijdstip: vrij ?? tijdstipOp(1, lijst[0], nu) };
    }
    return m;
  };

  const [hondIds, setHondIds] = useState<string[]>(concept?.hondIds.length ? concept.hondIds : honden.slice(0, 1).map((h) => h.id));
  const [duur, setDuur] = useState<number>(concept?.duur ?? 30);
  const [moment, setMoment] = useState<Moment>(beginMoment);
  const [sortering, setSortering] = useState<Sortering>('afstand');
  const [gekozen, setGekozen] = useState<string | null>(concept?.uitlaterId ?? null);
  const [oppasPlek, setOppasPlek] = useState<OppasPlek>(concept?.oppasPlek ?? 'bij_eigenaar');

  const huidigConcept = { dienst, oppasPlek: dienst === 'oppas' ? oppasPlek : undefined, hondIds, duur, moment, uitlaterId: gekozen };
  const opties = useMemo(
    () =>
      gebruiker
        ? uitlaterOpties(uitlaters, gebruiker.thuis, { dienst, oppasPlek, hondIds, duur, moment, uitlaterId: null }, bekend, geblokkeerd, sortering, prijsVoor)
        : [],
    [uitlaters, gebruiker, dienst, oppasPlek, hondIds, duur, moment, bekend, geblokkeerd, sortering, prijsVoor],
  );
  if (!gebruiker) return null;

  const keuze = opties.find((o) => o.u.id === gekozen && o.beschikbaar);
  const beschikbaar = opties.filter((o) => o.beschikbaar);
  const drukte = Math.max(1, ...beschikbaar.map((o) => o.prijs.drukteFactor));
  const zonderServicekosten = verdienmodel.servicekostenPercentage === 0 && verdienmodel.boekingskosten === 0;

  const laterDag = moment.type === 'later' ? Math.round((new Date(moment.tijdstip).setHours(0, 0, 0, 0) - new Date(nu).setHours(0, 0, 0, 0)) / 86400000) : 0;
  const laterTijd = moment.type === 'later' ? `${String(new Date(moment.tijdstip).getHours()).padStart(2, '0')}:${String(new Date(moment.tijdstip).getMinutes()).padStart(2, '0')}` : '';
  const tijdenVoorDag = (dag: number) => tijdenLijst.filter((t) => tijdstipOp(dag, t, nu) > nu + 30 * 60000);
  const oppas = dienst === 'oppas';
  const wie = oppas ? 'oppas' : 'uitlater';
  const startTijd = moment.type === 'nu' ? nu : moment.type === 'later' ? moment.tijdstip : tijdstipOp(0, moment.tijd, nu);

  const wisselDienst = (d: Dienst) => {
    if (d === dienst) return;
    setDienst(d);
    setDuur(d === 'oppas' ? 180 : 30);
    if (d === 'oppas') setHondIds(honden.map((h) => h.id));
    setGekozen(null);
    if (moment.type === 'later') {
      const lijst = d === 'oppas' ? OPPAS_TIJDEN : TIJDEN;
      const vrij = lijst.map((t) => tijdstipOp(0, t, nu)).find((t) => t > nu + 30 * 60000);
      setMoment({ type: 'later', tijdstip: vrij ?? tijdstipOp(1, lijst[0], nu) });
    }
  };

  const wisselHond = (id: string) => setHondIds((ids) => (ids.includes(id) ? (ids.length > 1 ? ids.filter((x) => x !== id) : ids) : [...ids, id]));

  const kaartMarkers: KaartMarker[] = [
    { id: 'thuis', soort: 'thuis', punt: gebruiker.thuis },
    ...beschikbaar.map(
      (o): KaartMarker => ({
        id: o.u.id,
        soort: 'uitlater',
        punt: o.u.positie,
        naam: o.u.voornaam,
        kleur: o.u.kleur,
        actief: o.u.id === gekozen,
        bubbel: o.u.id === gekozen ? euro(o.prijs.totaal) : undefined,
        onPress: () => setGekozen(o.u.id),
      }),
    ),
  ];

  const verder = () => {
    if (!keuze) return;
    zetConcept(huidigConcept);
    if (keuze.bekend) router.push('/bevestigen');
    else router.push({ pathname: '/kennismaking', params: { uitlaterId: keuze.u.id } });
  };

  return (
    <View style={s.scherm}>
      <Stack.Screen options={{ title: oppas ? 'Kies een oppas' : 'Kies een uitlater' }} />
      <View style={s.kaart}>
        <Kaart markers={kaartMarkers} focus={[gebruiker.thuis, ...beschikbaar.slice(0, 5).map((o) => o.u.positie)]} maxZoom={0.9} />
      </View>

      <ScrollView contentContainerStyle={s.inhoud}>
        <Segment
          opties={[
            { waarde: 'uitlaten', label: 'Uitlaten' },
            { waarde: 'oppas', label: 'Oppas' },
          ]}
          waarde={dienst}
          onChange={wisselDienst}
        />
        {oppas ? (
          <>
            <View style={{ height: ruimte(4) }} />
            <Label>Waar</Label>
            <Segment<OppasPlek>
              opties={[
                { waarde: 'bij_eigenaar', label: 'Bij mij thuis' },
                { waarde: 'bij_oppas', label: 'Bij de oppas thuis' },
              ]}
              waarde={oppasPlek}
              onChange={(p) => {
                setOppasPlek(p);
                setGekozen(null);
              }}
            />
          </>
        ) : null}
        <View style={{ height: ruimte(5) }} />
        {honden.length > 1 ? (
          <>
            <Label>Welke honden</Label>
            <View style={s.rij}>
              {honden.map((h) => (
                <Pressable key={h.id} onPress={() => wisselHond(h.id)} accessibilityRole="checkbox" accessibilityState={{ checked: hondIds.includes(h.id) }} style={[s.hondChip, hondIds.includes(h.id) && s.hondChipAan]}>
                  <HondAvatar hond={h} grootte={28} />
                  <Text style={[s.hondNaam, hondIds.includes(h.id) && { color: '#fff' }]}>{h.naam}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: ruimte(4) }} />
          </>
        ) : null}

        <Label>Wanneer</Label>
        <Segment
          opties={[
            { waarde: 'nu', label: 'Nu' },
            { waarde: 'later', label: 'Later' },
            { waarde: 'wekelijks', label: 'Elke week' },
          ]}
          waarde={moment.type}
          onChange={(t) => {
            if (t === 'nu') setMoment({ type: 'nu' });
            if (t === 'later') {
              const dag = tijdenVoorDag(0).length ? 0 : 1;
              setMoment({ type: 'later', tijdstip: tijdstipOp(dag, tijdenVoorDag(dag)[0] ?? '09:00', nu) });
            }
            if (t === 'wekelijks') setMoment(oppas ? { type: 'wekelijks', dagen: [4], tijd: '19:00' } : { type: 'wekelijks', dagen: [0, 2, 4], tijd: '12:30' });
          }}
        />

        {moment.type === 'later' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRij}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <Chip
                  key={i}
                  label={dagLabel(i, nu)}
                  actief={laterDag === i}
                  onPress={() => {
                    const tijden = tijdenVoorDag(i);
                    const tijd = tijden.includes(laterTijd) ? laterTijd : tijden[0];
                    if (tijd) setMoment({ type: 'later', tijdstip: tijdstipOp(i, tijd, nu) });
                  }}
                />
              ))}
            </ScrollView>
            <View style={s.rij}>
              {tijdenVoorDag(laterDag).map((t) => (
                <Chip key={t} label={t} actief={laterTijd === t} onPress={() => setMoment({ type: 'later', tijdstip: tijdstipOp(laterDag, t, nu) })} />
              ))}
            </View>
          </>
        ) : null}

        {moment.type === 'wekelijks' ? (
          <>
            <View style={[s.rij, { marginTop: ruimte(3) }]}>
              {DAGEN_KORT.map((d, i) => {
                const dag = i as Dag;
                const aan = moment.dagen.includes(dag);
                return (
                  <Chip
                    key={d}
                    label={d}
                    actief={aan}
                    onPress={() => {
                      const dagen = aan ? moment.dagen.filter((x) => x !== dag) : [...moment.dagen, dag];
                      if (dagen.length) setMoment({ ...moment, dagen });
                    }}
                  />
                );
              })}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRij}>
              {tijdenLijst.map((t) => (
                <Chip key={t} label={t} actief={moment.tijd === t} onPress={() => setMoment({ ...moment, tijd: t })} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={{ height: ruimte(4) }} />
        <Label>Hoe lang</Label>
        <Segment<number>
          opties={(oppas ? OPPAS_DUREN : DUREN).map((d) => ({ waarde: d, label: duurTekst(d) }))}
          waarde={duur}
          onChange={setDuur}
        />
        {oppas ? (
          <Text style={s.tot}>
            Tot ongeveer {tijdTekst(startTijd + duur * 60000)}. {oppasPlek === 'bij_oppas' ? 'Je brengt je hond zelf en haalt hem weer op.' : 'Later thuis?'} Je kunt in de app verlengen.
          </Text>
        ) : null}

        {drukte > 1 ? (
          <View style={{ marginTop: ruimte(5) }}>
            <Melding type="waarschuwing">
              Het is druk in de buurt: prijzen zijn tijdelijk {factorTekst(drukte)} zo hoog. Het grootste deel van de toeslag gaat naar de {wie}.
            </Melding>
          </View>
        ) : null}

        <View style={s.sorteerRij}>
          <Text style={s.aantal}>{beschikbaar.length} beschikbaar</Text>
          <View style={s.rij}>
            <Chip label="Dichtbij" actief={sortering === 'afstand'} onPress={() => setSortering('afstand')} />
            <Chip label="Beoordeling" actief={sortering === 'beoordeling'} onPress={() => setSortering('beoordeling')} />
            <Chip label="Prijs" actief={sortering === 'prijs'} onPress={() => setSortering('prijs')} />
          </View>
        </View>

        <View style={{ gap: ruimte(2) }}>
          {opties.map((o) => (
            <OptieRij
              key={o.u.id}
              o={o}
              gekozen={o.u.id === gekozen}
              onKies={() => setGekozen(o.u.id)}
              onInfo={() => router.push({ pathname: '/uitlater/[id]', params: { id: o.u.id } })}
              dienst={dienst}
            />
          ))}
        </View>
        <Text style={s.uitleg}>
          {oppas
            ? oppasPlek === 'bij_oppas'
              ? 'Je ziet alleen oppassen die honden thuis ontvangen; hun huis staat in hun profiel, het adres zie je na accepteren. '
              : 'Je ziet alleen mensen die bij jou thuis oppassen. Liever niemand anders in je huis? Kies Bij de oppas thuis. '
            : ''}
          {zonderServicekosten ? `Tijdens de ${verdienmodel.naam.toLowerCase()} betaal je alleen het tarief van de ${wie}, zonder servicekosten. ` : 'Prijzen zijn inclusief servicekosten. '}
          Elke {wie} bepaalt zelf het tarief. Bij iemand nieuw plan je eerst een gratis kennismaking.
        </Text>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={s.balk}>
        <Knop
          titel={!keuze ? `Kies een ${wie}` : keuze.bekend ? `Verder met ${keuze.u.voornaam}, ${euro(keuze.prijs.totaal)}` : `Eerst kennismaken met ${keuze.u.voornaam}`}
          icoon={keuze && !keuze.bekend ? 'hand-left' : undefined}
          uitgeschakeld={!keuze}
          onPress={verder}
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  kaart: { height: 190 },
  inhoud: { padding: ruimte(5), paddingBottom: ruimte(8), width: '100%', maxWidth: 560, alignSelf: 'center' },
  rij: { flexDirection: 'row', flexWrap: 'wrap', gap: ruimte(2) },
  chipRij: { gap: ruimte(2), paddingVertical: ruimte(3) },
  hondChip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, paddingRight: 14, borderRadius: radius.rond, borderWidth: 1.5, borderColor: kleuren.rand },
  hondChipAan: { backgroundColor: kleuren.primair, borderColor: kleuren.primair },
  hondNaam: { fontSize: 15, fontWeight: '700', color: kleuren.tekst },
  sorteerRij: { marginTop: ruimte(6), marginBottom: ruimte(3), gap: ruimte(2) },
  aantal: { fontSize: 13, fontWeight: '800', color: kleuren.primair, textTransform: 'uppercase', letterSpacing: 0.6 },
  optie: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), padding: ruimte(3), borderRadius: radius.midden, borderWidth: 2, borderColor: 'transparent', backgroundColor: kleuren.vlak },
  optieGekozen: { borderColor: kleuren.primair, backgroundColor: kleuren.primairVlak },
  naamRij: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  naam: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  optieSub: { fontSize: 13, color: kleuren.gedempt },
  prijs: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  perUur: { fontSize: 11, color: kleuren.gedempt, marginTop: -4 },
  tot: { fontSize: 13, color: kleuren.gedempt, marginTop: ruimte(2) },
  uitleg: { fontSize: 12, color: kleuren.gedempt, lineHeight: 17, marginTop: ruimte(4), textAlign: 'center' },
  balk: { paddingHorizontal: ruimte(5), paddingTop: ruimte(3), paddingBottom: ruimte(3), borderTopWidth: 1, borderTopColor: kleuren.rand, backgroundColor: '#fff' },
});
