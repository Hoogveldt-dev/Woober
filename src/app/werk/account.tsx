import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersoonAvatar } from '../../components/avatars';
import { Blok, gedeeldeStijl, MenuRij, Rij, Sectie, Sterren } from '../../components/blokken';
import { Badge, Knop, Kop } from '../../components/ui';
import { DUREN, euro } from '../../lib/prijs';
import { klaarVoorWerk, useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

export default function UitlaterAccount() {
  const router = useRouter();
  const { gebruiker, mijnProfiel, honden, wisselRol, accountVerwijderen, verdienmodel } = useApp();
  const [bevestig, setBevestig] = useState(false);
  if (!gebruiker || !mijnProfiel) return null;
  const klaar = klaarVoorWerk(mijnProfiel);

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['top']}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud}>
        <Kop>Account</Kop>

        <View style={s.profiel}>
          <PersoonAvatar naam={gebruiker.voornaam} kleur={mijnProfiel.kleur} grootte={64} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.naam}>{gebruiker.voornaam}</Text>
            <Sterren waarde={mijnProfiel.beoordeling} aantal={mijnProfiel.aantalBeoordelingen} />
            {klaar ? <Badge tekst="GEVERIFIEERD" icoon="shield-checkmark" /> : <Badge tekst="VERIFICATIE NODIG" icoon="alert" kleur={kleuren.waarschuwing} />}
          </View>
        </View>

        <Sectie actie={{ titel: 'Wijzigen', onPress: () => router.push('/profiel-uitlater') }}>Mijn tarief</Sectie>
        <Blok>
          {DUREN.map((d) => (
            <Rij key={d} label={`${d} minuten`} waarde={euro(mijnProfiel.tarieven[d])} />
          ))}
          <Rij label="Per extra hond" waarde={euro(mijnProfiel.toeslagExtraHond)} />
          <Rij label="Werkgebied" waarde={`${mijnProfiel.werkgebiedKm} km`} />
          <Rij label="Maximaal" waarde={`${mijnProfiel.maxHonden} honden`} />
        </Blok>

        <Sectie>Account</Sectie>
        <Blok>
          <MenuRij icoon="create" titel="Uitlaatprofiel bewerken" sub="Over jou, tarief, beschikbaarheid" onPress={() => router.push('/profiel-uitlater')} />
          <MenuRij
            icoon="shield-checkmark"
            titel="Verificatie en uitbetaling"
            sub={klaar ? 'Identiteit, verzekering en rekening in orde' : 'Nog niet compleet'}
            onPress={() => router.push('/verificatie')}
          />
          <MenuRij icoon="paw" titel="Mijn eigen hond laten uitlaten" sub={honden.length ? 'Wissel naar eigenaarmodus' : 'Maak een hondenprofiel aan'} onPress={() => wisselRol('eigenaar')} />
          <MenuRij icoon="help-buoy" titel="Veiligheid en hulp" sub="Noodnummers, incidenten, regels" onPress={() => router.push('/veiligheid')} />
          <MenuRij icoon="pricetags" titel="Verdienmodel (demo)" sub={`Nu: ${verdienmodel.naam}`} onPress={() => router.push('/verdienmodel')} />
        </Blok>

        <View style={s.privacy}>
          <Ionicons name="lock-closed" size={16} color={kleuren.gedempt} />
          <Text style={s.privacyTekst}>
            Je locatie wordt alleen gedeeld tijdens een wandeling, en alleen met de eigenaar van die hond. Woober gebruikt je route niet om je te beoordelen.
          </Text>
        </View>

        {!bevestig ? (
          <Knop titel="Account verwijderen" variant="gevaar" icoon="trash" onPress={() => setBevestig(true)} stijl={{ marginTop: ruimte(4) }} />
        ) : (
          <View style={s.bevestig}>
            <Text style={s.bevestigTitel}>Weet je het zeker?</Text>
            <Text style={s.bevestigTekst}>Je account, je uitlaatprofiel, opdrachten en berichten worden definitief verwijderd. Openstaande uitbetalingen worden eerst afgerond.</Text>
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
  privacy: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  privacyTekst: { flex: 1, fontSize: 13, color: kleuren.gedempt, lineHeight: 18 },
  bevestig: { marginTop: ruimte(4), padding: ruimte(4), borderRadius: radius.midden, backgroundColor: kleuren.foutVlak },
  bevestigTitel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  bevestigTekst: { fontSize: 14, color: kleuren.tekst, marginVertical: ruimte(3), lineHeight: 20 },
  versie: { fontSize: 12, color: '#A1A1AA', textAlign: 'center', marginTop: ruimte(6) },
});
