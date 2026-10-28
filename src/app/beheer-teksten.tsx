import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Sectie } from '../components/blokken';
import { Badge, Knop, Melding, Veld } from '../components/ui';
import { bewaarTekst, TEKSTEN, zetTekstTerug, type TekstDefinitie, type TekstSleutel } from '../lib/teksten';
import { useTeksten } from '../state/Teksten';
import { kleuren, radius, ruimte } from '../theme';

const SLEUTELS = Object.keys(TEKSTEN) as TekstSleutel[];
const GROEPEN = [...new Set(SLEUTELS.map((k) => TEKSTEN[k].groep))];

/** Beheerders passen hier teksten in de app aan; de wijziging geldt meteen voor iedereen die de app opent */
export default function BeheerTeksten() {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(5) }]}>
          Wat je hier opslaat, ziet iedereen de volgende keer dat de app opent, ook op woober.nl. Met Standaard zet je de oorspronkelijke tekst terug.
        </Text>
        {GROEPEN.map((groep) => (
          <View key={groep}>
            <Sectie>{groep}</Sectie>
            {SLEUTELS.filter((k) => TEKSTEN[k].groep === groep).map((k) => (
              <TekstVeld key={k} sleutel={k} definitie={TEKSTEN[k]} />
            ))}
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TekstVeld({ sleutel, definitie }: { sleutel: TekstSleutel; definitie: TekstDefinitie }) {
  const { aanpassingen, herlaad } = useTeksten();
  const aangepast = aanpassingen[sleutel] !== undefined;
  const huidig = aanpassingen[sleutel] ?? definitie.standaard;
  const [waarde, setWaarde] = useState(huidig);
  const [bezig, setBezig] = useState(false);
  const [uitslag, setUitslag] = useState<{ goed: boolean; tekst: string } | null>(null);
  const gewijzigd = waarde !== huidig;

  const doe = async (actie: () => Promise<void>, gelukt: string, nieuw?: string) => {
    setBezig(true);
    setUitslag(null);
    try {
      await actie();
      await herlaad();
      if (nieuw !== undefined) setWaarde(nieuw);
      setUitslag({ goed: true, tekst: gelukt });
    } catch (e) {
      setUitslag({ goed: false, tekst: e instanceof Error ? e.message : 'Er ging iets mis.' });
    } finally {
      setBezig(false);
    }
  };

  return (
    <View style={s.kaart}>
      <View style={s.kop}>
        <Text style={s.label}>{definitie.label}</Text>
        {aangepast ? <Badge tekst="AANGEPAST" kleur={kleuren.primair} /> : null}
      </View>
      <Veld
        label=""
        accessibilityLabel={definitie.label}
        value={waarde}
        onChangeText={(t) => {
          setWaarde(t);
          setUitslag(null);
        }}
        multiline={definitie.lang}
        hulp={definitie.hulp}
      />
      {aangepast && definitie.standaard ? <Text style={s.standaard}>Standaard: {definitie.standaard}</Text> : null}
      <View style={s.knoppen}>
        <Knop
          titel="Opslaan"
          uitgeschakeld={!gewijzigd || bezig}
          onPress={() => doe(() => bewaarTekst(sleutel, waarde.trim()), 'Opgeslagen. Iedereen ziet nu deze tekst.')}
          stijl={{ flex: 1, height: 44 }}
        />
        {aangepast ? (
          <Knop
            titel="Standaard"
            variant="secundair"
            uitgeschakeld={bezig}
            onPress={() => doe(() => zetTekstTerug(sleutel), 'De standaardtekst staat weer terug.', definitie.standaard)}
            stijl={{ flex: 1, height: 44 }}
          />
        ) : null}
      </View>
      {uitslag ? (
        <View style={{ marginTop: ruimte(2) }}>
          <Melding type={uitslag.goed ? 'goed' : 'fout'}>{uitslag.tekst}</Melding>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4), marginBottom: ruimte(3) },
  kop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ruimte(2), marginBottom: ruimte(2) },
  label: { flex: 1, fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  standaard: { fontSize: 12, color: kleuren.gedempt, lineHeight: 17, marginTop: -ruimte(2), marginBottom: ruimte(3) },
  knoppen: { flexDirection: 'row', gap: ruimte(2) },
});
