import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTekst } from '../state/Teksten';
import { kleuren, radius, ruimte } from '../theme';
import { Bewerkbaar } from './Bewerkbaar';
import { MenuRij } from './blokken';
import { Knop } from './ui';

/** Menuregels die onder Account bij beide rollen staan: hulp, privacy, voorwaarden en voor het team Beheer */
export function WooberRijen() {
  const router = useRouter();
  const { beheerder } = useApp();
  const contact = useTekst('contact.email');
  return (
    <>
      <MenuRij icoon="help-buoy" titel="Veiligheid en hulp" sub="Noodnummers en regels" onPress={() => router.push('/veiligheid')} />
      <Bewerkbaar sleutels="contact.email">
        <MenuRij icoon="mail" titel="Hulp en contact" sub={contact} onPress={() => Linking.openURL(`mailto:${contact}`)} />
      </Bewerkbaar>
      <MenuRij icoon="document-text" titel="Privacy" sub="Privacy- en cookieverklaring" onPress={() => router.push('/privacy')} />
      <MenuRij icoon="reader" titel="Voorwaarden" sub="Gebruiksvoorwaarden" onPress={() => router.push('/voorwaarden')} />
      {beheerder ? <MenuRij icoon="construct" titel="Beheer" sub="Verdienmodel en andere instellingen, alleen voor het team" onPress={() => router.push('/beheer')} /> : null}
    </>
  );
}

/** Onderaan Account: wat er met je locatie of adres gebeurt, uitloggen en account verwijderen */
export function AccountOnderaan({ privacy, verwijderen }: { privacy: string; verwijderen: string }) {
  const { gebruiker, accountVerwijderen, uitloggen, modus } = useApp();
  const [bevestig, setBevestig] = useState(false);
  return (
    <>
      <View style={s.privacy}>
        <Ionicons name="lock-closed" size={16} color={kleuren.gedempt} />
        <Text style={s.privacyTekst}>{privacy}</Text>
      </View>
      <Knop titel={modus === 'echt' ? 'Uitloggen' : 'Demo verlaten'} variant="secundair" icoon="log-out-outline" onPress={uitloggen} stijl={{ marginTop: ruimte(4) }} />
      {!bevestig ? (
        <Knop titel="Account verwijderen" variant="gevaar" icoon="trash" onPress={() => setBevestig(true)} stijl={{ marginTop: ruimte(3) }} />
      ) : (
        <View style={s.bevestig}>
          <Text style={s.bevestigTitel}>Weet je het zeker?</Text>
          <Text style={s.bevestigTekst}>{verwijderen}</Text>
          <Knop titel="Ja, alles verwijderen" variant="gevaar" icoon="trash" onPress={accountVerwijderen} />
          <Knop titel="Annuleren" variant="tekst" stijl={{ marginTop: ruimte(1) }} onPress={() => setBevestig(false)} />
        </View>
      )}
      <Text style={s.versie}>{modus === 'echt' ? `Woober 1.0. Ingelogd als ${gebruiker?.email}.` : 'Woober demo. Gegevens worden niet opgeslagen.'}</Text>
    </>
  );
}

const s = StyleSheet.create({
  privacy: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  privacyTekst: { flex: 1, fontSize: 13, color: kleuren.gedempt, lineHeight: 18 },
  bevestig: { marginTop: ruimte(4), padding: ruimte(4), borderRadius: radius.midden, backgroundColor: kleuren.foutVlak },
  bevestigTitel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  bevestigTekst: { fontSize: 14, color: kleuren.tekst, marginVertical: ruimte(3), lineHeight: 20 },
  versie: { fontSize: 12, color: '#A1A1AA', textAlign: 'center', marginTop: ruimte(6) },
});
