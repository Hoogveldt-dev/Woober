import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersoonAvatar } from '../../components/avatars';
import { Blok, gedeeldeStijl, Rij, Sectie, Sterren, Tegel } from '../../components/blokken';
import { OppasHuisInfo } from '../../components/Huis';
import { MeldenBlad } from '../../components/MeldenBlad';
import { Badge, Knop } from '../../components/ui';
import { DUREN, euro } from '../../lib/prijs';
import { DAGDELEN, DAGEN_KORT, dagTekst } from '../../lib/tijd';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';
import type { Dag } from '../../types';

const VERVOER = { lopend: 'Lopend', fiets: 'Fiets', auto: 'Auto of bus' } as const;

function Check({ aan, tekst }: { aan: boolean; tekst: string }) {
  return (
    <View style={s.check}>
      <Ionicons name={aan ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={aan ? kleuren.like : kleuren.rand} />
      <Text style={[s.checkTekst, !aan && { color: kleuren.gedempt }]}>{tekst}</Text>
    </View>
  );
}

export default function UitlaterProfiel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { uitlater, bekend, honden, zetConcept, concept, meld, blokkeer, geblokkeerd } = useApp();
  const [menu, setMenu] = useState(false);
  const u = uitlater(id ?? '');
  if (!u || geblokkeerd.includes(u.id)) return <Redirect href="/" />;
  const kentJe = bekend.includes(u.id);

  const boek = () => {
    // Biedt deze persoon de dienst uit het concept niet aan, dan de dienst die wel kan
    const dienst = concept && u.diensten.includes(concept.dienst) ? concept.dienst : u.diensten[0];
    const zelfde = concept?.dienst === dienst;
    zetConcept({
      dienst,
      hondIds: zelfde && concept ? concept.hondIds : (dienst === 'oppas' ? honden : honden.slice(0, 1)).map((h) => h.id),
      duur: zelfde && concept ? concept.duur : dienst === 'oppas' ? 180 : 30,
      moment: concept?.moment ?? { type: 'nu' },
      uitlaterId: u.id,
    });
    router.push('/boeken');
  };

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: u.voornaam,
          headerRight: () => (
            <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="Melden of blokkeren" style={{ padding: 8 }}>
              <Ionicons name="shield-checkmark" size={22} color={kleuren.primair} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud}>
        <View style={s.kop}>
          <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={96} />
          <Text style={s.naam}>
            {u.voornaam}, {u.leeftijd}
          </Text>
          <Text style={gedeeldeStijl.sub}>{u.professioneel ? `${u.bedrijfsnaam}, ${u.wijk}` : u.wijk}</Text>
          <View style={s.badges}>
            {kentJe ? <Badge tekst="JULLIE KENNEN ELKAAR" icoon="heart" kleur={kleuren.primair} /> : null}
            {u.professioneel ? <Badge tekst="KVK" icoon="briefcase" kleur={kleuren.info} /> : null}
            {u.online ? <Badge tekst="NU ONLINE" icoon="radio-button-on" /> : null}
            {u.diensten.includes('uitlaten') ? <Badge tekst="UITLATEN" icoon="walk" kleur={kleuren.tekst} /> : null}
            {u.diensten.includes('oppas') ? <Badge tekst="OPPAS" icoon="home" kleur={kleuren.tekst} /> : null}
          </View>
        </View>

        <View style={s.tegels}>
          <Tegel waarde={u.beoordeling.toFixed(1).replace('.', ',')} label={`${u.aantalBeoordelingen} reviews`} />
          <Tegel waarde={String(u.aantalWandelingen)} label="keer geboekt" />
          <Tegel waarde={u.reageertBinnen} label="reageert binnen" />
        </View>

        <Sectie>{`Over ${u.voornaam}`}</Sectie>
        <Text style={s.tekst}>{u.bio}</Text>
        <Text style={[s.tekst, { color: kleuren.gedempt }]}>{u.ervaring}</Text>

        <Sectie>Gecontroleerd door Woober</Sectie>
        <View style={{ gap: 8, marginBottom: ruimte(5) }}>
          <Check aan tekst="18 jaar of ouder" />
          <Check aan={u.verificatie.identiteit} tekst="Identiteit gecontroleerd" />
          <Check aan={u.verificatie.verzekering} tekst="Aansprakelijkheidsverzekering" />
          <Check aan={u.verificatie.vog} tekst={u.verificatie.vog ? 'Verklaring Omtrent het Gedrag' : 'Nog geen VOG'} />
        </View>

        <Sectie>Eigen tarief</Sectie>
        <Blok>
          {u.diensten.includes('uitlaten') ? DUREN.map((d) => <Rij key={d} label={`Uitlaten, ${d} minuten`} waarde={euro(u.tarieven[d])} />) : null}
          {u.diensten.includes('oppas') ? <Rij label="Oppas, per uur" waarde={euro(u.oppasPerUur)} /> : null}
          <Rij label="Per extra hond" waarde={euro(u.toeslagExtraHond)} />
        </Blok>
        <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(3), marginBottom: ruimte(5) }]}>Servicekosten van Woober zie je bij het boeken.</Text>

        {u.diensten.includes('oppas') && u.oppasPlekken.includes('bij_oppas') && u.huis ? (
          <>
            <Sectie>{u.oppasPlekken.includes('bij_eigenaar') ? `Oppas bij jou of bij ${u.voornaam} thuis` : `Oppas bij ${u.voornaam} thuis`}</Sectie>
            <OppasHuisInfo huis={u.huis} />
            <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(5) }]}>Het adres zie je zodra {u.voornaam} je boeking accepteert.</Text>
          </>
        ) : null}

        <Sectie>Praktisch</Sectie>
        <Blok>
          <Rij label="Komt naar je toe" waarde={VERVOER[u.vervoer]} />
          <Rij label="Maximaal" waarde={`${u.maxHonden} ${u.maxHonden === 1 ? 'hond' : 'honden'} tegelijk`} />
          <Rij label="Werkgebied" waarde={`${String(u.werkgebiedKm).replace('.', ',')} km`} />
        </Blok>

        <Sectie>Meestal beschikbaar</Sectie>
        <View style={s.rooster}>
          {DAGEN_KORT.map((d, i) => (
            <View key={d} style={s.roosterKolom}>
              <Text style={s.roosterDag}>{d}</Text>
              {DAGDELEN.map((deel) => (
                <View key={deel} style={[s.roosterVak, u.beschikbaarheid[i as Dag].includes(deel) && { backgroundColor: kleuren.primair }]} />
              ))}
            </View>
          ))}
        </View>
        <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(5) }]}>Van boven naar beneden: ochtend, middag, avond.</Text>

        <Sectie>Reviews</Sectie>
        {u.reviews.map((r) => (
          <View key={r.id} style={s.review}>
            <View style={s.reviewKop}>
              <Text style={s.reviewNaam}>{r.van}</Text>
              <Sterren waarde={r.sterren} grootte={12} />
              <Text style={s.reviewDatum}>{dagTekst(r.datum)}</Text>
            </View>
            <Text style={s.tekst}>{r.tekst}</Text>
          </View>
        ))}
        <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(4) }]}>Reviews kunnen alleen na een betaalde wandeling worden geschreven.</Text>
      </ScrollView>

      <View style={s.balk}>
        <Knop titel="Bericht" variant="secundair" icoon="chatbubble" stijl={{ flex: 1 }} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: u.id } })} />
        {kentJe ? (
          <Knop titel="Boeken" icoon="paw" stijl={{ flex: 1.4 }} onPress={boek} />
        ) : (
          <Knop titel="Kennismaken" icoon="hand-left" stijl={{ flex: 1.4 }} onPress={() => router.push({ pathname: '/kennismaking', params: { uitlaterId: u.id } })} />
        )}
      </View>

      <MeldenBlad
        zichtbaar={menu}
        onSluit={() => setMenu(false)}
        naam={u.voornaam}
        rol="eigenaar"
        onMeld={(r) => meld(u.id, r)}
        onBlokkeer={() => {
          router.back();
          blokkeer(u.id);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  kop: { alignItems: 'center', marginBottom: ruimte(5) },
  naam: { fontSize: 26, fontWeight: '800', color: kleuren.tekst, marginTop: ruimte(3), letterSpacing: -0.5 },
  badges: { flexDirection: 'row', gap: 6, marginTop: ruimte(3), flexWrap: 'wrap', justifyContent: 'center' },
  tegels: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(5) },
  tekst: { fontSize: 15, color: kleuren.tekst, lineHeight: 22, marginBottom: ruimte(3) },
  check: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  checkTekst: { fontSize: 15, color: kleuren.tekst },
  rooster: { flexDirection: 'row', gap: 6, marginBottom: ruimte(2) },
  roosterKolom: { flex: 1, gap: 4, alignItems: 'stretch' },
  roosterDag: { fontSize: 12, fontWeight: '700', color: kleuren.gedempt, textAlign: 'center' },
  roosterVak: { height: 16, borderRadius: 4, backgroundColor: kleuren.vlak },
  review: { borderBottomWidth: 1, borderBottomColor: kleuren.vlak, paddingVertical: ruimte(3) },
  reviewKop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginBottom: 4 },
  reviewNaam: { fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  reviewDatum: { fontSize: 12, color: kleuren.gedempt, marginLeft: 'auto' },
  balk: {
    flexDirection: 'row',
    gap: ruimte(3),
    paddingHorizontal: ruimte(5),
    paddingVertical: ruimte(3),
    borderTopWidth: 1,
    borderTopColor: kleuren.rand,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: radius.klein,
  },
});
