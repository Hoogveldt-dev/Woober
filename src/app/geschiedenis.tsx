import { ScrollView, StyleSheet, Text } from 'react-native';
import { EigenaarBoeking, eigenaarBoekingen } from '../components/BoekingRij';
import { gedeeldeStijl, Leeg } from '../components/blokken';
import { euro } from '../lib/prijs';
import { useApp } from '../state/AppContext';
import { kleuren, ruimte } from '../theme';

/** Accountgeschiedenis van de eigenaar: afgeronde, geannuleerde en geweigerde boekingen. Te openen onder Account. */
export default function Geschiedenis() {
  const { boekingen } = useApp();
  const { eerder } = eigenaarBoekingen(boekingen);
  const totaalUitgegeven = eerder.filter((b) => b.status === 'afgerond').reduce((t, b) => t + b.prijs.totaal + b.fooi, 0);

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud}>
      {eerder.length === 0 ? (
        <Leeg icoon="history" titel="Nog geen geschiedenis" tekst="Afgeronde en geannuleerde wandelingen en oppas komen hier te staan, met je rapporten." />
      ) : (
        <>
          {eerder.map((b) => (
            <EigenaarBoeking key={b.id} b={b} />
          ))}
          <Text style={s.totaal}>Totaal uitgegeven aan uitlaten en oppas: {euro(totaalUitgegeven)}</Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  totaal: { fontSize: 13, color: kleuren.gedempt, textAlign: 'center', marginTop: ruimte(4) },
});
