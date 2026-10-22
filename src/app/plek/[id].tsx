import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gedeeldeStijl, Sectie, Sterren, SterrenKiezer } from '../../components/blokken';
import { Kaart } from '../../components/Kaart';
import { Knop, Melding, Veld } from '../../components/ui';
import { PLEK_REVIEW_MAX, PLEK_SOORTEN, plekScore } from '../../lib/plekken';
import { afstand, formatAfstand } from '../../lib/route';
import { dagTekst } from '../../lib/tijd';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';
import type { Plek, PlekReview } from '../../types';

export default function PlekScherm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plekken, gebruiker, rol } = useApp();
  const p = plekken.find((x) => x.id === id);
  if (!p) return <Redirect href={rol === 'uitlater' ? '/werk' : '/'} />;

  const soort = PLEK_SOORTEN[p.soort];
  const score = plekScore(p);

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['bottom']}>
      <Stack.Screen options={{ title: p.naam }} />
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <View style={s.kaart}>
          <Kaart markers={[{ id: p.id, soort: 'plek', punt: p.punt, naam: p.naam, plekSoort: p.soort, actief: true }]} focus={[p.punt]} vast />
        </View>

        <View style={s.kop}>
          <View style={[s.icoon, { backgroundColor: soort.kleur }]}>
            <MaterialCommunityIcons name={soort.icoon} size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={gedeeldeStijl.titel}>{p.naam}</Text>
            <Text style={s.soort}>
              {soort.label}
              {gebruiker ? `, ${formatAfstand(afstand(gebruiker.thuis, p.punt))} van huis` : ''}
            </Text>
          </View>
        </View>
        <Sterren waarde={score.gemiddelde} aantal={score.aantal} grootte={16} />

        <Text style={s.tekst}>{p.omschrijving}</Text>
        <View style={s.kenmerken}>
          {p.kenmerken.map((k) => (
            <View key={k} style={s.kenmerk}>
              <Ionicons name="checkmark" size={14} color={soort.kleur} />
              <Text style={s.kenmerkTekst}>{k}</Text>
            </View>
          ))}
        </View>
        {p.regels ? <Melding type="waarschuwing">{p.regels}</Melding> : null}
        <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(5) }]}>Regels kunnen veranderen. Kijk ter plekke altijd even op de borden.</Text>

        <MijnReview plek={p} />

        <Sectie>{`Reviews (${score.aantal})`}</Sectie>
        {p.reviews.length === 0 ? <Text style={gedeeldeStijl.hulp}>Nog geen reviews. Ben jij de eerste?</Text> : null}
        {p.reviews.map((r) => (
          <ReviewRij key={r.id} r={r} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function MijnReview({ plek }: { plek: Plek }) {
  const { beoordeelPlek, verwijderPlekReview } = useApp();
  const mijn = plek.reviews.find((r) => r.vanMij);
  const [bewerken, setBewerken] = useState(false);
  const [sterren, setSterren] = useState(mijn?.sterren ?? 0);
  const [tekst, setTekst] = useState(mijn?.tekst ?? '');

  if (mijn && !bewerken) {
    return (
      <View style={s.mijn}>
        <Text style={s.mijnTitel}>Bedankt voor je review!</Text>
        <Text style={gedeeldeStijl.hulp}>Je ziet hem hieronder tussen de andere reviews.</Text>
        <View style={s.mijnKnoppen}>
          <Knop
            titel="Aanpassen"
            variant="secundair"
            icoon="create"
            stijl={{ flex: 1 }}
            onPress={() => {
              setSterren(mijn.sterren);
              setTekst(mijn.tekst);
              setBewerken(true);
            }}
          />
          <Knop titel="Verwijderen" variant="gevaar" icoon="trash" stijl={{ flex: 1 }} onPress={() => verwijderPlekReview(plek.id)} />
        </View>
      </View>
    );
  }

  const opslaan = () => {
    beoordeelPlek(plek.id, sterren, tekst);
    setBewerken(false);
  };

  return (
    <View style={s.mijn}>
      <Text style={s.mijnTitel}>{mijn ? 'Pas je review aan' : 'Ben je hier geweest?'}</Text>
      <Text style={gedeeldeStijl.hulp}>Help andere baasjes met een eerlijke review. Andere gebruikers zien alleen je voornaam.</Text>
      <SterrenKiezer waarde={sterren} onChange={setSterren} />
      <Veld
        label="Jouw ervaring (optioneel)"
        value={tekst}
        onChangeText={setTekst}
        multiline
        maxLength={PLEK_REVIEW_MAX}
        placeholder={plek.soort === 'horeca' ? 'Mocht je hond mee naar binnen? Was er water?' : 'Hoe was het voor je hond?'}
        hulp={`${tekst.length} van ${PLEK_REVIEW_MAX} tekens`}
      />
      <View style={s.mijnKnoppen}>
        {mijn ? <Knop titel="Annuleren" variant="secundair" stijl={{ flex: 1 }} onPress={() => setBewerken(false)} /> : null}
        <Knop titel="Plaatsen" icoon="send" uitgeschakeld={sterren === 0} stijl={{ flex: 1 }} onPress={opslaan} />
      </View>
    </View>
  );
}

function ReviewRij({ r }: { r: PlekReview }) {
  const { gemeld, meld } = useApp();
  const isGemeld = gemeld.includes(r.id);
  return (
    <View style={s.review}>
      <View style={s.reviewKop}>
        <Text style={s.reviewNaam}>{r.vanMij ? `${r.van} (jij)` : r.van}</Text>
        <Sterren waarde={r.sterren} grootte={12} />
        <Text style={s.reviewDatum}>{dagTekst(r.datum)}</Text>
      </View>
      {r.tekst ? <Text style={s.reviewTekst}>{r.tekst}</Text> : null}
      {!r.vanMij ? (
        isGemeld ? (
          <Text style={s.gemeld}>Gemeld. Een medewerker bekijkt deze review.</Text>
        ) : (
          // Een melding wordt altijd door een mens beoordeeld; de review blijft staan tot die beslist
          <Pressable onPress={() => meld(r.id, 'Ongepaste review van een plek')} accessibilityRole="button" hitSlop={6} style={s.meld}>
            <Ionicons name="flag-outline" size={13} color={kleuren.gedempt} />
            <Text style={s.meldTekst}>Melden</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { height: 180, borderRadius: radius.midden, overflow: 'hidden', marginBottom: ruimte(4) },
  kop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), marginBottom: ruimte(2) },
  icoon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  soort: { fontSize: 14, color: kleuren.gedempt, marginTop: 2, fontWeight: '600' },
  tekst: { fontSize: 15, color: kleuren.tekst, lineHeight: 22, marginTop: ruimte(3), marginBottom: ruimte(3) },
  kenmerken: { flexDirection: 'row', flexWrap: 'wrap', gap: ruimte(2), marginBottom: ruimte(3) },
  kenmerk: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: kleuren.vlak, borderRadius: radius.rond, paddingHorizontal: 10, paddingVertical: 5 },
  kenmerkTekst: { fontSize: 13, fontWeight: '600', color: kleuren.tekst },
  mijn: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4), marginBottom: ruimte(5) },
  mijnTitel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst, marginBottom: 4 },
  mijnKnoppen: { flexDirection: 'row', gap: ruimte(3), marginTop: ruimte(3) },
  review: { borderBottomWidth: 1, borderBottomColor: kleuren.vlak, paddingVertical: ruimte(3) },
  reviewKop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginBottom: 4 },
  reviewNaam: { fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  reviewDatum: { fontSize: 12, color: kleuren.gedempt, marginLeft: 'auto' },
  reviewTekst: { fontSize: 15, color: kleuren.tekst, lineHeight: 22 },
  meld: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: ruimte(2), alignSelf: 'flex-start' },
  meldTekst: { fontSize: 12, color: kleuren.gedempt, fontWeight: '600' },
  gemeld: { fontSize: 12, color: kleuren.gedempt, marginTop: ruimte(2), fontStyle: 'italic' },
});
