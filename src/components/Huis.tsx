import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HUIS_KENMERKEN, VOORZIENINGEN } from '../lib/huis';
import { kleuren, radius, ruimte } from '../theme';
import type { HuisInfo, OppasHuis } from '../types';
import { Knop } from './ui';

function Regel({ icoon, tekst, kleur = kleuren.gedempt }: { icoon: ComponentProps<typeof Ionicons>['name']; tekst: string; kleur?: string }) {
  return (
    <View style={s.regel}>
      <Ionicons name={icoon} size={16} color={kleur} />
      <Text style={s.regelTekst}>{tekst}</Text>
    </View>
  );
}

/** Afspraken over het huis van de eigenaar, voor de oppas. Zichtbaar vanaf het verzoek, zodat de oppas weet waar die aan begint. */
export function HuisAfspraken({ info }: { info: HuisInfo }) {
  return (
    <View style={s.blok}>
      <Regel
        icoon={info.camera ? 'videocam' : 'videocam-off'}
        kleur={info.camera ? kleuren.waarschuwing : kleuren.gedempt}
        tekst={info.camera ? `Camera's in huis: ${info.cameraWaar}` : "Geen camera's in huis"}
      />
      {info.voorzieningen.length ? (
        <Regel icoon="cafe" tekst={`Je mag gebruiken: ${info.voorzieningen.map((v) => VOORZIENINGEN[v].toLowerCase()).join(', ')}`} />
      ) : null}
      {info.huisregels ? <Regel icoon="lock-closed" tekst={info.huisregels} /> : null}
    </View>
  );
}

/** Het huis van een oppas die honden thuis ontvangt, voor de eigenaar. Het adres staat er niet in. */
export function OppasHuisInfo({ huis }: { huis: OppasHuis }) {
  return (
    <View style={s.blok}>
      <Regel icoon="home" tekst={huis.omschrijving} />
      {huis.kenmerken.length ? <Regel icoon="checkmark-circle" tekst={huis.kenmerken.map((k) => HUIS_KENMERKEN[k]).join(', ')} /> : null}
    </View>
  );
}

/** Afspraken over het huis maak je het liefst in de chat: dan staan ze voor allebei op papier */
export function AfsprakenTip({ tekst, onChat }: { tekst: string; onChat: () => void }) {
  return (
    <View style={s.tip}>
      <Text style={s.tipTekst}>{tekst}</Text>
      <Knop titel="Afspraken bespreken" variant="secundair" icoon="chatbubbles" onPress={onChat} />
    </View>
  );
}

const s = StyleSheet.create({
  blok: { backgroundColor: kleuren.vlak, borderRadius: radius.midden, padding: ruimte(3), gap: ruimte(2), marginBottom: ruimte(3) },
  regel: { flexDirection: 'row', gap: ruimte(2), alignItems: 'flex-start' },
  regelTekst: { flex: 1, fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
  tip: { backgroundColor: kleuren.primairVlak, borderRadius: radius.midden, padding: ruimte(3), gap: ruimte(2), marginBottom: ruimte(3) },
  tipTekst: { fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
});
