import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HondenStapel, PersoonAvatar } from '../components/avatars';
import { Blok, gedeeldeStijl, Rij, Sterren } from '../components/blokken';
import { Chip, Knop, Label, Melding, Veld } from '../components/ui';
import { ANNULERINGSDEEL, berekenPrijs, euro, GRATIS_ANNULEREN_UUR } from '../lib/prijs';
import { momentTekst } from '../lib/tijd';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Betaalmethode, Sleutel } from '../types';

const METHODES: { id: Betaalmethode; titel: string; icoon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'ideal', titel: 'iDEAL', icoon: 'business' },
  { id: 'applepay', titel: 'Apple Pay', icoon: 'logo-apple' },
  { id: 'kaart', titel: 'Creditcard', icoon: 'card' },
];

export default function Bevestigen() {
  const router = useRouter();
  const { concept, uitlater, honden, gebruiker, betaalmethode, vraagAan } = useApp();
  const u = concept?.uitlaterId ? uitlater(concept.uitlaterId) : undefined;
  const [sleutel, setSleutel] = useState<Sleutel>('thuis');
  const [notitie, setNotitie] = useState('');
  const [methode, setMethode] = useState<Betaalmethode>(betaalmethode);

  if (!concept || !u || !gebruiker) return <Redirect href="/" />;

  const gekozenHonden = honden.filter((h) => concept.hondIds.includes(h.id));
  const prijs = berekenPrijs(u, concept.duur, gekozenHonden.length);
  const wekelijks = concept.moment.type === 'wekelijks';

  const verstuur = () => {
    const id = vraagAan({ uitlaterId: u.id, hondIds: concept.hondIds, duur: concept.duur, moment: concept.moment, sleutel, notitie: notitie.trim(), betaalmethode: methode });
    if (!id) return;
    router.dismissAll();
    router.push({ pathname: '/wandeling/[id]', params: { id } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <View style={s.kop}>
          <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={60} />
          <View style={{ flex: 1 }}>
            <Text style={gedeeldeStijl.titel}>{u.voornaam}</Text>
            <Sterren waarde={u.beoordeling} aantal={u.aantalBeoordelingen} />
          </View>
          <HondenStapel honden={gekozenHonden} grootte={44} />
        </View>

        <Blok>
          <Rij label="Wanneer" waarde={momentTekst(concept.moment)} />
          <Rij label="Duur" waarde={`${concept.duur} minuten`} />
          <Rij label="Honden" waarde={gekozenHonden.map((h) => h.naam).join(', ')} />
          <Rij label="Ophalen op" waarde={gebruiker.adres} />
        </Blok>

        <Label>Sleutel en overdracht</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Ik ben thuis" icoon="home" actief={sleutel === 'thuis'} onPress={() => setSleutel('thuis')} />
          <Chip label="Sleutelkastje" icoon="key" actief={sleutel === 'kastje'} onPress={() => setSleutel('kastje')} />
          <Chip label={`${u.voornaam} heeft al een sleutel`} actief={sleutel === 'overhandigd'} onPress={() => setSleutel('overhandigd')} />
        </View>
        <Text style={[gedeeldeStijl.hulp, { marginTop: ruimte(2), marginBottom: ruimte(4) }]}>
          {sleutel === 'kastje'
            ? 'Deel de code van het kastje via de chat, pas nadat de boeking is bevestigd.'
            : 'Bij de deur noem je een ophaalcode van 4 cijfers. Zo weet je zeker dat de juiste persoon je hond meeneemt.'}
        </Text>

        <Veld
          label={`Bericht voor ${u.voornaam}`}
          value={notitie}
          onChangeText={setNotitie}
          multiline
          maxLength={300}
          placeholder="Bijv. tuigje hangt aan de kapstok, graag even langs het losloopgebied"
        />

        <Label>Betalen</Label>
        <View style={[s.methodes, { marginBottom: ruimte(5) }]}>
          {METHODES.map((m) => (
            <Pressable key={m.id} onPress={() => setMethode(m.id)} accessibilityRole="radio" accessibilityState={{ selected: methode === m.id }} style={s.methode}>
              <Ionicons name={m.icoon} size={20} color={kleuren.tekst} />
              <Text style={s.methodeTekst}>{m.titel}</Text>
              <Ionicons name={methode === m.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={methode === m.id ? kleuren.primair : kleuren.gedempt} />
            </Pressable>
          ))}
        </View>

        <Label>{wekelijks ? 'Prijs per wandeling' : 'Prijs'}</Label>
        <Blok>
          <Rij label={`Tarief ${u.voornaam}, ${concept.duur} min`} waarde={euro(prijs.tarief)} />
          {prijs.toeslag > 0 ? <Rij label={`Extra hond${gekozenHonden.length > 2 ? 'en' : ''}`} waarde={euro(prijs.toeslag)} /> : null}
          <Rij label="Servicekosten Woober" waarde={euro(prijs.servicekosten)} />
          <Rij label="Totaal" waarde={euro(prijs.totaal)} sterk />
        </Blok>

        <Melding type="info">
          {wekelijks
            ? `${u.voornaam} bevestigt de vaste wandeling. Je betaalt telkens pas na afloop van een wandeling.`
            : methode === 'ideal'
              ? 'Met iDEAL betaal je direct. Annuleer je op tijd, dan krijg je alles terug. Een fooi kan achteraf, die gaat volledig naar de uitlater.'
              : 'We reserveren het bedrag nu en schrijven het pas af na de wandeling. Een fooi kan achteraf, die gaat volledig naar de uitlater.'}
        </Melding>
        <Melding type="goed">
          {u.voornaam} heeft een gecontroleerde identiteit en een aansprakelijkheidsverzekering die schade tijdens het uitlaten dekt.
        </Melding>
        <Text style={s.voorwaarden}>
          Gratis annuleren tot {GRATIS_ANNULEREN_UUR} uur van tevoren, of zolang {u.voornaam} nog niet onderweg is. Daarna krijgt {u.voornaam} {Math.round(ANNULERINGSDEEL * 100)}% van het tarief.
        </Text>

        <Knop titel={wekelijks ? 'Vaste wandeling aanvragen' : 'Aanvraag versturen'} icoon="paw" onPress={verstuur} stijl={{ marginTop: ruimte(4) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), marginBottom: ruimte(5) },
  methodes: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden },
  methode: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingHorizontal: ruimte(4), paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: kleuren.vlak },
  methodeTekst: { flex: 1, fontSize: 16, fontWeight: '600', color: kleuren.tekst },
  voorwaarden: { fontSize: 12, color: kleuren.gedempt, lineHeight: 17, textAlign: 'center', marginTop: ruimte(2) },
});
