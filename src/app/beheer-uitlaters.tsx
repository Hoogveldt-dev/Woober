import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Segment } from '../components/blokken';
import { Badge, Chip, Melding } from '../components/ui';
import { laadUitlaters, zetVerificatie, type UitlaterBeheer, type VerificatieStap } from '../lib/beheer';
import { kleuren, radius, ruimte } from '../theme';

const STAPPEN: { id: VerificatieStap; label: string }[] = [
  { id: 'identiteit', label: 'Identiteit' },
  { id: 'uitbetaling', label: 'Rekening' },
];

const veld = (u: UitlaterBeheer, stap: VerificatieStap) => u[`${stap}_ok` as const];
const klaar = (u: UitlaterBeheer) => STAPPEN.every((s) => veld(u, s.id));

/**
 * Uitlaters verifiëren. Mollie controleert identiteit en rekening bij het koppelen; zet een stap pas aan als Mollie hem
 * heeft goedgekeurd. Pas als beide in orde zijn, is de uitlater zichtbaar voor eigenaren. Geen verzekering en geen VOG.
 */
export default function BeheerUitlaters() {
  const [lijst, setLijst] = useState<UitlaterBeheer[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'alle'>('open');

  const laad = useCallback(() => {
    laadUitlaters().then(setLijst, (e: Error) => setFout(e.message));
  }, []);
  useEffect(laad, [laad]);

  const wissel = async (u: UitlaterBeheer, stap: VerificatieStap) => {
    setFout(null);
    try {
      await zetVerificatie(u.id, stap, !veld(u, stap));
      laad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Opslaan lukte niet.');
    }
  };

  const zichtbaar = (lijst ?? []).filter((u) => filter === 'alle' || !klaar(u));

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud}>
      <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(4) }]}>
        Mollie controleert de identiteit en de rekening op naam als de uitlater koppelt, in de app. Zet een stap pas aan als Mollie hem heeft goedgekeurd. Pas
        als beide in orde zijn, zien eigenaren deze uitlater. Onder de 18 is de uitlater aangemeld met toestemming van een ouder of voogd.
      </Text>
      <Segment<'open' | 'alle'>
        waarde={filter}
        onChange={setFilter}
        opties={[
          { waarde: 'open', label: 'Nog te controleren' },
          { waarde: 'alle', label: 'Alle uitlaters' },
        ]}
      />
      <View style={{ height: ruimte(4) }} />
      {fout ? <Melding type="fout">{fout}</Melding> : null}
      {lijst === null && !fout ? <ActivityIndicator /> : null}
      {lijst && zichtbaar.length === 0 ? <Text style={gedeeldeStijl.hulp}>{filter === 'open' ? 'Niemand wacht op controle.' : 'Nog geen uitlaters.'}</Text> : null}
      {zichtbaar.map((u) => (
        <View key={u.id} style={s.kaart}>
          <View style={s.rij}>
            <Text style={s.naam}>{u.voornaam}</Text>
            {klaar(u) ? <Badge tekst="ZICHTBAAR" icoon="checkmark" /> : <Badge tekst="WACHT" kleur={kleuren.waarschuwing} />}
            {u.minderjarig ? <Badge tekst="ONDER DE 18" kleur={kleuren.gedempt} /> : null}
          </View>
          <Text style={s.sub}>
            {[u.wijk, u.plaats].filter(Boolean).join(', ')} · {u.diensten.join(' en ')} · aangemeld {new Date(u.aangemaakt).toLocaleDateString('nl-NL')}
          </Text>
          <Text style={s.link} onPress={() => Linking.openURL(`mailto:${u.email}?subject=${encodeURIComponent('Je profiel bij Woober')}`)}>
            {u.email}
          </Text>
          <View style={s.stappen}>
            {STAPPEN.map((stap) => (
              <Chip
                key={stap.id}
                label={stap.label}
                icoon={veld(u, stap.id) ? 'checkmark' : undefined}
                actief={veld(u, stap.id)}
                onPress={() => wissel(u, stap.id)}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kaart: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4), marginBottom: ruimte(3), gap: 4 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  naam: { fontSize: 16, fontWeight: '800', color: kleuren.tekst },
  sub: { fontSize: 13, color: kleuren.gedempt },
  link: { fontSize: 14, color: kleuren.primair, fontWeight: '700' },
  stappen: { flexDirection: 'row', flexWrap: 'wrap', gap: ruimte(2), marginTop: ruimte(2) },
});
