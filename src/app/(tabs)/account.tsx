import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HondAvatar, PersoonAvatar } from '../../components/avatars';
import { Blok, gedeeldeStijl, MenuRij, Rij, Sectie } from '../../components/blokken';
import { Chip, Knop, Kop } from '../../components/ui';
import { leeftijdTekst } from '../../lib/tijd';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

export default function Account() {
  const router = useRouter();
  const { gebruiker, honden, betaalmethode, zetBetaalmethode, wisselRol, mijnProfiel, accountVerwijderen, boekingen } = useApp();
  const [bevestig, setBevestig] = useState(false);
  if (!gebruiker) return null;
  const aantal = boekingen.filter((b) => b.mijnRol === 'eigenaar' && b.status === 'afgerond' && b.soort === 'betaald').length;

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['top']}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud}>
        <Kop>Account</Kop>

        <View style={s.profiel}>
          <PersoonAvatar naam={gebruiker.voornaam} kleur={['#FFB199', '#FF5A5F']} grootte={64} />
          <View style={{ flex: 1 }}>
            <Text style={s.naam}>{gebruiker.voornaam}</Text>
            <Text style={gedeeldeStijl.sub}>
              {gebruiker.plaats}, {aantal} wandelingen
            </Text>
          </View>
        </View>

        <Sectie actie={{ titel: 'Toevoegen', onPress: () => router.push({ pathname: '/hond/[id]', params: { id: 'nieuw' } }) }}>Mijn honden</Sectie>
        <Blok>
          {honden.map((h) => (
            <Pressable key={h.id} onPress={() => router.push({ pathname: '/hond/[id]', params: { id: h.id } })} style={({ pressed }) => [s.hond, pressed && { backgroundColor: kleuren.vlak }]}>
              <HondAvatar hond={h} grootte={44} />
              <View style={{ flex: 1 }}>
                <Text style={s.hondNaam}>{h.naam}</Text>
                <Text style={s.hondSub}>
                  {h.ras}, {leeftijdTekst(h.geboortedatum)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={kleuren.gedempt} />
            </Pressable>
          ))}
        </Blok>

        <Sectie>Gegevens</Sectie>
        <Blok>
          <Rij label="E-mail" waarde={gebruiker.email} />
          <Rij label="Ophaaladres" waarde={gebruiker.adres} />
          <Rij label="Postcode" waarde={`${gebruiker.postcode} ${gebruiker.plaats}`} />
        </Blok>

        <Sectie>Standaard betaalmethode</Sectie>
        <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(5) }]}>
          <Chip label="iDEAL" actief={betaalmethode === 'ideal'} onPress={() => zetBetaalmethode('ideal')} />
          <Chip label="Apple Pay" icoon="logo-apple" actief={betaalmethode === 'applepay'} onPress={() => zetBetaalmethode('applepay')} />
          <Chip label="Creditcard" icoon="card" actief={betaalmethode === 'kaart'} onPress={() => zetBetaalmethode('kaart')} />
        </View>

        <Sectie>Woober</Sectie>
        <Blok>
          <MenuRij
            icoon="bicycle"
            titel="Zelf uitlaten of oppassen"
            sub={mijnProfiel ? 'Wissel naar werkmodus' : 'Maak een profiel en verdien bij'}
            onPress={() => wisselRol('uitlater')}
          />
          <MenuRij icoon="shield-checkmark" titel="Veiligheid en hulp" sub="Noodnummers, verzekering, regels" onPress={() => router.push('/veiligheid')} />
          <MenuRij icoon="document-text" titel="Voorwaarden en privacy" sub="Volgt in de echte app" onPress={() => {}} />
        </Blok>

        <View style={s.privacy}>
          <Ionicons name="lock-closed" size={16} color={kleuren.gedempt} />
          <Text style={s.privacyTekst}>
            Uitlaters zien je adres pas na een geaccepteerde boeking. Jouw locatie wordt nooit gedeeld; alleen de uitlater deelt zijn locatie, en alleen tijdens de wandeling.
          </Text>
        </View>

        {!bevestig ? (
          <Knop titel="Account verwijderen" variant="gevaar" icoon="trash" onPress={() => setBevestig(true)} stijl={{ marginTop: ruimte(4) }} />
        ) : (
          <View style={s.bevestig}>
            <Text style={s.bevestigTitel}>Weet je het zeker?</Text>
            <Text style={s.bevestigTekst}>Je account, je honden, boekingen en berichten worden definitief verwijderd. Lopende boekingen worden geannuleerd.</Text>
            <Knop titel="Ja, alles verwijderen" variant="gevaar" icoon="trash" onPress={accountVerwijderen} />
            <Knop titel="Annuleren" variant="tekst" stijl={{ marginTop: ruimte(1) }} onPress={() => setBevestig(false)} />
          </View>
        )}
        <Text style={s.versie}>Woober prototype 0.1. Gegevens worden niet opgeslagen.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  profiel: { flexDirection: 'row', alignItems: 'center', gap: ruimte(4), padding: ruimte(4), borderRadius: radius.groot, backgroundColor: kleuren.vlak, marginTop: ruimte(4), marginBottom: ruimte(4) },
  naam: { fontSize: 22, fontWeight: '800', color: kleuren.tekst },
  hond: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingHorizontal: ruimte(4), paddingVertical: ruimte(3), borderBottomWidth: 1, borderBottomColor: kleuren.vlak },
  hondNaam: { fontSize: 16, fontWeight: '700', color: kleuren.tekst },
  hondSub: { fontSize: 13, color: kleuren.gedempt, marginTop: 1 },
  privacy: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  privacyTekst: { flex: 1, fontSize: 13, color: kleuren.gedempt, lineHeight: 18 },
  bevestig: { marginTop: ruimte(4), padding: ruimte(4), borderRadius: radius.midden, backgroundColor: kleuren.foutVlak },
  bevestigTitel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  bevestigTekst: { fontSize: 14, color: kleuren.tekst, marginVertical: ruimte(3), lineHeight: 20 },
  versie: { fontSize: 12, color: '#A1A1AA', textAlign: 'center', marginTop: ruimte(6) },
});
