import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { euro, meldbareAfspraak } from '../lib/prijs';
import { datumTijdTekst } from '../lib/tijd';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { AfspraakMelding, Boeking } from '../types';
import { Knop, Melding, Veld } from './ui';

const SOORTEN: { soort: AfspraakMelding['soort']; titel: string }[] = [
  { soort: 'niet_gekomen', titel: 'Kwam niet opdagen' },
  { soort: 'laat_afgezegd', titel: 'Zegde op het laatste moment af' },
];

/** Wat de eigenaar krijgt als de medewerker de melding terecht vindt */
function uitkomst(b: Boeking): string {
  const betaald = b.annuleringskosten ?? 0;
  if (betaald > 0) return `Krijg je gelijk, dan krijg je de ${euro(betaald)} annuleringskosten terug.`;
  if (b.status === 'gepland') return 'Krijg je gelijk, dan betaal je niets voor deze boeking, ook niet als je nu annuleert.';
  return 'Je hebt voor deze boeking niets betaald; je melding helpt ons om te zien wat er gebeurde.';
}

/**
 * Voor de eigenaar bij een boeking: melden dat de uitlater niet kwam of laat afzegde, en daarna de stand van de
 * melding. Een medewerker beoordeelt de melding en hoort ook de uitlater; niets gebeurt automatisch en andere
 * gebruikers zien er niets van (zie PLAN.md, open vragen over reviews).
 */
export function AfspraakMelden({ b, naam, nu }: { b: Boeking; naam: string; nu: number }) {
  const { meldAfspraak, modus } = useApp();
  const [open, setOpen] = useState(false);
  const voorstel = meldbareAfspraak(b, nu);

  if (b.afspraakMelding) {
    const m = b.afspraakMelding;
    return (
      <View style={{ marginTop: ruimte(3) }}>
        <Melding type="info">
          Je melding van {datumTijdTekst(m.tijd, nu)} ({SOORTEN.find((x) => x.soort === m.soort)?.titel.toLowerCase()}) is ontvangen. Een medewerker van Woober
          bekijkt hem en vraagt {naam} om een reactie. {uitkomst(b)}
          {modus === 'demo' ? ' In de demo beoordeelt niemand je melding.' : ''}
        </Melding>
      </View>
    );
  }
  if (!voorstel) return null;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={({ pressed }) => [s.kaart, pressed && { backgroundColor: kleuren.vlak }]}>
        <Ionicons name="flag" size={18} color={kleuren.waarschuwing} />
        <View style={{ flex: 1 }}>
          <Text style={s.kaartTitel}>{voorstel === 'laat_afgezegd' ? `${naam} zegde laat af?` : `Kwam ${naam} niet?`}</Text>
          <Text style={s.kaartSub}>Meld het, dan kijkt een medewerker van Woober ernaar.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={kleuren.gedempt} />
      </Pressable>
      <MeldVenster
        zichtbaar={open}
        sluit={() => setOpen(false)}
        naam={naam}
        voorstel={voorstel}
        uitkomst={uitkomst(b)}
        verstuur={(soort, toelichting) => {
          meldAfspraak(b.id, soort, toelichting);
          setOpen(false);
        }}
      />
    </>
  );
}

function MeldVenster({
  zichtbaar,
  sluit,
  naam,
  voorstel,
  uitkomst,
  verstuur,
}: {
  zichtbaar: boolean;
  sluit: () => void;
  naam: string;
  voorstel: AfspraakMelding['soort'];
  uitkomst: string;
  verstuur: (soort: AfspraakMelding['soort'], toelichting: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [soort, setSoort] = useState(voorstel);
  const [toelichting, setToelichting] = useState('');
  return (
    <Modal visible={zichtbaar} transparent animationType="slide" onRequestClose={sluit}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.achtergrond} onPress={sluit} accessibilityLabel="Sluiten" />
        <View style={[s.blad, { paddingBottom: Math.max(insets.bottom, ruimte(4)) }]}>
          <Text style={s.titel}>Melden over deze boeking</Text>
          <View style={{ gap: ruimte(2), marginBottom: ruimte(4) }}>
            {SOORTEN.map((o) => {
              const actief = o.soort === soort;
              return (
                <Pressable
                  key={o.soort}
                  onPress={() => setSoort(o.soort)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: actief }}
                  style={[s.optie, actief && s.optieActief]}
                >
                  <Ionicons name={actief ? 'radio-button-on' : 'radio-button-off'} size={20} color={actief ? kleuren.primair : kleuren.gedempt} />
                  <Text style={s.optieTekst}>
                    {naam} {o.titel.charAt(0).toLowerCase() + o.titel.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Veld
            label="Wat is er gebeurd? (mag leeg)"
            value={toelichting}
            onChangeText={setToelichting}
            multiline
            maxLength={300}
            placeholder="Bijvoorbeeld: om 9:15 nog niemand, geen bericht"
          />
          <Text style={s.uitleg}>
            Een medewerker van Woober beoordeelt je melding, nooit een computer, en vraagt {naam} ook om een reactie. {uitkomst} Andere gebruikers zien je
            melding niet.
          </Text>
          <Knop titel="Melding versturen" icoon="flag" onPress={() => verstuur(soort, toelichting)} />
          <Knop titel="Annuleren" variant="tekst" onPress={sluit} stijl={{ marginTop: ruimte(1) }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  kaart: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), padding: ruimte(3), borderRadius: radius.midden, borderWidth: 1, borderColor: kleuren.rand, marginTop: ruimte(3) },
  kaartTitel: { fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  kaartSub: { fontSize: 13, color: kleuren.gedempt, marginTop: 2, lineHeight: 18 },
  achtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  blad: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.groot,
    borderTopRightRadius: radius.groot,
    paddingHorizontal: ruimte(5),
    paddingTop: ruimte(5),
  },
  titel: { fontSize: 20, fontWeight: '800', color: kleuren.tekst, marginBottom: ruimte(4) },
  optie: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), padding: ruimte(3), borderRadius: radius.midden, borderWidth: 1.5, borderColor: kleuren.rand },
  optieActief: { borderColor: kleuren.primair, backgroundColor: kleuren.primairVlak },
  optieTekst: { flex: 1, fontSize: 15, fontWeight: '600', color: kleuren.tekst },
  uitleg: { fontSize: 13, color: kleuren.gedempt, lineHeight: 18, marginTop: -ruimte(1), marginBottom: ruimte(4) },
});
