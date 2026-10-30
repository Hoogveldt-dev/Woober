import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Vinkje } from '../components/blokken';
import { Bewerkbaar } from '../components/Bewerkbaar';
import { Knop, Label, Melding, Veld } from '../components/ui';
import { DEMO_THUIS } from '../data/stad';
import { bekendeGegevens, controleerInlogcode, inloggenMetApple, inloggenMetGoogle, stuurInlogcode } from '../lib/account';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Rol } from '../types';
import { useTekst } from '../state/Teksten';

const foutTekst = (e: unknown) => (e instanceof Error ? e.message : 'Er ging iets mis. Probeer het nog eens.');

/** Eerst inloggen (Apple, Google of een code per e-mail); daarna, bij een nieuw account, je gegevens aanvullen */
export default function Aanmelden() {
  const { ingelogd, laden } = useApp();
  if (laden) {
    return (
      <View style={[gedeeldeStijl.scherm, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={kleuren.primair} />
      </View>
    );
  }
  return ingelogd ? <Gegevens /> : <Inloggen />;
}

/** Ook te zien voor beheerders onder Beheer, Inlogscherm bekijken (`voorbeeld`): dan logt niemand in */
export function Inloggen({ voorbeeld }: { voorbeeld?: boolean }) {
  const titel = useTekst('inloggen.titel');
  const sub = useTekst('inloggen.sub');
  const privacyZin = useTekst('inloggen.privacy');
  const [bezig, setBezig] = useState<'apple' | 'google' | 'mail' | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [codeVerstuurd, setCodeVerstuurd] = useState(false);
  const [code, setCode] = useState('');
  const [appleKnop, setAppleKnop] = useState(false);

  // Op iPhone en iPad de knop van Apple zelf, zoals Apple voorschrijft
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleKnop, () => setAppleKnop(false));
  }, []);

  const probeer = async (wat: 'apple' | 'google' | 'mail', actie: () => Promise<unknown>) => {
    if (voorbeeld) return;
    setFout(null);
    setBezig(wat);
    try {
      await actie();
    } catch (e) {
      setFout(foutTekst(e));
    } finally {
      setBezig(null);
    }
  };

  const emailGeldig = /^\S+@\S+\.\S+$/.test(email.trim());
  const schoneEmail = email.trim().toLowerCase();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <Bewerkbaar sleutels="inloggen.titel">
          <Text style={gedeeldeStijl.titel}>{titel}</Text>
        </Bewerkbaar>
        <Bewerkbaar sleutels="inloggen.sub">
          <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(6) }]}>{sub}</Text>
        </Bewerkbaar>

        <View style={s.sociaal}>
          {appleKnop ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={26}
              style={s.appleKnop}
              onPress={() => probeer('apple', inloggenMetApple)}
            />
          ) : (
            <Knop titel="Doorgaan met Apple" variant="secundair" icoon="logo-apple" uitgeschakeld={bezig !== null} onPress={() => probeer('apple', inloggenMetApple)} />
          )}
          <Knop titel="Doorgaan met Google" variant="secundair" icoon="logo-google" uitgeschakeld={bezig !== null} onPress={() => probeer('google', inloggenMetGoogle)} />
          {bezig === 'apple' || bezig === 'google' ? <ActivityIndicator color={kleuren.primair} /> : null}
        </View>

        <View style={s.of}>
          <View style={s.lijn} />
          <Text style={s.ofTekst}>of met je e-mailadres</Text>
          <View style={s.lijn} />
        </View>

        <Veld
          label="E-mailadres"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setCodeVerstuurd(false);
            setCode('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={bezig === null}
        />
        {!codeVerstuurd ? (
          <Knop
            titel="Stuur een inlogcode"
            icoon="mail"
            uitgeschakeld={!emailGeldig || bezig !== null}
            onPress={() => probeer('mail', async () => {
              await stuurInlogcode(schoneEmail);
              setCodeVerstuurd(true);
            })}
          />
        ) : (
          <>
            <Melding type="info">We hebben een code van 6 cijfers gestuurd naar {schoneEmail}. Kijk ook even in je ongewenste mail.</Melding>
            <Veld
              label="Code uit de e-mail"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
            />
            <Knop titel="Inloggen" uitgeschakeld={code.length !== 6 || bezig !== null} onPress={() => probeer('mail', () => controleerInlogcode(schoneEmail, code))} />
            <Knop titel="Nieuwe code sturen" variant="tekst" uitgeschakeld={bezig !== null} onPress={() => probeer('mail', () => stuurInlogcode(schoneEmail))} stijl={{ marginTop: ruimte(1) }} />
          </>
        )}
        {bezig === 'mail' ? <ActivityIndicator color={kleuren.primair} style={{ marginTop: ruimte(3) }} /> : null}

        {fout ? <View style={{ marginTop: ruimte(4) }}><Melding type="fout">{fout}</Melding></View> : null}

        <Bewerkbaar sleutels="inloggen.privacy" stijl={{ marginTop: ruimte(6) }}>
          <Text style={gedeeldeStijl.klein}>{privacyZin}</Text>
        </Bewerkbaar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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

function Gegevens() {
  const router = useRouter();
  const { aanmelden, uitloggen } = useApp();
  const voorwaardenVersie = useTekst('voorwaarden.versie');
  const [rol, setRol] = useState<Rol | null>(null);
  const [voornaam, setVoornaam] = useState('');
  const [email, setEmail] = useState('');
  const [adres, setAdres] = useState('');
  const [postcode, setPostcode] = useState('');
  const [plaats, setPlaats] = useState('');
  const [akkoord, setAkkoord] = useState(false);
  const [volwassen, setVolwassen] = useState(false);
  const [geprobeerd, setGeprobeerd] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [opslagFout, setOpslagFout] = useState<string | null>(null);

  // Naam en e-mail van Apple, Google of de inlogcode alvast invullen
  useEffect(() => {
    bekendeGegevens().then((g) => {
      if (!g) return;
      setEmail(g.email);
      setVoornaam((v) => v || g.voornaam);
    });
  }, []);

  const fouten = {
    rol: rol ? null : 'Kies hoe je Woober wilt gebruiken.',
    voornaam: voornaam.trim().length < 2 ? 'Vul je voornaam in.' : null,
    adres: /\d/.test(adres) && adres.trim().length >= 4 ? null : 'Vul je straat en huisnummer in.',
    postcode: /^[1-9]\d{3}\s?[A-Za-z]{2}$/.test(postcode.trim()) ? null : 'Vul een Nederlandse postcode in, bijv. 6511 AB.',
    plaats: plaats.trim().length < 2 ? 'Vul je woonplaats in.' : null,
  };
  const geldig = Object.values(fouten).every((f) => f === null) && akkoord && volwassen;
  const toon = (f: string | null) => (geprobeerd ? f : null);

  const verstuur = async () => {
    setGeprobeerd(true);
    if (!geldig || !rol) return;
    setBezig(true);
    setOpslagFout(null);
    try {
      await aanmelden(
        {
          voornaam: voornaam.trim(),
          email,
          adres: adres.trim(),
          postcode: postcode.trim().toUpperCase(),
          plaats: plaats.trim(),
          thuis: DEMO_THUIS,
        },
        rol,
        voorwaardenVersie,
      );
    } catch (e) {
      setOpslagFout(foutTekst(e));
      setBezig(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        {email ? <Melding type="goed">Ingelogd als {email}. Nog een paar gegevens en je kunt beginnen.</Melding> : null}

        <Label>Ik wil</Label>
        <View style={s.rollen}>
          <RolKaart actief={rol === 'eigenaar'} onPress={() => setRol('eigenaar')} icoon="dog" titel="Hulp voor mijn hond" tekst="Uitlaten of oppas aan huis, door iemand uit de buurt." />
          <RolKaart actief={rol === 'uitlater'} onPress={() => setRol('uitlater')} icoon="walk" titel="Uitlaten of oppassen" tekst="Bepaal zelf je tarief, werkgebied en wanneer je werkt." />
        </View>
        {toon(fouten.rol) ? <Text style={s.fout}>{fouten.rol}</Text> : null}
        <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(5) }]}>Je kunt later altijd wisselen, of allebei doen.</Text>

        <Veld label="Voornaam" value={voornaam} onChangeText={setVoornaam} autoComplete="given-name" fout={toon(fouten.voornaam)} />
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
          Ik ga akkoord met de{' '}
          <Text style={s.link} onPress={() => router.push('/voorwaarden')}>
            gebruiksvoorwaarden
          </Text>{' '}
          en het{' '}
          <Text style={s.link} onPress={() => router.push('/privacy')}>
            privacybeleid
          </Text>{' '}
          van Woober.
        </Vinkje>

        {geprobeerd && (!akkoord || !volwassen) ? <Melding type="fout">Vink beide vakjes aan om verder te gaan.</Melding> : null}
        {opslagFout ? <Melding type="fout">{opslagFout}</Melding> : null}

        <Knop titel={bezig ? 'Bezig met opslaan' : 'Verder'} uitgeschakeld={bezig} onPress={verstuur} stijl={{ marginTop: ruimte(4) }} />
        <Knop titel="Uitloggen" variant="tekst" uitgeschakeld={bezig} onPress={uitloggen} stijl={{ marginTop: ruimte(1) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  sociaal: { gap: ruimte(2) },
  appleKnop: { height: 52, width: '100%' },
  of: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), marginVertical: ruimte(6) },
  lijn: { flex: 1, height: 1, backgroundColor: kleuren.rand },
  ofTekst: { fontSize: 13, color: kleuren.gedempt },
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
  link: { color: kleuren.primair, fontWeight: '700', textDecorationLine: 'underline' },
});
