import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { berekenPrijs, DUREN, euro } from '../lib/prijs';
import { procent } from '../lib/verdienmodel';
import { useApp } from '../state/AppContext';
import { DAGDELEN, DAGEN_KORT } from '../lib/tijd';
import { kleuren, radius, ruimte } from '../theme';
import type { Beschikbaarheid, Dag, Dagdeel, Dienst, Uitlater, Vervoer, WandelDuur } from '../types';
import { gedeeldeStijl } from './blokken';
import { Chip, Knop, Label, Melding, Veld } from './ui';

const WERKGEBIEDEN = [1, 2, 3, 5, 8];
const MAX_HONDEN_WETTELIJK = 8;

function naarCenten(invoer: string): number | null {
  const n = Number(invoer.replace(',', '.'));
  if (!Number.isFinite(n) || n < 5 || n > 100) return null;
  return Math.round(n * 100);
}

const naarInvoer = (centen: number) => (centen / 100).toFixed(2).replace('.', ',').replace(',00', '');

export function UitlaterFormulier({ begin, knopTitel, onBewaar }: { begin: Uitlater; knopTitel: string; onBewaar: (u: Uitlater) => void }) {
  const { verdienmodel } = useApp();
  const [bio, setBio] = useState(begin.bio);
  const [ervaring, setErvaring] = useState(begin.ervaring);
  const [professioneel, setProfessioneel] = useState(begin.professioneel);
  const [bedrijfsnaam, setBedrijfsnaam] = useState(begin.bedrijfsnaam ?? '');
  const [vervoer, setVervoer] = useState<Vervoer>(begin.vervoer);
  const [tarieven, setTarieven] = useState<Record<WandelDuur, string>>({
    30: naarInvoer(begin.tarieven[30]),
    45: naarInvoer(begin.tarieven[45]),
    60: naarInvoer(begin.tarieven[60]),
  });
  const [diensten, setDiensten] = useState<Dienst[]>(begin.diensten);
  const [oppasTarief, setOppasTarief] = useState(naarInvoer(begin.oppasPerUur || 1100));
  const [toeslag, setToeslag] = useState(naarInvoer(begin.toeslagExtraHond));
  const [maxHonden, setMaxHonden] = useState(begin.maxHonden);
  const [werkgebied, setWerkgebied] = useState(begin.werkgebiedKm);
  const [rooster, setRooster] = useState<Beschikbaarheid>(begin.beschikbaarheid);
  const [geprobeerd, setGeprobeerd] = useState(false);

  const centen = { 30: naarCenten(tarieven[30]), 45: naarCenten(tarieven[45]), 60: naarCenten(tarieven[60]) };
  const oppasCenten = naarCenten(oppasTarief);
  const uitlaten = diensten.includes('uitlaten');
  const oppas = diensten.includes('oppas');
  const toeslagCenten = Number(toeslag.replace(',', '.')) >= 0 ? Math.round(Number(toeslag.replace(',', '.')) * 100) : null;
  const fouten = {
    bio: bio.trim().length < 20 ? 'Vertel in minstens 20 tekens iets over jezelf.' : null,
    diensten: diensten.length > 0 ? null : 'Kies minstens één dienst.',
    tarief: !uitlaten || DUREN.every((d) => centen[d] !== null) ? null : 'Vul per duur een tarief in tussen €5 en €100.',
    oppas: !oppas || oppasCenten !== null ? null : 'Vul een uurtarief in tussen €5 en €100.',
    toeslag: toeslagCenten !== null && Number.isFinite(toeslagCenten) ? null : 'Vul een bedrag in, of 0.',
    bedrijf: professioneel && bedrijfsnaam.trim().length < 2 ? 'Vul de naam van je bedrijf in.' : null,
    rooster: Object.values(rooster).some((d) => d.length > 0) ? null : 'Kies minstens één dagdeel.',
  };
  const geldig = Object.values(fouten).every((f) => f === null);
  const toon = (f: string | null) => (geprobeerd ? f : null);

  const voorbeeld =
    centen[30] !== null && toeslagCenten !== null
      ? berekenPrijs({ tarieven: { 30: centen[30], 45: 0, 60: 0 }, oppasPerUur: 0, toeslagExtraHond: toeslagCenten }, 'uitlaten', 30, 1, verdienmodel)
      : null;
  const oppasVoorbeeld =
    oppasCenten !== null && toeslagCenten !== null
      ? berekenPrijs({ tarieven: { 30: 0, 45: 0, 60: 0 }, oppasPerUur: oppasCenten, toeslagExtraHond: toeslagCenten }, 'oppas', 180, 1, verdienmodel)
      : null;
  const wisselDienst = (d: Dienst) => setDiensten((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));

  const wissel = (dag: Dag, deel: Dagdeel) =>
    setRooster((r) => ({ ...r, [dag]: r[dag].includes(deel) ? r[dag].filter((x) => x !== deel) : [...r[dag], deel] }));

  const bewaar = () => {
    setGeprobeerd(true);
    if (!geldig || toeslagCenten === null) return;
    onBewaar({
      ...begin,
      diensten,
      oppasPerUur: oppas && oppasCenten !== null ? oppasCenten : 0,
      bio: bio.trim(),
      ervaring: ervaring.trim(),
      professioneel,
      bedrijfsnaam: professioneel ? bedrijfsnaam.trim() : undefined,
      vervoer,
      // Tarieven voor uitlaten blijven bewaard, ook als de dienst even uit staat
      tarieven: { 30: centen[30] ?? begin.tarieven[30], 45: centen[45] ?? begin.tarieven[45], 60: centen[60] ?? begin.tarieven[60] },
      toeslagExtraHond: toeslagCenten,
      maxHonden,
      werkgebiedKm: werkgebied,
      beschikbaarheid: rooster,
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <Melding type="info">Jij bepaalt je tarief, je werkgebied en wanneer je werkt. Woober wijst niets toe; eigenaren kiezen jou en jij beslist of je ja zegt.</Melding>

        <View style={{ height: ruimte(3) }} />
        <Label>Wat bied je aan?</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Uitlaten" icoon="walk" actief={uitlaten} onPress={() => wisselDienst('uitlaten')} />
          <Chip label="Oppas aan huis" icoon="home" actief={oppas} onPress={() => wisselDienst('oppas')} />
        </View>
        {toon(fouten.diensten) ? <Text style={s.fout}>{fouten.diensten}</Text> : null}
        {oppas ? (
          <Text style={[gedeeldeStijl.hulp, { marginTop: ruimte(2) }]}>
            Bij oppas ben je een paar uur bij de eigenaar thuis, vaak &apos;s avonds. Je laat de hond tussendoor even uit.
          </Text>
        ) : null}

        <View style={{ height: ruimte(3) }} />
        <Veld label="Over jou" value={bio} onChangeText={setBio} multiline maxLength={400} placeholder="Wie ben je en waarom laat je graag honden uit?" fout={toon(fouten.bio)} />
        <Veld label="Ervaring met honden" value={ervaring} onChangeText={setErvaring} multiline maxLength={300} placeholder="Eigen honden, cursussen, vrijwilligerswerk" />

        <Label>Ik werk als</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Particulier" icoon="person" actief={!professioneel} onPress={() => setProfessioneel(false)} />
          <Chip label="Bedrijf met KvK" icoon="briefcase" actief={professioneel} onPress={() => setProfessioneel(true)} />
        </View>
        {professioneel ? (
          <View style={{ marginTop: ruimte(3) }}>
            <Veld label="Bedrijfsnaam" value={bedrijfsnaam} onChangeText={setBedrijfsnaam} fout={toon(fouten.bedrijf)} hulp="Het KvK-nummer vraag je bij het koppelen van je uitbetaalrekening." />
          </View>
        ) : null}

        <View style={{ height: ruimte(4) }} />
        <Label>Vervoer naar de eigenaar</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Lopend" icoon="walk" actief={vervoer === 'lopend'} onPress={() => setVervoer('lopend')} />
          <Chip label="Fiets" icoon="bicycle" actief={vervoer === 'fiets'} onPress={() => setVervoer('fiets')} />
          <Chip label="Auto of bus" icoon="car" actief={vervoer === 'auto'} onPress={() => setVervoer('auto')} />
        </View>

        {uitlaten ? (
          <>
            <View style={{ height: ruimte(5) }} />
            <Label>Jouw tarief per wandeling</Label>
            <View style={s.tarieven}>
              {DUREN.map((d) => (
                <View key={d} style={s.tarief}>
                  <Text style={s.tariefDuur}>{d} min</Text>
                  <View style={s.tariefInvoer}>
                    <Text style={s.euroTeken}>€</Text>
                    <TextInput
                      value={tarieven[d]}
                      onChangeText={(t) => setTarieven((x) => ({ ...x, [d]: t }))}
                      keyboardType="decimal-pad"
                      style={s.tariefVeld}
                      accessibilityLabel={`Tarief ${d} minuten`}
                    />
                  </View>
                </View>
              ))}
            </View>
            {toon(fouten.tarief) ? <Text style={s.fout}>{fouten.tarief}</Text> : null}
          </>
        ) : null}

        {oppas ? (
          <>
            <View style={{ height: ruimte(5) }} />
            <Label>Jouw uurtarief voor oppas</Label>
            <View style={[s.tarief, { flex: 0, width: 140 }]}>
              <Text style={s.tariefDuur}>per uur</Text>
              <View style={s.tariefInvoer}>
                <Text style={s.euroTeken}>€</Text>
                <TextInput value={oppasTarief} onChangeText={setOppasTarief} keyboardType="decimal-pad" style={s.tariefVeld} accessibilityLabel="Uurtarief oppas" />
              </View>
            </View>
            {toon(fouten.oppas) ? <Text style={s.fout}>{fouten.oppas}</Text> : null}
            {oppasVoorbeeld ? (
              <Text style={[gedeeldeStijl.hulp, { marginTop: ruimte(2) }]}>
                Een avond van 3 uur: de eigenaar betaalt {euro(oppasVoorbeeld.totaal)}, jij ontvangt {euro(oppasVoorbeeld.uitbetaling)}.
              </Text>
            ) : null}
          </>
        ) : null}
        <View style={{ height: ruimte(3) }} />
        <Veld label="Toeslag per extra hond" value={toeslag} onChangeText={setToeslag} keyboardType="decimal-pad" hulp="Voor een tweede hond uit hetzelfde huishouden." fout={toon(fouten.toeslag)} />
        {voorbeeld && uitlaten ? (
          <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(2), marginBottom: ruimte(4) }]}>
            Bij 30 minuten betaalt de eigenaar {euro(voorbeeld.totaal)} en ontvang jij {euro(voorbeeld.uitbetaling)}.
            {verdienmodel.commissiePercentage === 0
              ? ` Tijdens de ${verdienmodel.naam.toLowerCase()} houdt Woober niets in.`
              : ` Woober houdt ${procent(verdienmodel.commissiePercentage)} commissie in.`}
          </Text>
        ) : null}

        <Label>Maximaal aantal honden tegelijk</Label>
        <View style={s.teller}>
          <Pressable onPress={() => setMaxHonden((n) => Math.max(1, n - 1))} accessibilityLabel="Minder" style={s.tellerKnop}>
            <Ionicons name="remove" size={20} color={kleuren.tekst} />
          </Pressable>
          <Text style={s.tellerWaarde}>{maxHonden}</Text>
          <Pressable onPress={() => setMaxHonden((n) => Math.min(MAX_HONDEN_WETTELIJK, n + 1))} accessibilityLabel="Meer" style={s.tellerKnop}>
            <Ionicons name="add" size={20} color={kleuren.tekst} />
          </Pressable>
        </View>
        {maxHonden > 3 ? (
          <Melding type="waarschuwing">Sommige gemeenten vragen een vergunning bij meer dan 3 honden. Woober staat nooit meer dan 8 honden per uitlater toe.</Melding>
        ) : null}

        <View style={{ height: ruimte(3) }} />
        <Label>Werkgebied vanaf huis</Label>
        <View style={gedeeldeStijl.rij}>
          {WERKGEBIEDEN.map((km) => (
            <Chip key={km} label={`${km} km`} actief={werkgebied === km} onPress={() => setWerkgebied(km)} />
          ))}
        </View>

        <View style={{ height: ruimte(5) }} />
        <Label>Wanneer ben je beschikbaar?</Label>
        <View style={s.rooster}>
          <View style={s.roosterRij}>
            <View style={s.roosterDag} />
            {DAGDELEN.map((d) => (
              <Text key={d} style={s.roosterKop}>
                {d}
              </Text>
            ))}
          </View>
          {DAGEN_KORT.map((naam, i) => {
            const dag = i as Dag;
            return (
              <View key={naam} style={s.roosterRij}>
                <Text style={s.roosterDag}>{naam}</Text>
                {DAGDELEN.map((deel) => {
                  const aan = rooster[dag].includes(deel);
                  return (
                    <Pressable
                      key={deel}
                      onPress={() => wissel(dag, deel)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: aan }}
                      accessibilityLabel={`${naam} ${deel}`}
                      style={[s.vak, aan && s.vakAan]}
                    >
                      {aan ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
        {toon(fouten.rooster) ? <Text style={s.fout}>{fouten.rooster}</Text> : null}
        <Text style={gedeeldeStijl.hulp}>Daarnaast ga je zelf online wanneer je zin hebt in een wandeling op korte termijn.</Text>

        <Knop titel={knopTitel} onPress={bewaar} stijl={{ marginTop: ruimte(6) }} />
        {geprobeerd && !geldig ? <Text style={[s.fout, { textAlign: 'center' }]}>Controleer de rode velden.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  tarieven: { flexDirection: 'row', gap: ruimte(2) },
  tarief: { flex: 1, borderWidth: 1.5, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(3) },
  tariefDuur: { fontSize: 13, fontWeight: '700', color: kleuren.gedempt },
  tariefInvoer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  euroTeken: { fontSize: 20, fontWeight: '800', color: kleuren.tekst, marginRight: 2 },
  tariefVeld: { flex: 1, fontSize: 20, fontWeight: '800', color: kleuren.tekst, padding: 0, minWidth: 40 },
  fout: { fontSize: 12, color: kleuren.nope, marginTop: 4, fontWeight: '600' },
  teller: { flexDirection: 'row', alignItems: 'center', gap: ruimte(4), marginBottom: ruimte(3) },
  tellerKnop: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: kleuren.rand, alignItems: 'center', justifyContent: 'center' },
  tellerWaarde: { fontSize: 20, fontWeight: '800', color: kleuren.tekst, minWidth: 24, textAlign: 'center' },
  rooster: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(3), marginBottom: ruimte(2), gap: 6 },
  roosterRij: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roosterDag: { width: 32, fontSize: 14, fontWeight: '700', color: kleuren.tekst },
  roosterKop: { flex: 1, fontSize: 12, fontWeight: '700', color: kleuren.gedempt, textAlign: 'center' },
  vak: { flex: 1, height: 32, borderRadius: 8, backgroundColor: kleuren.vlak, alignItems: 'center', justifyContent: 'center' },
  vakAan: { backgroundColor: kleuren.primair },
});
