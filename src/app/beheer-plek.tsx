import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl } from '../components/blokken';
import { EchteKaart } from '../components/EchteKaart';
import { Chip, Knop, Label, Melding, Veld } from '../components/ui';
import { pasPlekAan, verwijderPlekAlsBeheerder, type PlekStatus } from '../lib/beheer';
import { NIJMEGEN, type LatLng } from '../lib/kaart';
import { PLEK_NAAM_MAX, PLEK_OMSCHRIJVING_MAX, PLEK_REGELS_MAX, PLEK_SOORT_KORT, PLEK_SOORTEN, plekPunt } from '../lib/plekken';
import { useApp } from '../state/AppContext';
import { kleuren, ruimte, schaduw } from '../theme';
import type { PlekSoort } from '../types';

const SOORTEN: PlekSoort[] = ['losloop', 'strand', 'horeca', 'overig'];
const STATUSSEN: { id: PlekStatus; label: string }[] = [
  { id: 'gecontroleerd', label: 'Gecontroleerd' },
  { id: 'nieuw', label: 'Nieuw' },
  { id: 'verborgen', label: 'Verborgen' },
];

/** Een plek aanpassen of verplaatsen, als beheerder. Ook plekken van gebruikers. */
export default function BeheerPlek() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { plekken, herlaadPlekken } = useApp();
  const p = plekken.find((x) => x.id === id);
  const [soort, setSoort] = useState<PlekSoort>(p?.soort ?? 'overig');
  const [naam, setNaam] = useState(p?.naam ?? '');
  const [plaats, setPlaats] = useState(p?.plaats ?? 'Nijmegen');
  const [omschrijving, setOmschrijving] = useState(p?.omschrijving ?? '');
  const [kenmerken, setKenmerken] = useState((p?.kenmerken ?? []).join(', '));
  const [regels, setRegels] = useState(p?.regels ?? '');
  const [status, setStatus] = useState<PlekStatus>(p?.status ?? 'gecontroleerd');
  const [ligging, setLigging] = useState<LatLng>(p?.ligging ?? NIJMEGEN);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [verwijderen, setVerwijderen] = useState(false);
  const punten = useMemo(() => (p ? [plekPunt(p)].filter((x) => x !== null) : []), [p]);
  const begin = useMemo(() => ({ ...(p?.ligging ?? NIJMEGEN), zoom: 16 }), [p?.ligging]);

  if (!p) return <Redirect href="/beheer-plekken" />;

  const doe = async (actie: () => Promise<void>) => {
    setBezig(true);
    setFout(null);
    try {
      await actie();
      await herlaadPlekken();
      router.back();
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Opslaan lukte niet.');
      setBezig(false);
    }
  };

  const opslaan = () =>
    doe(() =>
      pasPlekAan(p.id, {
        soort,
        naam: naam.trim(),
        plaats: plaats.trim(),
        omschrijving: omschrijving.trim(),
        kenmerken: kenmerken.split(',').map((k) => k.trim()).filter(Boolean),
        regels: regels.trim(),
        status,
        lat: Number(ligging.lat.toFixed(6)),
        lng: Number(ligging.lng.toFixed(6)),
      }),
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: p.naam }} />
      <View style={s.kaart}>
        <EchteKaart punten={punten} begin={begin} richten={false} onMidden={setLigging} />
        <View style={s.speldVak} pointerEvents="none">
          <View style={[s.speld, schaduw, { backgroundColor: PLEK_SOORTEN[soort].kleur }]}>
            <MaterialCommunityIcons name={PLEK_SOORTEN[soort].icoon} size={18} color="#fff" />
          </View>
        </View>
      </View>
      <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <Text style={gedeeldeStijl.hulp}>
          Schuif de kaart tot de speld in het midden op de goede plek staat. Nu: {ligging.lat.toFixed(5)}, {ligging.lng.toFixed(5)}
        </Text>
        <View style={{ height: ruimte(4) }} />

        <Label>Soort</Label>
        <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(4) }]}>
          {SOORTEN.map((x) => (
            <Chip key={x} label={PLEK_SOORT_KORT[x]} actief={soort === x} onPress={() => setSoort(x)} />
          ))}
        </View>
        <Label>Status</Label>
        <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(4) }]}>
          {STATUSSEN.map((x) => (
            <Chip key={x.id} label={x.label} actief={status === x.id} onPress={() => setStatus(x.id)} />
          ))}
        </View>

        <Veld label="Naam" value={naam} onChangeText={setNaam} maxLength={PLEK_NAAM_MAX} />
        <Veld label="Plaats" value={plaats} onChangeText={setPlaats} />
        <Veld label="Omschrijving" value={omschrijving} onChangeText={setOmschrijving} multiline maxLength={PLEK_OMSCHRIJVING_MAX} />
        <Veld label="Kenmerken" value={kenmerken} onChangeText={setKenmerken} hulp="Gescheiden door komma's, bijvoorbeeld: Omheind, Water, Bankjes" />
        <Veld label="Regels" value={regels} onChangeText={setRegels} multiline maxLength={PLEK_REGELS_MAX} hulp="Bijvoorbeeld wanneer de hond los mag. Leeg als er niets bijzonders is." />

        {fout ? <Melding type="fout">{fout}</Melding> : null}
        <Knop titel={bezig ? 'Bezig met opslaan' : 'Opslaan'} icoon="checkmark" uitgeschakeld={bezig || naam.trim().length < 2} onPress={opslaan} />

        {!verwijderen ? (
          <Knop titel="Plek verwijderen" variant="tekst" icoon="trash" stijl={{ marginTop: ruimte(4) }} onPress={() => setVerwijderen(true)} />
        ) : (
          <View style={{ marginTop: ruimte(4), gap: ruimte(2) }}>
            <Melding type="waarschuwing">Verwijderen haalt ook alle reviews weg. Liever tijdelijk weg? Zet de status op Verborgen.</Melding>
            <Knop titel="Ja, definitief verwijderen" variant="gevaar" uitgeschakeld={bezig} onPress={() => doe(() => verwijderPlekAlsBeheerder(p.id))} />
            <Knop titel="Annuleren" variant="tekst" onPress={() => setVerwijderen(false)} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kaart: { height: 240, borderBottomWidth: 1, borderBottomColor: kleuren.rand },
  speldVak: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  speld: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
