import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Vinkje } from '../components/blokken';
import { Knop, Label, Melding, Veld } from '../components/ui';
import { DEMO_THUIS } from '../data/stad';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Rol } from '../types';

function RolKaart({ actief, onPress, icoon, titel, tekst }: { actief: boolean; onPress: () => void; icoon: 'dog' | 'walk'; titel: string; tekst: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: actief }}
      style={[s.rolKaart, actief && { borderColor: kleuren.primair, backgroundColor: kleuren.primairVlak }]}
    >
      <MaterialCommunityIcons name={icoon} size={28} color={actief ? kleuren.primair : kleuren.gedempt} />
      <Text style={s.rolTitel}>{titel}</Text>
      <Text style={s.rolTekst}>{tekst}</Text>
      {actief ? <Ionicons name="checkmark-circle" size={20} color={kleuren.primair} style={s.rolVink} /> : null}
    </Pressable>
  );
}

export default function Aanmelden() {
  const { aanmelden } = useApp();
  const [rol, setRol] = useState<Rol | null>(null);
  const [voornaam, setVoornaam] = useState('');
  const [email, setEmail] = useState('');
  const [adres, setAdres] = useState('');
  const [postcode, setPostcode] = useState('');
  const [plaats, setPlaats] = useState('');
  const [akkoord, setAkkoord] = useState(false);
  const [volwassen, setVolwassen] = useState(false);
  const [geprobeerd, setGeprobeerd] = useState(false);

  const fouten = {
    rol: rol ? null : 'Kies hoe je Woober wilt gebruiken.',
    voornaam: voornaam.trim().length < 2 ? 'Vul je voornaam in.' : null,
    email: /^\S+@\S+\.\S+$/.test(email.trim()) ? null : 'Vul een geldig e-mailadres in.',
    adres: /\d/.test(adres) && adres.trim().length >= 4 ? null : 'Vul je straat en huisnummer in.',
    postcode: /^[1-9]\d{3}\s?[A-Za-z]{2}$/.test(postcode.trim()) ? null : 'Vul een Nederlandse postcode in, bijv. 6511 AB.',
    plaats: plaats.trim().length < 2 ? 'Vul je woonplaats in.' : null,
  };
  const geldig = Object.values(fouten).every((f) => f === null) && akkoord && volwassen;
  const toon = (f: string | null) => (geprobeerd ? f : null);

  const verstuur = () => {
    setGeprobeerd(true);
    if (!geldig || !rol) return;
    aanmelden(
      {
        voornaam: voornaam.trim(),
        email: email.trim().toLowerCase(),
        adres: adres.trim(),
        postcode: postcode.trim().toUpperCase(),
        plaats: plaats.trim(),
        thuis: DEMO_THUIS,
      },
      rol,
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <Label>Ik wil</Label>
        <View style={s.rollen}>
          <RolKaart actief={rol === 'eigenaar'} onPress={() => setRol('eigenaar')} icoon="dog" titel="Mijn hond laten uitlaten" tekst="Kies een uitlater in de buurt en volg de wandeling live." />
          <RolKaart actief={rol === 'uitlater'} onPress={() => setRol('uitlater')} icoon="walk" titel="Honden uitlaten" tekst="Bepaal zelf je tarief, werkgebied en wanneer je werkt." />
        </View>
        {toon(fouten.rol) ? <Text style={s.fout}>{fouten.rol}</Text> : null}
        <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(5) }]}>Je kunt later altijd wisselen, of allebei doen.</Text>

        <View style={s.sociaal}>
          <Knop titel="Doorgaan met Apple" variant="secundair" icoon="logo-apple" onPress={() => {}} uitgeschakeld />
          <Knop titel="Doorgaan met Google" variant="secundair" icoon="logo-google" onPress={() => {}} uitgeschakeld />
          <Text style={gedeeldeStijl.klein}>Inloggen met Apple en Google volgt in de echte app.</Text>
        </View>

        <Veld label="Voornaam" value={voornaam} onChangeText={setVoornaam} autoComplete="given-name" fout={toon(fouten.voornaam)} />
        <Veld
          label="E-mailadres"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          fout={toon(fouten.email)}
        />
        <Veld
          label={rol === 'uitlater' ? 'Straat en huisnummer' : 'Ophaaladres'}
          value={adres}
          onChangeText={setAdres}
          autoComplete="street-address"
          placeholder="Bijv. Molenstraat 24"
          hulp={
            rol === 'uitlater'
              ? 'Eigenaren zien alleen je wijk en de afstand, nooit je adres.'
              : 'Een uitlater ziet je adres pas als die je boeking heeft geaccepteerd.'
          }
          fout={toon(fouten.adres)}
        />
        <View style={{ flexDirection: 'row', gap: ruimte(3) }}>
          <View style={{ flex: 1 }}>
            <Veld label="Postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" autoComplete="postal-code" fout={toon(fouten.postcode)} />
          </View>
          <View style={{ flex: 1.3 }}>
            <Veld label="Woonplaats" value={plaats} onChangeText={setPlaats} fout={toon(fouten.plaats)} />
          </View>
        </View>

        {rol === 'uitlater' ? (
          <Melding type="info">
            Voordat je online kunt, laat je je identiteit controleren en koppel je een aansprakelijkheidsverzekering en een rekening voor uitbetaling.
          </Melding>
        ) : null}

        <Vinkje aan={volwassen} onPress={() => setVolwassen((v) => !v)}>
          Ik ben 18 jaar of ouder.
        </Vinkje>
        <Vinkje aan={akkoord} onPress={() => setAkkoord((v) => !v)}>
          Ik ga akkoord met de gebruiksvoorwaarden en het privacybeleid van Woober.
        </Vinkje>

        {geprobeerd && (!akkoord || !volwassen) ? <Melding type="fout">Vink beide vakjes aan om verder te gaan.</Melding> : null}

        <Knop titel="Verder" onPress={verstuur} stijl={{ marginTop: ruimte(4) }} />
        <Text style={[gedeeldeStijl.klein, { marginTop: ruimte(3) }]}>In de demo staat je huis altijd op dezelfde plek op de kaart.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  rollen: { flexDirection: 'row', gap: ruimte(3), marginBottom: ruimte(2) },
  rolKaart: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: kleuren.rand,
    borderRadius: radius.midden,
    padding: ruimte(4),
    gap: 6,
  },
  rolTitel: { fontSize: 16, fontWeight: '800', color: kleuren.tekst },
  rolTekst: { fontSize: 13, color: kleuren.gedempt, lineHeight: 18 },
  rolVink: { position: 'absolute', top: 10, right: 10 },
  fout: { fontSize: 12, color: kleuren.nope, fontWeight: '600', marginBottom: 4 },
  sociaal: { gap: ruimte(2), marginBottom: ruimte(6) },
});
