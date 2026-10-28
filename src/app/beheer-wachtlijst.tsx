import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Blok, gedeeldeStijl, Rij, Sectie } from '../components/blokken';
import { Melding } from '../components/ui';
import { laadWachtlijst, type WachtlijstRij } from '../lib/beheer';
import { kleuren, radius, ruimte } from '../theme';

/** Wie het wil weten zodra Woober in de buurt start, per postcodegebied. Mail hen alleen daarover. */
export default function BeheerWachtlijst() {
  const [lijst, setLijst] = useState<WachtlijstRij[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  useEffect(() => {
    laadWachtlijst().then(setLijst, (e: Error) => setFout(e.message));
  }, []);

  // Postcodegebied: de vier cijfers
  const perGebied = new Map<string, { eigenaar: number; uitlater: number }>();
  for (const r of lijst ?? []) {
    const gebied = r.postcode ? `${r.postcode.slice(0, 4)} ${r.plaats}` : r.plaats || 'Onbekend';
    const tel = perGebied.get(gebied) ?? { eigenaar: 0, uitlater: 0 };
    tel[r.rol] += 1;
    perGebied.set(gebied, tel);
  }
  const gebieden = [...perGebied.entries()].sort((a, b) => b[1].eigenaar + b[1].uitlater - (a[1].eigenaar + a[1].uitlater));

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud}>
      <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(4) }]}>
        Deze mensen willen het weten zodra Woober in hun buurt start. Mail hen alleen daarover; bij een account verwijderen verdwijnen ze vanzelf van de lijst.
      </Text>
      {fout ? <Melding type="fout">{fout}</Melding> : null}
      {lijst === null && !fout ? <ActivityIndicator /> : null}
      {lijst ? (
        <>
          <Sectie>{`Per postcodegebied (${lijst.length})`}</Sectie>
          <Blok>
            {gebieden.length === 0 ? <Rij label="Nog niemand" waarde="" /> : null}
            {gebieden.map(([gebied, tel]) => (
              <Rij key={gebied} label={gebied} waarde={`${tel.eigenaar} eigenaren, ${tel.uitlater} uitlaters`} />
            ))}
          </Blok>
          <Sectie>Iedereen</Sectie>
          {lijst.map((r) => (
            <View key={`${r.email}-${r.rol}`} style={s.rij}>
              <Text style={s.naam}>
                {r.voornaam} <Text style={s.rol}>({r.rol})</Text>
              </Text>
              <Text style={s.sub} selectable>
                {r.email} · {r.postcode ?? r.plaats}
              </Text>
            </View>
          ))}
          {lijst.length > 0 ? (
            <>
              <Sectie>Alle e-mailadressen</Sectie>
              <Text style={s.adressen} selectable>
                {lijst.map((r) => r.email).join(', ')}
              </Text>
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  rij: { paddingVertical: ruimte(2), borderBottomWidth: 1, borderBottomColor: kleuren.vlak },
  naam: { fontSize: 15, fontWeight: '700', color: kleuren.tekst },
  rol: { fontWeight: '400', color: kleuren.gedempt },
  sub: { fontSize: 13, color: kleuren.gedempt },
  adressen: { fontSize: 13, color: kleuren.tekst, backgroundColor: kleuren.vlak, borderRadius: radius.klein, padding: ruimte(3), lineHeight: 19 },
});
