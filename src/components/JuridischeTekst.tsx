import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TekstSleutel } from '../lib/teksten';
import { useTekst } from '../state/Teksten';
import { kleuren, ruimte } from '../theme';
import { Bewerkbaar } from './Bewerkbaar';
import { Melding } from './ui';

export interface Sectie {
  titel: string;
  alineas?: string[];
  punten?: string[];
}

/**
 * Gebruiksvoorwaarden en privacyverklaring: kop, versie, conceptwaarschuwing en secties. De gegevens van de onderneming
 * staan midden in de tekst; de hamer daarvoor staat bij de kop van de eerste sectie.
 */
export function JuridischeTekst({
  kop,
  versie,
  concept,
  gegevens,
  secties,
  children,
}: {
  kop: string;
  versie: TekstSleutel;
  concept: TekstSleutel;
  gegevens: TekstSleutel[];
  secties: Sectie[];
  children?: ReactNode;
}) {
  const versieTekst = useTekst(versie);
  const conceptTekst = useTekst(concept);
  return (
    <ScrollView contentContainerStyle={s.inhoud}>
      <Text style={s.kop}>{kop}</Text>
      <Bewerkbaar sleutels={versie}>
        <Text style={s.versie}>Versie {versieTekst}</Text>
      </Bewerkbaar>
      <Bewerkbaar sleutels={concept} leeg={!conceptTekst.trim()}>
        <Melding type="waarschuwing">{conceptTekst}</Melding>
      </Bewerkbaar>
      {secties.map((sectie, i) => (
        <View key={sectie.titel} style={s.sectie}>
          {i === 0 ? (
            <Bewerkbaar sleutels={gegevens}>
              <Text style={s.titel}>{sectie.titel}</Text>
            </Bewerkbaar>
          ) : (
            <Text style={s.titel}>{sectie.titel}</Text>
          )}
          {sectie.punten?.map((p) => (
            <View key={p} style={s.punt}>
              <Ionicons name="ellipse" size={6} color={kleuren.primair} style={{ marginTop: 8 }} />
              <Text style={s.tekst}>{p}</Text>
            </View>
          ))}
          {sectie.alineas?.map((a) => (
            <Text key={a} style={[s.tekst, s.alinea]}>
              {a}
            </Text>
          ))}
        </View>
      ))}
      {children}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  inhoud: { padding: ruimte(5), paddingBottom: ruimte(14), width: '100%', maxWidth: 680, alignSelf: 'center' },
  kop: { fontSize: 26, fontWeight: '900', color: kleuren.tekst, letterSpacing: -0.5 },
  versie: { fontSize: 13, color: kleuren.gedempt, marginTop: 4, marginBottom: ruimte(4) },
  sectie: { marginTop: ruimte(5), paddingTop: ruimte(4), borderTopWidth: 1, borderTopColor: kleuren.rand },
  titel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst, marginBottom: ruimte(2) },
  punt: { flexDirection: 'row', gap: 10, marginBottom: ruimte(2), alignItems: 'flex-start' },
  tekst: { flex: 1, fontSize: 15, color: kleuren.tekst, lineHeight: 22 },
  alinea: { marginBottom: ruimte(2) },
});
