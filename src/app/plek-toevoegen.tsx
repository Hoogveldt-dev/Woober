import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gedeeldeStijl } from '../components/blokken';
import { Kaart, type KaartMarker } from '../components/Kaart';
import { Chip, Knop, Label, Melding, Veld } from '../components/ui';
import {
  DUBBEL_BINNEN,
  PLEK_KENMERKEN,
  PLEK_NAAM_MAX,
  PLEK_OMSCHRIJVING_MAX,
  PLEK_REGELS_MAX,
  PLEK_SOORT_KORT,
  PLEK_SOORTEN,
} from '../lib/plekken';
import { afstand, formatAfstand } from '../lib/route';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte, schaduw } from '../theme';
import type { PlekSoort, Punt } from '../types';

const SOORTEN: PlekSoort[] = ['horeca', 'losloop', 'strand', 'overig'];

export default function PlekToevoegen() {
  const router = useRouter();
  const { gebruiker, plekken, voegPlekToe } = useApp();
  const thuis = useMemo(() => gebruiker?.thuis ?? { x: 500, y: 600 }, [gebruiker?.thuis]);
  const [soort, setSoort] = useState<PlekSoort>('horeca');
  const [punt, setPunt] = useState<Punt>(thuis);
  const [naam, setNaam] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [kenmerken, setKenmerken] = useState<string[]>([]);
  const [regels, setRegels] = useState('');
  // Vaste focus, zodat de kaart niet terugspringt terwijl je schuift
  const focus = useMemo(() => [thuis], [thuis]);

  const markers: KaartMarker[] = [
    { id: 'thuis', soort: 'thuis', punt: thuis },
    ...plekken.map((p): KaartMarker => ({ id: p.id, soort: 'plek', punt: p.punt, naam: p.naam, plekSoort: p.soort })),
  ];
  const dichtbij = plekken
    .map((p) => ({ p, meter: afstand(p.punt, punt) }))
    .filter((x) => x.p.soort === soort && x.meter < DUBBEL_BINNEN)
    .sort((a, b) => a.meter - b.meter)[0];
  const naamOk = naam.trim().length >= 2;

  const kies = (s: PlekSoort) => {
    setSoort(s);
    // Kenmerken die bij de nieuwe soort niet bestaan vallen weg
    setKenmerken((ks) => ks.filter((k) => PLEK_KENMERKEN[s].includes(k)));
  };
  const wissel = (k: string) => setKenmerken((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  const opslaan = () => {
    const id = voegPlekToe({ soort, naam, punt, omschrijving, kenmerken, regels });
    router.replace({ pathname: '/plek/[id]', params: { id } });
  };

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['bottom']}>
      <View style={s.kaart}>
        <Kaart markers={markers} focus={focus} maxZoom={0.8} onMidden={setPunt} />
        {/* De speld staat vast in het midden; je schuift de kaart eronder */}
        <View style={s.speldVak} pointerEvents="none">
          <View style={[s.speld, schaduw, { backgroundColor: PLEK_SOORTEN[soort].kleur }]}>
            <MaterialCommunityIcons name={PLEK_SOORTEN[soort].icoon} size={20} color="#fff" />
          </View>
          <View style={[s.speldPunt, { backgroundColor: PLEK_SOORTEN[soort].kleur }]} />
        </View>
        <View style={[s.hint, schaduw]} pointerEvents="none">
          <Ionicons name="move" size={14} color={kleuren.tekst} />
          <Text style={s.hintTekst}>Schuif de kaart tot de speld op de plek staat</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
          <Label>Wat voor plek?</Label>
          <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(4) }]}>
            {SOORTEN.map((id) => (
              <Chip key={id} label={PLEK_SOORT_KORT[id]} actief={soort === id} onPress={() => kies(id)} />
            ))}
          </View>

          {dichtbij ? (
            <Melding type="info">
              {`${dichtbij.p.naam} staat al op ${formatAfstand(dichtbij.meter)} van de speld. Is dat dezelfde plek? Schrijf dan liever een review.`}
            </Melding>
          ) : null}

          <Veld
            label="Naam"
            value={naam}
            onChangeText={setNaam}
            maxLength={PLEK_NAAM_MAX}
            placeholder={soort === 'horeca' ? 'Bijvoorbeeld Café De Hoek' : soort === 'losloop' ? 'Bijvoorbeeld Hondenweide Noord' : 'Naam van de plek'}
          />
          <Veld
            label="Omschrijving (optioneel)"
            value={omschrijving}
            onChangeText={setOmschrijving}
            multiline
            maxLength={PLEK_OMSCHRIJVING_MAX}
            placeholder="Wat moeten andere baasjes weten?"
          />

          <Label>Wat is er?</Label>
          <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(4) }]}>
            {PLEK_KENMERKEN[soort].map((k) => (
              <Chip key={k} label={k} icoon={kenmerken.includes(k) ? 'checkmark' : undefined} actief={kenmerken.includes(k)} onPress={() => wissel(k)} />
            ))}
          </View>

          {soort !== 'horeca' ? (
            <Veld
              label="Regels (optioneel)"
              value={regels}
              onChangeText={setRegels}
              maxLength={PLEK_REGELS_MAX}
              placeholder="Bijvoorbeeld: van mei tot oktober geen honden"
            />
          ) : null}

          <Melding type="info">
            Je plek is meteen te zien voor andere gebruikers, met het label Net toegevoegd en je voornaam. Een medewerker kijkt er daarna naar. Voeg geen woonadres toe.
          </Melding>
          <Knop titel="Plek toevoegen" icoon="add-circle" uitgeschakeld={!naamOk} onPress={opslaan} stijl={{ marginTop: ruimte(2) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  kaart: { height: 260, borderBottomWidth: 1, borderBottomColor: kleuren.rand },
  speldVak: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  // Het puntje onderaan de speld valt precies op het midden van de kaart
  speld: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 6 + 40 },
  speldPunt: { position: 'absolute', width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: '#fff' },
  hint: {
    position: 'absolute',
    top: ruimte(3),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: radius.rond,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hintTekst: { fontSize: 12, fontWeight: '700', color: kleuren.tekst },
});
