import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { kleuren, radius, ruimte } from '../theme';
import { OnderBlad } from './blokken';
import { Knop, Melding } from './ui';

const SOORTEN = ['Hond is weggelopen', 'Hond is gewond of ziek', 'Bijtincident', 'Ik bereik de ander niet', 'Iets anders'];

/** Noodknop tijdens een wandeling. In de echte app belt een medewerker van Woober direct terug. */
export function IncidentBlad({
  zichtbaar,
  onSluit,
  onMeld,
  dierenarts,
  ander,
}: {
  zichtbaar: boolean;
  onSluit: () => void;
  onMeld: (soort: string) => void;
  dierenarts: string;
  ander: string;
}) {
  const [gemeld, setGemeld] = useState<string | null>(null);
  const sluit = () => {
    setGemeld(null);
    onSluit();
  };

  return (
    <OnderBlad zichtbaar={zichtbaar} sluit={sluit}>
      {!gemeld ? (
        <>
          <View style={s.kop}>
            <Ionicons name="alert-circle" size={26} color={kleuren.nope} />
            <Text style={s.titel}>Incident melden</Text>
          </View>
          <Text style={s.tekst}>Bij direct gevaar voor mensen: bel 112.</Text>
          {SOORTEN.map((soort) => (
            <Pressable
              key={soort}
              style={s.optie}
              onPress={() => {
                onMeld(soort);
                setGemeld(soort);
              }}
            >
              <Text style={s.optieTekst}>{soort}</Text>
              <Ionicons name="chevron-forward" size={18} color={kleuren.gedempt} />
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={s.titel}>Melding ontvangen</Text>
          <Melding type="goed">Een medewerker van Woober belt je binnen 5 minuten. {ander} krijgt ook bericht.</Melding>
          <View style={s.kaartje}>
            <Ionicons name="medkit" size={20} color={kleuren.nope} />
            <View style={{ flex: 1 }}>
              <Text style={s.kaartjeTitel}>Dierenarts</Text>
              <Text style={s.kaartjeTekst}>{dierenarts || 'Niet ingevuld'}</Text>
            </View>
          </View>
          <View style={s.kaartje}>
            <Ionicons name="call" size={20} color={kleuren.tekst} />
            <View style={{ flex: 1 }}>
              <Text style={s.kaartjeTitel}>Noodnummers</Text>
              <Text style={s.kaartjeTekst}>112 bij gevaar voor mensen, 144 voor dieren in nood</Text>
            </View>
          </View>
          {gemeld === 'Hond is weggelopen' ? (
            <Melding type="info">Meld de hond ook als vermist bij de databank van de chip, zodat een vinder hem kan terugbrengen.</Melding>
          ) : null}
          <Knop titel="Sluiten" variant="secundair" onPress={sluit} stijl={{ marginTop: ruimte(3) }} />
        </>
      )}
    </OnderBlad>
  );
}

const s = StyleSheet.create({
  kop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  titel: { fontSize: 20, fontWeight: '800', color: kleuren.tekst, marginBottom: ruimte(2) },
  tekst: { fontSize: 14, color: kleuren.gedempt, marginBottom: ruimte(2) },
  optie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: kleuren.rand },
  optieTekst: { fontSize: 16, color: kleuren.tekst, flex: 1 },
  kaartje: { flexDirection: 'row', gap: ruimte(3), alignItems: 'center', padding: ruimte(3), borderRadius: radius.midden, backgroundColor: kleuren.vlak, marginBottom: ruimte(2) },
  kaartjeTitel: { fontSize: 14, fontWeight: '800', color: kleuren.tekst },
  kaartjeTekst: { fontSize: 14, color: kleuren.gedempt, marginTop: 1 },
});
