import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HondAvatar, PersoonAvatar } from '../../components/avatars';
import { Blok, gedeeldeStijl, MenuRij, Rij, Sectie } from '../../components/blokken';
import { Chip, Knop, Kop, Melding, Veld } from '../../components/ui';
import { euro } from '../../lib/prijs';
import { leeftijdTekst } from '../../lib/tijd';
import { procent } from '../../lib/verdienmodel';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';
import { useTekst } from '../../state/Teksten';

export default function Account() {
  const router = useRouter();
  const { gebruiker, honden, betaalmethode, zetBetaalmethode, wisselRol, mijnProfiel, accountVerwijderen, uitloggen, modus, beheerder, boekingen, verdienmodel, tegoed, plus, zetPlus, verzilverCode } = useApp();
  const [bevestig, setBevestig] = useState(false);
  const contact = useTekst('contact.email');
  const [code, setCode] = useState('');
  const [codeUitslag, setCodeUitslag] = useState<{ gelukt: boolean; tekst: string } | null>(null);
  if (!gebruiker) return null;
  const uitnodigCode = `WOOBER-${gebruiker.voornaam.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)}`;
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

        {/* Betalen, tegoed en Plus zijn nog nagespeeld; echte accounts zien ze pas als betalen echt werkt */}
        {modus === 'demo' ? (
          <>
          <Sectie>Standaard betaalmethode</Sectie>
          <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(5) }]}>
            <Chip label="iDEAL" actief={betaalmethode === 'ideal'} onPress={() => zetBetaalmethode('ideal')} />
            <Chip label="Apple Pay" icoon="logo-apple" actief={betaalmethode === 'applepay'} onPress={() => zetBetaalmethode('applepay')} />
            <Chip label="Creditcard" icoon="card" actief={betaalmethode === 'kaart'} onPress={() => zetBetaalmethode('kaart')} />
          </View>

          <Sectie>Tegoed en acties</Sectie>
          <Blok>
            <Rij label="Jouw tegoed" waarde={euro(tegoed)} sterk />
            {verdienmodel.uitnodigingstegoed > 0 ? <Rij label="Jouw uitnodigingscode" waarde={uitnodigCode} /> : null}
          </Blok>
          {verdienmodel.uitnodigingstegoed > 0 ? (
            <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(3), marginBottom: ruimte(4) }]}>
              Nodig een buur uit: jullie krijgen allebei {euro(verdienmodel.uitnodigingstegoed)} tegoed zodra je buur de eerste wandeling heeft gemaakt.
            </Text>
          ) : null}
          <Veld
            label="Actiecode"
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setCodeUitslag(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Bijvoorbeeld WOOBER5"
            hulp="Tegoed betaalt Woober; je uitlater krijgt altijd het volledige bedrag. In de demo werken WOOBER5 en BUURT10."
          />
          <Knop
            titel="Code verzilveren"
            variant="secundair"
            icoon="pricetag"
            uitgeschakeld={!code.trim()}
            onPress={() => {
              const uitslag = verzilverCode(code);
              setCodeUitslag(uitslag);
              if (uitslag.gelukt) setCode('');
            }}
            stijl={{ marginBottom: ruimte(3) }}
          />
          {codeUitslag ? <Melding type={codeUitslag.gelukt ? 'goed' : 'fout'}>{codeUitslag.tekst}</Melding> : null}
          <View style={{ height: ruimte(4) }} />

          {verdienmodel.plus.aan ? (
            <View style={s.plus}>
              <View style={s.plusKop}>
                <Ionicons name="star" size={18} color={kleuren.primair} />
                <Text style={s.plusTitel}>{plus ? `Je hebt ${verdienmodel.plus.naam}` : verdienmodel.plus.naam}</Text>
              </View>
              <Text style={s.plusTekst}>
                {verdienmodel.plus.servicekostenKorting >= 1 ? 'Geen servicekosten' : `${procent(verdienmodel.plus.servicekostenKorting)} korting op de servicekosten`} op elke wandeling en
                oppas, voor {euro(verdienmodel.plus.prijsPerMaand)} per maand. Maandelijks opzegbaar. Je uitlater krijgt evenveel.
              </Text>
              <Knop titel={plus ? 'Plus stopzetten' : 'Plus proberen (demo)'} variant={plus ? 'secundair' : 'primair'} icoon={plus ? undefined : 'star'} onPress={() => zetPlus(!plus)} />
            </View>
          ) : null}
          </>
        ) : null}

        <Sectie>Woober</Sectie>
        <Blok>
          <MenuRij
            icoon="bicycle"
            titel="Zelf uitlaten of oppassen"
            sub={mijnProfiel ? 'Wissel naar werkmodus' : 'Maak een profiel en verdien bij'}
            onPress={() => wisselRol('uitlater')}
          />
          <MenuRij icoon="shield-checkmark" titel="Veiligheid en hulp" sub="Noodnummers, verzekering, regels" onPress={() => router.push('/veiligheid')} />
          <MenuRij icoon="mail" titel="Hulp en contact" sub={contact} onPress={() => Linking.openURL(`mailto:${contact}`)} />
          <MenuRij icoon="document-text" titel="Privacy" sub="Privacy- en cookieverklaring" onPress={() => router.push('/privacy')} />
          <MenuRij icoon="reader" titel="Voorwaarden" sub="Gebruiksvoorwaarden" onPress={() => router.push('/voorwaarden')} />
          {beheerder ? <MenuRij icoon="construct" titel="Beheer" sub="Verdienmodel en andere instellingen, alleen voor het team" onPress={() => router.push('/beheer')} /> : null}
        </Blok>

        <View style={s.privacy}>
          <Ionicons name="lock-closed" size={16} color={kleuren.gedempt} />
          <Text style={s.privacyTekst}>
            Uitlaters zien je adres pas na een geaccepteerde boeking. Jouw locatie wordt nooit gedeeld; alleen de uitlater deelt zijn locatie, en alleen tijdens de wandeling.
          </Text>
        </View>

        <Knop titel={modus === 'echt' ? 'Uitloggen' : 'Demo verlaten'} variant="secundair" icoon="log-out-outline" onPress={uitloggen} stijl={{ marginTop: ruimte(4) }} />
        {!bevestig ? (
          <Knop titel="Account verwijderen" variant="gevaar" icoon="trash" onPress={() => setBevestig(true)} stijl={{ marginTop: ruimte(3) }} />
        ) : (
          <View style={s.bevestig}>
            <Text style={s.bevestigTitel}>Weet je het zeker?</Text>
            <Text style={s.bevestigTekst}>Je account, je honden, boekingen en berichten worden definitief verwijderd. Lopende boekingen worden geannuleerd.</Text>
            <Knop titel="Ja, alles verwijderen" variant="gevaar" icoon="trash" onPress={accountVerwijderen} />
            <Knop titel="Annuleren" variant="tekst" stijl={{ marginTop: ruimte(1) }} onPress={() => setBevestig(false)} />
          </View>
        )}
        <Text style={s.versie}>{modus === 'echt' ? `Woober 1.0. Ingelogd als ${gebruiker.email}.` : 'Woober demo. Gegevens worden niet opgeslagen.'}</Text>
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
  plus: { padding: ruimte(4), borderRadius: radius.midden, backgroundColor: kleuren.primairVlak, marginBottom: ruimte(5), gap: ruimte(3) },
  plusKop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  plusTitel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  plusTekst: { fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
});
