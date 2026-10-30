import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { TekstVeld } from '../components/Bewerkbaar';
import { gedeeldeStijl, Sectie } from '../components/blokken';
import { TEKSTEN, type TekstSleutel } from '../lib/teksten';
import { ruimte } from '../theme';

const SLEUTELS = Object.keys(TEKSTEN) as TekstSleutel[];
const GROEPEN = [...new Set(SLEUTELS.map((k) => TEKSTEN[k].groep))];

/**
 * Alle aanpasbare teksten onder elkaar. Meestal is de bewerkmodus handiger (Beheer, Bewerkmodus); deze lijst is
 * er voor teksten die je in de app moeilijk tegenkomt.
 */
export default function BeheerTeksten() {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(5) }]}>
          Wat je hier opslaat, ziet iedereen de volgende keer dat de app opent, ook op woober.nl. Met Standaard zet je de oorspronkelijke tekst terug. Makkelijker: zet onder Beheer de bewerkmodus aan en tik in de app op een hamer.
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
