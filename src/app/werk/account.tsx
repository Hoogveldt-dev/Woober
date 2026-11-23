import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountOnderaan, WooberRijen } from '../../components/AccountOnderaan';
import { PersoonAvatar } from '../../components/avatars';
import { Blok, gedeeldeStijl, MenuRij, Rij, Sectie, Sterren } from '../../components/blokken';
import { RolWissel } from '../../components/RolWissel';
import { Badge, Kop } from '../../components/ui';
import { DUREN, euro } from '../../lib/prijs';
import { klaarVoorWerk, useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

export default function UitlaterAccount() {
  const router = useRouter();
  const { gebruiker, mijnProfiel, saldo } = useApp();
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

        <RolWissel />

        <Blok>
          <MenuRij icoon="wallet" titel={`Saldo ${euro(saldo)}`} sub="Verdiensten, uitbetalen wanneer je wilt" onPress={() => router.push('/saldo')} />
        </Blok>

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
            sub={klaar ? 'Identiteit en rekening in orde' : 'Nog niet compleet'}
            onPress={() => router.push('/verificatie')}
          />
          <WooberRijen />
        </Blok>

        <AccountOnderaan
          privacy="Je locatie wordt alleen gedeeld tijdens een wandeling, en alleen met de eigenaar van die hond. Woober gebruikt je route niet om je te beoordelen."
          verwijderen="Je account, je uitlaatprofiel, opdrachten en berichten worden definitief verwijderd. Openstaande uitbetalingen worden eerst afgerond."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  profiel: { flexDirection: 'row', alignItems: 'center', gap: ruimte(4), padding: ruimte(4), borderRadius: radius.groot, backgroundColor: kleuren.vlak, marginTop: ruimte(4), marginBottom: ruimte(4) },
  naam: { fontSize: 22, fontWeight: '800', color: kleuren.tekst },
});
