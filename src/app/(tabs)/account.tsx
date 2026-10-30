import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountOnderaan, WooberRijen } from '../../components/AccountOnderaan';
import { HondAvatar, PersoonAvatar } from '../../components/avatars';
import { Blok, gedeeldeStijl, Rij, Sectie } from '../../components/blokken';
import { RolWissel } from '../../components/RolWissel';
import { Chip, Knop, Kop, Melding, Veld } from '../../components/ui';
import { euro } from '../../lib/prijs';
import { leeftijdTekst } from '../../lib/tijd';
import { procent } from '../../lib/verdienmodel';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

export default function Account() {
  const router = useRouter();
  const { gebruiker, honden, betaalmethode, zetBetaalmethode, saldo, modus, boekingen, verdienmodel, tegoed, plus, zetPlus, verzilverCode } = useApp();
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

        <RolWissel />

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
            <Chip label="iDEAL | Wero" actief={betaalmethode === 'ideal'} onPress={() => zetBetaalmethode('ideal')} />
            <Chip label="Apple Pay" icoon="logo-apple" actief={betaalmethode === 'applepay'} onPress={() => zetBetaalmethode('applepay')} />
            <Chip label="Creditcard" icoon="card" actief={betaalmethode === 'kaart'} onPress={() => zetBetaalmethode('kaart')} />
          </View>

          <Sectie>Tegoed en acties</Sectie>
          <Blok>
            <Rij label="Jouw tegoed" waarde={euro(tegoed)} sterk />
            {saldo > 0 ? <Rij label="Saldo uit uitlaten" waarde={euro(saldo)} /> : null}
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
          <WooberRijen />
        </Blok>

        <AccountOnderaan
          privacy="Uitlaters zien je adres pas na een geaccepteerde boeking, en niet als je je hond op een ander punt afgeeft. Jouw locatie wordt nooit gedeeld; alleen de uitlater deelt zijn locatie, en alleen tijdens de wandeling."
          verwijderen="Je account, je honden, boekingen en berichten worden definitief verwijderd. Lopende boekingen worden geannuleerd."
        />
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
  plus: { padding: ruimte(4), borderRadius: radius.midden, backgroundColor: kleuren.primairVlak, marginBottom: ruimte(5), gap: ruimte(3) },
  plusKop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  plusTitel: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  plusTekst: { fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
});
