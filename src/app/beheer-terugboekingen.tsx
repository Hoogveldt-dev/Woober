import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Sectie } from '../components/blokken';
import { Knop, Melding, Veld } from '../components/ui';
import { handelTerugboekingAf, laadTerugboekingen, type Terugboeking } from '../lib/beheer';
import { euro, METHODE_NAAM } from '../lib/prijs';
import { dagTekst } from '../lib/tijd';
import { kleuren, radius, ruimte } from '../theme';

/**
 * Terugboekingen via de bank (chargebacks, bij creditcard en Apple Pay). Woober draagt het verlies; de uitlater houdt
 * het verdiende geld. Een medewerker neemt contact op met de eigenaar en legt het besluit vast. Blokkeren of schorsen
 * beslist altijd een mens; de app doet dat nooit vanzelf.
 */
export default function BeheerTerugboekingen() {
  const [lijst, setLijst] = useState<Terugboeking[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [nu] = useState(() => Date.now());
  const laad = () => laadTerugboekingen().then(setLijst, (e: Error) => setFout(e.message));
  useEffect(() => {
    laad();
  }, []);

  const open = (lijst ?? []).filter((t) => !t.besluit);
  const afgehandeld = (lijst ?? []).filter((t) => t.besluit);

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
      <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(4) }]}>
        Laat een eigenaar een betaling via de bank terugdraaien, dan draagt Woober het verlies. De uitlater houdt het verdiende geld: haalt Mollie geld bij de uitlater
        terug, dan vult Woober dat vanzelf aan. Neem contact op met de eigenaar en leg vast wat je besluit. Soms is het een vergissing of een gestolen kaart.
      </Text>
      {fout ? <Melding type="fout">{fout}</Melding> : null}
      {lijst === null && !fout ? <ActivityIndicator /> : null}
      {lijst ? (
        <>
          <Sectie>{`Te beoordelen (${open.length})`}</Sectie>
          {open.length === 0 ? <Text style={gedeeldeStijl.hulp}>Niets te beoordelen.</Text> : null}
          {open.map((t) => (
            <Kaartje key={t.betaling_id} t={t} nu={nu} onAfgehandeld={laad} />
          ))}
          {afgehandeld.length > 0 ? (
            <>
              <Sectie>Afgehandeld</Sectie>
              {afgehandeld.map((t) => (
                <Kaartje key={t.betaling_id} t={t} nu={nu} onAfgehandeld={laad} />
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function Kaartje({ t, nu, onAfgehandeld }: { t: Terugboeking; nu: number; onAfgehandeld: () => void }) {
  const [besluit, setBesluit] = useState('');
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const opslaan = async () => {
    setBezig(true);
    setFout(null);
    try {
      await handelTerugboekingAf(t.betaling_id, besluit);
      onAfgehandeld();
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  };
  return (
    <View style={s.kaart}>
      <Text style={s.naam}>{t.eigenaar}</Text>
      {t.email ? (
        <Text style={s.sub} selectable>
          {t.email}
        </Text>
      ) : null}
      <Text style={s.regel}>
        {t.teruggeboekt === t.bedrag ? `${euro(t.bedrag)} teruggeboekt` : `${euro(t.teruggeboekt)} van ${euro(t.bedrag)} teruggeboekt`}, betaald met {METHODE_NAAM[t.methode]}
        {t.teruggeboekt_op ? `, ${dagTekst(new Date(t.teruggeboekt_op).getTime(), nu).toLowerCase()}` : ''}.
      </Text>
      {t.aangevuld ? <Text style={s.regel}>Mollie haalde het geld bij de uitlater terug; Woober heeft het aangevuld.</Text> : null}
      {t.andere > 0 ? <Text style={s.regel}>{t.andere === 1 ? 'Deze eigenaar boekte al eens eerder terug.' : `Deze eigenaar boekte al ${t.andere} keer eerder terug.`}</Text> : null}
      <Text style={s.kenmerk} selectable>
        {t.betaling_id}
      </Text>
      {t.besluit ? (
        <Text style={s.besluit}>Besluit: {t.besluit}</Text>
      ) : (
        <View style={{ marginTop: ruimte(3) }}>
          <Veld label="Besluit" value={besluit} onChangeText={setBesluit} multiline placeholder="Bijvoorbeeld: eigenaar gebeld, vergissing; betaalt opnieuw" fout={fout} />
          <Knop titel="Besluit vastleggen" variant="secundair" uitgeschakeld={!besluit.trim() || bezig} onPress={opslaan} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { padding: ruimte(4), borderRadius: radius.midden, backgroundColor: kleuren.vlak, marginBottom: ruimte(3), gap: 2 },
  naam: { fontSize: 16, fontWeight: '800', color: kleuren.tekst },
  sub: { fontSize: 13, color: kleuren.gedempt },
  regel: { fontSize: 14, color: kleuren.tekst, lineHeight: 20, marginTop: ruimte(1) },
  kenmerk: { fontSize: 12, color: kleuren.gedempt, marginTop: ruimte(1) },
  besluit: { fontSize: 14, color: kleuren.tekst, marginTop: ruimte(2), fontStyle: 'italic' },
});
