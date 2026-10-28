import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Segment } from '../components/blokken';
import { Badge, Chip, Melding } from '../components/ui';
import { laadUitlaters, zetVerificatie, type UitlaterBeheer, type VerificatieStap } from '../lib/beheer';
import { kleuren, radius, ruimte } from '../theme';

const STAPPEN: { id: VerificatieStap; label: string; verplicht: boolean }[] = [
  { id: 'identiteit', label: 'Identiteit', verplicht: true },
  { id: 'verzekering', label: 'Verzekering', verplicht: true },
  { id: 'uitbetaling', label: 'Rekening', verplicht: true },
  { id: 'vog', label: 'VOG', verplicht: false },
];

const veld = (u: UitlaterBeheer, stap: VerificatieStap) => u[`${stap}_ok` as const];
const klaar = (u: UitlaterBeheer) => STAPPEN.every((s) => !s.verplicht || veld(u, s.id));

/**
 * Uitlaters verifiëren. Controleer eerst zelf (identiteitsbewijs, polis, rekening op naam) en zet dan de stap aan.
 * Pas als identiteit, verzekering en rekening in orde zijn, is de uitlater zichtbaar voor eigenaren.
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
        Controleer zelf het identiteitsbewijs, de aansprakelijkheidsverzekering (ook voor schade in huis bij oppas) en de rekening op naam. Mail de uitlater voor de
        stukken. Pas als de eerste drie in orde zijn, zien eigenaren deze uitlater.
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
                label={stap.verplicht ? stap.label : `${stap.label} (optioneel)`}
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
