import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { kleuren, ruimte } from '../theme';
import type { Rol } from '../types';
import { OnderBlad } from './blokken';
import { Knop } from './ui';

const REDENEN: Record<Rol, string[]> = {
  eigenaar: [
    'Vraagt om betaling buiten Woober',
    'Kwam niet opdagen of was erg laat',
    'Ging onzorgvuldig om met mijn hond',
    'Nepprofiel of oplichting',
    'Ongepast of intimiderend gedrag',
    'Iets anders',
  ],
  uitlater: [
    'Vraagt om betaling buiten Woober',
    'Hond was agressief en dat was niet gemeld',
    'Onveilige situatie bij de overdracht',
    'Nepprofiel of oplichting',
    'Ongepast of intimiderend gedrag',
    'Iets anders',
  ],
};

type Paneel = 'menu' | 'melden' | 'gemeld' | 'blokkeren';

/** Melden en blokkeren, zoals bij Woofer. Een melding wordt altijd door een mens beoordeeld. */
export function MeldenBlad({
  zichtbaar,
  onSluit,
  naam,
  rol,
  onMeld,
  onBlokkeer,
}: {
  zichtbaar: boolean;
  onSluit: () => void;
  naam: string;
  /** Rol van de gebruiker die meldt */
  rol: Rol;
  onMeld: (reden: string) => void;
  onBlokkeer: () => void;
}) {
  const [paneel, setPaneel] = useState<Paneel>('menu');
  const sluit = () => {
    setPaneel('menu');
    onSluit();
  };

  return (
    <OnderBlad zichtbaar={zichtbaar} sluit={sluit}>
      {paneel === 'menu' ? (
        <>
          <Text style={s.titel}>Veiligheid</Text>
          <Knop titel={`${naam} melden`} variant="secundair" icoon="flag" onPress={() => setPaneel('melden')} />
          <Knop titel={`${naam} blokkeren`} variant="gevaar" icoon="ban" stijl={{ marginTop: ruimte(3) }} onPress={() => setPaneel('blokkeren')} />
          <Text style={s.noot}>Bij direct gevaar: bel 112. Vermoeden van dierenmishandeling: bel 144.</Text>
        </>
      ) : null}

      {paneel === 'melden' ? (
        <>
          <Text style={s.titel}>Waarom meld je {naam}?</Text>
          {REDENEN[rol].map((r) => (
            <Pressable
              key={r}
              style={s.reden}
              onPress={() => {
                onMeld(r);
                setPaneel('gemeld');
              }}
            >
              <Text style={s.redenTekst}>{r}</Text>
              <Ionicons name="chevron-forward" size={18} color={kleuren.gedempt} />
            </Pressable>
          ))}
        </>
      ) : null}

      {paneel === 'gemeld' ? (
        <>
          <Text style={s.titel}>Bedankt voor je melding</Text>
          <Text style={s.tekst}>
            Een medewerker van Woober bekijkt het binnen 24 uur. {naam} ziet niet dat jij dit hebt gemeld. Maatregelen neemt altijd een mens, met uitleg en de mogelijkheid om te reageren.
          </Text>
          <Knop titel={`Ook ${naam} blokkeren`} variant="gevaar" icoon="ban" onPress={() => setPaneel('blokkeren')} />
          <Knop titel="Sluiten" variant="tekst" stijl={{ marginTop: ruimte(2) }} onPress={sluit} />
        </>
      ) : null}

      {paneel === 'blokkeren' ? (
        <>
          <Text style={s.titel}>{naam} blokkeren?</Text>
          <Text style={s.tekst}>Het gesprek verdwijnt en jullie zien elkaar niet meer terug op Woober.</Text>
          <Knop
            titel="Blokkeren"
            variant="gevaar"
            icoon="ban"
            onPress={() => {
              sluit();
              onBlokkeer();
            }}
          />
          <Knop titel="Annuleren" variant="tekst" stijl={{ marginTop: ruimte(2) }} onPress={sluit} />
        </>
      ) : null}
    </OnderBlad>
  );
}

const s = StyleSheet.create({
  titel: { fontSize: 20, fontWeight: '800', color: kleuren.tekst, marginBottom: ruimte(4) },
  tekst: { fontSize: 15, color: kleuren.gedempt, lineHeight: 21, marginBottom: ruimte(4) },
  noot: { fontSize: 12, color: kleuren.gedempt, textAlign: 'center', marginTop: ruimte(4) },
  reden: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: kleuren.rand },
  redenTekst: { fontSize: 16, color: kleuren.tekst, flex: 1 },
});
