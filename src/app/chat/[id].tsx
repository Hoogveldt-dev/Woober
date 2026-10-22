import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersoonAvatar } from '../../components/avatars';
import { MeldenBlad } from '../../components/MeldenBlad';
import { Melding } from '../../components/ui';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

/** Signalering van afspraken buiten de app. In de echte app gebeurt dit ook op de server. */
const BUITEN_APP = /(tikkie|contant|cash|buiten (de )?app|whatsapp|06[\s-]?\d{4}|iban|overmaken|betaalverzoek|zwart)/i;

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { rol, gesprekken, uitlater, klant, stuurBericht, blokkeer, meld } = useApp();
  const [tekst, setTekst] = useState('');
  const [menu, setMenu] = useState(false);
  const lijst = useRef<FlatList>(null);

  const gesprek = gesprekken.find((g) => g.id === id);
  const berichten = gesprek?.berichten ?? [];

  useEffect(() => {
    const t = setTimeout(() => lijst.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [berichten.length]);

  const u = rol === 'eigenaar' ? uitlater(id ?? '') : undefined;
  const k = rol === 'uitlater' ? klant(id) : undefined;
  const ander = u ?? k;
  if (!ander || !id) return <Redirect href="/" />;
  const kleur: [string, string] = u ? u.kleur : (k?.honden[0].kleur ?? ['#ccc', '#999']);
  const sub = u ? (u.professioneel ? u.bedrijfsnaam : `Uitlater in ${u.wijk}`) : `Eigenaar van ${k?.honden.map((h) => h.naam).join(' en ')}`;

  const signaal = berichten.some((b) => BUITEN_APP.test(b.tekst)) || BUITEN_APP.test(tekst);

  const verstuur = () => {
    if (!tekst.trim()) return;
    stuurBericht(id, rol, tekst);
    setTekst('');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={s.titel}>
              <PersoonAvatar naam={ander.voornaam} kleur={kleur} grootte={34} />
              <View>
                <Text style={s.titelNaam}>{ander.voornaam}</Text>
                <Text style={s.titelSub}>{sub}</Text>
              </View>
            </View>
          ),
          headerRight: () => (
            <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="Melden of blokkeren" style={{ padding: 8 }}>
              <Ionicons name="shield-checkmark" size={24} color={kleuren.primair} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={lijst}
          data={berichten}
          keyExtractor={(b) => b.id}
          contentContainerStyle={s.berichten}
          ListHeaderComponent={
            <View style={s.intro}>
              <Melding type="info">
                {rol === 'eigenaar'
                  ? 'Spreek af en betaal via Woober. Alleen dan is de wandeling verzekerd en kun je een incident melden. Deel sleutelcodes pas na een bevestigde boeking.'
                  : 'Houd afspraken en betalingen in Woober. Zo krijg je zeker je geld en is de wandeling verzekerd.'}
              </Melding>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.bubbel, item.van === 'ik' ? s.bubbelIk : s.bubbelAnder]}>
              <Text style={[s.bubbelTekst, item.van === 'ik' && { color: '#fff' }]}>{item.tekst}</Text>
            </View>
          )}
        />

        {signaal ? (
          <View style={{ paddingHorizontal: ruimte(4) }}>
            <Melding type="waarschuwing">
              Betalen buiten Woober om? Dan ben je niet verzekerd en kunnen we niet helpen bij een probleem. Wordt erom gevraagd? Meld het via het schildje rechtsboven.
            </Melding>
          </View>
        ) : null}

        <SafeAreaView edges={['bottom']} style={s.invoerBalk}>
          <TextInput
            value={tekst}
            onChangeText={setTekst}
            placeholder="Typ een bericht"
            placeholderTextColor="#A1A1AA"
            style={s.invoer}
            onSubmitEditing={verstuur}
            returnKeyType="send"
          />
          <Pressable onPress={verstuur} disabled={!tekst.trim()} accessibilityLabel="Verstuur" style={[s.verstuur, !tekst.trim() && { opacity: 0.4 }]}>
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <MeldenBlad
        zichtbaar={menu}
        onSluit={() => setMenu(false)}
        naam={ander.voornaam}
        rol={rol}
        onMeld={(r) => meld(id, r)}
        onBlokkeer={() => {
          router.back();
          blokkeer(id);
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  titel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titelNaam: { fontSize: 16, fontWeight: '700', color: kleuren.tekst },
  titelSub: { fontSize: 12, color: kleuren.gedempt },
  berichten: { padding: ruimte(4), gap: ruimte(2), width: '100%', maxWidth: 640, alignSelf: 'center' },
  intro: { marginBottom: ruimte(2) },
  bubbel: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbelIk: { alignSelf: 'flex-end', backgroundColor: kleuren.primair, borderBottomRightRadius: 6 },
  bubbelAnder: { alignSelf: 'flex-start', backgroundColor: kleuren.vlak, borderBottomLeftRadius: 6 },
  bubbelTekst: { fontSize: 16, lineHeight: 22, color: kleuren.tekst },
  invoerBalk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruimte(2),
    paddingHorizontal: ruimte(3),
    paddingTop: ruimte(2),
    paddingBottom: ruimte(2),
    borderTopWidth: 1,
    borderTopColor: kleuren.rand,
    backgroundColor: '#fff',
  },
  invoer: { flex: 1, backgroundColor: kleuren.vlak, borderRadius: radius.rond, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: kleuren.tekst },
  verstuur: { width: 42, height: 42, borderRadius: 21, backgroundColor: kleuren.primair, alignItems: 'center', justifyContent: 'center' },
});
