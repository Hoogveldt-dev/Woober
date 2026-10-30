import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HondenStapel, PersoonAvatar } from '../components/avatars';
import { Blok, gedeeldeStijl, Rij, Sterren, Vinkje } from '../components/blokken';
import { Chip, Knop, Label, Melding, Veld } from '../components/ui';
import { PrijsRegels } from '../components/PrijsRegels';
import { ANNULERINGSDEEL, euro, GRATIS_ANNULEREN_UUR } from '../lib/prijs';
import { duurTekst, momentTekst, tijdTekst } from '../lib/tijd';
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
  const { concept, uitlater, honden, gebruiker, betaalmethode, vraagAan, prijsVoor, tegoed, saldo } = useApp();
  const u = concept?.uitlaterId ? uitlater(concept.uitlaterId) : undefined;
  const [sleutel, setSleutel] = useState<Sleutel>('thuis');
  const [notitie, setNotitie] = useState('');
  const [methode, setMethode] = useState<Betaalmethode>(betaalmethode);
  const [camera, setCamera] = useState(false);
  const [metSaldo, setMetSaldo] = useState(saldo > 0);
  const [nu] = useState(() => Date.now());

  if (!concept || !u || !gebruiker) return <Redirect href="/" />;

  const gekozenHonden = honden.filter((h) => concept.hondIds.includes(h.id));
  const oppas = concept.dienst === 'oppas';
  // Prijs volgens het actieve verdienmodel; eventueel tegoed gaat er direct af
  const prijs = prijsVoor(u, concept.dienst, concept.duur, gekozenHonden.length, concept.moment, true);
  const wekelijks = concept.moment.type === 'wekelijks';
  const keer = oppas ? 'oppas' : 'wandeling';
  const start = concept.moment.type === 'later' ? concept.moment.tijdstip : concept.moment.type === 'nu' ? nu : null;
  // Eigen saldo als uitlater; bij een vaste afspraak alleen voor de eerste keer, net als tegoed
  const vanSaldo = metSaldo ? Math.min(saldo, prijs.totaal) : 0;
  const rest = prijs.totaal - vanSaldo;

  const verstuur = () => {
    const id = vraagAan({
      dienst: concept.dienst,
      uitlaterId: u.id,
      hondIds: concept.hondIds,
      duur: concept.duur,
      moment: concept.moment,
      sleutel,
      notitie: notitie.trim(),
      betaalmethode: methode,
      cameraInHuis: oppas ? camera : undefined,
      metSaldo: vanSaldo > 0,
    });
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
          <Rij label="Dienst" waarde={oppas ? 'Oppas bij jou thuis' : 'Uitlaten'} />
          <Rij label="Duur" waarde={oppas && start ? `${duurTekst(concept.duur)}, tot ${tijdTekst(start + concept.duur * 60000)}` : duurTekst(concept.duur)} />
          <Rij label="Honden" waarde={gekozenHonden.map((h) => h.naam).join(', ')} />
          <Rij label={oppas ? 'Adres' : 'Ophalen op'} waarde={gebruiker.adres} />
        </Blok>

        <Label>Sleutel en overdracht</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label={oppas ? 'Ik doe zelf open' : 'Ik ben thuis'} icoon="home" actief={sleutel === 'thuis'} onPress={() => setSleutel('thuis')} />
          <Chip label="Sleutelkastje" icoon="key" actief={sleutel === 'kastje'} onPress={() => setSleutel('kastje')} />
          <Chip label={`${u.voornaam} heeft al een sleutel`} actief={sleutel === 'overhandigd'} onPress={() => setSleutel('overhandigd')} />
        </View>
        <Text style={[gedeeldeStijl.hulp, { marginTop: ruimte(2), marginBottom: ruimte(4) }]}>
          {sleutel === 'kastje'
            ? 'Deel de code van het kastje via de chat, pas nadat de boeking is bevestigd.'
            : oppas
              ? 'Bij de deur noem je een code van 4 cijfers. Zo weet je zeker dat de juiste persoon binnenkomt.'
              : 'Bij de deur noem je een ophaalcode van 4 cijfers. Zo weet je zeker dat de juiste persoon je hond meeneemt.'}
        </Text>

        {oppas ? (
          <>
            <Vinkje aan={camera} onPress={() => setCamera((c) => !c)}>
              Er hangen camera&apos;s in huis
            </Vinkje>
            <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(1), marginBottom: ruimte(4) }]}>
              {u.voornaam} ziet dit vooraf. Iemand filmen zonder dat die het weet mag niet.
            </Text>
          </>
        ) : null}

        <Veld
          label={`Bericht voor ${u.voornaam}`}
          value={notitie}
          onChangeText={setNotitie}
          multiline
          maxLength={300}
          placeholder={oppas ? 'Bijv. eten om 20:00, plasrondje rond 21:00, Moos slaapt in de bench' : 'Bijv. tuigje hangt aan de kapstok, graag even langs het losloopgebied'}
        />

        <Label>Betalen</Label>
        {saldo > 0 ? (
          <>
            <Vinkje aan={metSaldo} onPress={() => setMetSaldo((m) => !m)}>
              Betaal met je saldo als uitlater ({euro(saldo)})
            </Vinkje>
            {metSaldo ? (
              <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(1), marginBottom: ruimte(3) }]}>
                {rest > 0
                  ? `${euro(vanSaldo)} van je saldo${wekelijks ? ', alleen bij de eerste keer' : ''}, de rest (${euro(rest)}) met de betaalmethode hieronder.`
                  : `Je saldo dekt alles${wekelijks ? ' voor de eerste keer' : ''}. Annuleer je, dan komt het terug op je saldo.`}{' '}
                {u.voornaam} krijgt evenveel.
              </Text>
            ) : null}
          </>
        ) : null}
        <View style={[s.methodes, { marginBottom: ruimte(5) }, rest === 0 && { opacity: 0.45 }]} pointerEvents={rest === 0 ? 'none' : 'auto'}>
          {METHODES.map((m) => (
            <Pressable key={m.id} onPress={() => setMethode(m.id)} accessibilityRole="radio" accessibilityState={{ selected: methode === m.id }} style={s.methode}>
              <Ionicons name={m.icoon} size={20} color={kleuren.tekst} />
              <Text style={s.methodeTekst}>{m.titel}</Text>
              <Ionicons name={methode === m.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={methode === m.id ? kleuren.primair : kleuren.gedempt} />
            </Pressable>
          ))}
        </View>

        <Label>{wekelijks ? `Prijs per ${keer}` : 'Prijs'}</Label>
        <Blok>
          <PrijsRegels
            prijs={prijs}
            tariefLabel={oppas ? `${u.voornaam}, ${duurTekst(concept.duur)} à ${euro(u.oppasPerUur)} per uur` : `Tarief ${u.voornaam}, ${concept.duur} min`}
            aantalHonden={gekozenHonden.length}
          />
        </Blok>
        {prijs.drukte > 0 ? (
          <Melding type="waarschuwing">
            Het is druk: er is nu meer vraag dan aanbod. Van de drukte-toeslag gaat {euro(prijs.drukteUitlater)} naar {u.voornaam}.
          </Melding>
        ) : null}
        {prijs.korting > 0 ? (
          <Melding type="goed">
            {euro(prijs.korting)} van je tegoed gaat eraf{wekelijks ? ', alleen bij de eerste keer' : ''}. {tegoed > prijs.korting ? ` Je houdt ${euro(tegoed - prijs.korting)} over.` : ' Daarmee is je tegoed op.'}
          </Melding>
        ) : null}

        <Melding type="info">
          {wekelijks
            ? `${u.voornaam} bevestigt de vaste ${keer}. Je betaalt telkens pas na afloop.`
            : rest === 0
              ? `Je betaalt met je saldo. Annuleer je op tijd, dan komt alles terug op je saldo. Een fooi kan achteraf en gaat volledig naar ${u.voornaam}.`
              : methode === 'ideal'
              ? `Met iDEAL betaal je direct. Annuleer je op tijd, dan krijg je alles terug.${oppas ? ' Verleng je, dan betaal je het extra uur achteraf.' : ''} Een fooi kan achteraf en gaat volledig naar ${u.voornaam}.`
              : `We reserveren het bedrag nu en schrijven het pas af na afloop.${oppas ? ' Verleng je, dan komt het extra uur erbij.' : ''} Een fooi kan achteraf en gaat volledig naar ${u.voornaam}.`}
        </Melding>
        <Melding type="goed">
          {oppas
            ? `${u.voornaam} heeft een gecontroleerde identiteit en een aansprakelijkheidsverzekering die ook schade in huis dekt.`
            : `${u.voornaam} heeft een gecontroleerde identiteit en een aansprakelijkheidsverzekering die schade tijdens het uitlaten dekt.`}
        </Melding>
        <Text style={s.voorwaarden}>
          Gratis annuleren tot {GRATIS_ANNULEREN_UUR} uur van tevoren, of zolang {u.voornaam} nog niet onderweg is. Daarna krijgt {u.voornaam} {Math.round(ANNULERINGSDEEL * 100)}% van het tarief.
        </Text>

        <Knop titel={wekelijks ? `Vaste ${keer} aanvragen` : oppas ? 'Oppas aanvragen' : 'Aanvraag versturen'} icoon="paw" onPress={verstuur} stijl={{ marginTop: ruimte(4) }} />
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
