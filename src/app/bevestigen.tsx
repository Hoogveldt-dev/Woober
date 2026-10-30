import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HondenStapel, PersoonAvatar } from '../components/avatars';
import { Blok, gedeeldeStijl, Rij, Sterren, Vinkje } from '../components/blokken';
import { OppasHuisInfo } from '../components/Huis';
import { Chip, Knop, Label, Melding, Veld } from '../components/ui';
import { PrijsRegels } from '../components/PrijsRegels';
import { afgiftePunten, VOORZIENINGEN } from '../lib/huis';
import { ANNULERINGSDEEL, euro, GRATIS_ANNULEREN_UUR, METHODE_NAAM } from '../lib/prijs';
import { duurTekst, momentTekst, tijdTekst } from '../lib/tijd';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Betaalmethode, Plek, Sleutel, Voorziening } from '../types';

const METHODES: { id: Betaalmethode; titel: string; icoon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'ideal', titel: 'iDEAL | Wero', icoon: 'business' },
  { id: 'applepay', titel: 'Apple Pay', icoon: 'logo-apple' },
  { id: 'kaart', titel: 'Creditcard', icoon: 'card' },
];

export default function Bevestigen() {
  const router = useRouter();
  const { concept, uitlater, honden, gebruiker, betaalmethode, vraagAan, prijsVoor, tegoed, saldo, boekingen, plekken } = useApp();
  const u = concept?.uitlaterId ? uitlater(concept.uitlaterId) : undefined;
  const [sleutel, setSleutel] = useState<Sleutel>('thuis');
  const [notitie, setNotitie] = useState('');
  const [methode, setMethode] = useState<Betaalmethode>(betaalmethode);
  // Afspraken over het huis: standaard die van je vorige oppas bij jou thuis
  const [huis, setHuis] = useState(
    () => boekingen.filter((x) => x.mijnRol === 'eigenaar' && x.huisinfo).at(-1)?.huisinfo ?? { camera: false, cameraWaar: '', voorzieningen: [] as Voorziening[], huisregels: '' },
  );
  const [afgiftePlek, setAfgiftePlek] = useState<Plek | null>(null);
  const [afgifteDetail, setAfgifteDetail] = useState('');
  const [metSaldo, setMetSaldo] = useState(saldo > 0);
  const [nu] = useState(() => Date.now());

  if (!concept || !u || !gebruiker) return <Redirect href="/" />;

  const gekozenHonden = honden.filter((h) => concept.hondIds.includes(h.id));
  const oppas = concept.dienst === 'oppas';
  const bijOppas = oppas && concept.oppasPlek === 'bij_oppas';
  const hondNamen = gekozenHonden.map((h) => h.naam).join(' en ');
  const afgifte = !oppas && afgiftePlek ? { omschrijving: [afgiftePlek.naam, afgifteDetail.trim()].filter(Boolean).join(', '), punt: afgiftePlek.punt } : undefined;
  const zetHuis = (deel: Partial<typeof huis>) => setHuis((h) => ({ ...h, ...deel }));
  const wisselVoorziening = (v: Voorziening) =>
    zetHuis({ voorzieningen: huis.voorzieningen.includes(v) ? huis.voorzieningen.filter((x) => x !== v) : [...huis.voorzieningen, v] });
  const cameraOnduidelijk = oppas && !bijOppas && huis.camera && huis.cameraWaar.trim().length < 3;
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
      oppasPlek: oppas ? (concept.oppasPlek ?? 'bij_eigenaar') : undefined,
      huisinfo: oppas && !bijOppas ? { ...huis, cameraWaar: huis.camera ? huis.cameraWaar.trim() : '', huisregels: huis.huisregels.trim() } : undefined,
      afgifte,
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
          <Rij label="Dienst" waarde={oppas ? (bijOppas ? `Oppas bij ${u.voornaam} thuis` : 'Oppas bij jou thuis') : 'Uitlaten'} />
          <Rij label="Duur" waarde={oppas && start ? `${duurTekst(concept.duur)}, tot ${tijdTekst(start + concept.duur * 60000)}` : duurTekst(concept.duur)} />
          <Rij label="Honden" waarde={gekozenHonden.map((h) => h.naam).join(', ')} />
          <Rij label={oppas ? 'Adres' : 'Afgeven'} waarde={bijOppas ? `${u.wijk}, het adres zie je na accepteren` : (afgifte?.omschrijving ?? gebruiker.adres)} />
        </Blok>

        {bijOppas ? (
          <>
            <Label>{`Bij ${u.voornaam} thuis`}</Label>
            {u.huis ? <OppasHuisInfo huis={u.huis} /> : null}
            <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(4) }]}>
              Je brengt {hondNamen} zelf en noemt bij de deur een code van 4 cijfers. Het adres zie je zodra {u.voornaam} je verzoek accepteert.
            </Text>
          </>
        ) : null}

        {!oppas ? (
          <>
            <Label>{`Waar geef je ${hondNamen} mee?`}</Label>
            <View style={gedeeldeStijl.rij}>
              <Chip label="Thuis" icoon="home" actief={!afgiftePlek} onPress={() => setAfgiftePlek(null)} />
              {afgiftePunten(plekken, gebruiker.thuis).map((p) => (
                <Chip key={p.id} label={p.naam} icoon="location" actief={afgiftePlek?.id === p.id} onPress={() => setAfgiftePlek(p)} />
              ))}
            </View>
            {afgiftePlek ? (
              <View style={{ marginTop: ruimte(3) }}>
                <Veld label="Waar precies?" value={afgifteDetail} onChangeText={setAfgifteDetail} maxLength={80} placeholder="Bijvoorbeeld bij het hek of het bankje" />
                <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(2), marginBottom: ruimte(4) }]}>
                  {u.voornaam} ziet je adres dan niet. Je geeft {hondNamen} daar zelf mee met de ophaalcode, en haalt {gekozenHonden.length > 1 ? 'ze' : 'hem'} daar na afloop weer op.
                </Text>
              </View>
            ) : (
              <View style={{ height: ruimte(4) }} />
            )}
          </>
        ) : null}

        {!bijOppas && !afgiftePlek ? (
          <>
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
          </>
        ) : null}

        {oppas && !bijOppas ? (
          <>
            <Label>Jouw huis</Label>
            <Vinkje aan={huis.camera} onPress={() => zetHuis({ camera: !huis.camera })}>
              Er hangen camera&apos;s in huis
            </Vinkje>
            {huis.camera ? (
              <Veld
                label="Waar hangen ze, en nemen ze ook geluid op?"
                value={huis.cameraWaar}
                onChangeText={(t) => zetHuis({ cameraWaar: t })}
                maxLength={200}
                placeholder="Bijv. woonkamer, alleen beeld"
                fout={cameraOnduidelijk && huis.cameraWaar.length > 0 ? 'Vertel waar de camera’s hangen.' : null}
              />
            ) : null}
            <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(1), marginBottom: ruimte(3) }]}>
              Iemand filmen of opnemen zonder dat die het weet mag niet. {u.voornaam} ziet dit al bij je verzoek.
            </Text>
            <Text style={s.vraag}>Wat mag {u.voornaam} gebruiken?</Text>
            <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(3) }]}>
              {(Object.keys(VOORZIENINGEN) as Voorziening[]).map((v) => (
                <Chip key={v} label={VOORZIENINGEN[v]} actief={huis.voorzieningen.includes(v)} onPress={() => wisselVoorziening(v)} />
              ))}
            </View>
            <Veld
              label="Wat is privé, en andere huisregels"
              value={huis.huisregels}
              onChangeText={(t) => zetHuis({ huisregels: t })}
              multiline
              maxLength={300}
              placeholder="Bijvoorbeeld: boven is privé, niet roken, geen bezoek"
            />
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
            ? `${u.voornaam} bevestigt de vaste ${keer}. Je betaalt elke keer vooraf; het geld gaat pas naar ${u.voornaam} als de ${keer} is geweest.`
            : rest === 0
              ? `Je betaalt met je saldo. Annuleer je op tijd, dan komt alles terug op je saldo. Een fooi kan achteraf en gaat volledig naar ${u.voornaam}.`
              : `Je betaalt nu met ${METHODE_NAAM[methode]}. Annuleer je op tijd, dan krijg je alles terug.${oppas ? ' Verleng je, dan betaal je het extra uur meteen in de app.' : ''} Een fooi kan achteraf en gaat volledig naar ${u.voornaam}.`}
        </Melding>
        <Melding type="goed">
          {bijOppas
            ? `${u.voornaam} heeft een gecontroleerde identiteit en een aansprakelijkheidsverzekering.`
            : oppas
            ? `${u.voornaam} heeft een gecontroleerde identiteit en een aansprakelijkheidsverzekering die ook schade in huis dekt.`
            : `${u.voornaam} heeft een gecontroleerde identiteit en een aansprakelijkheidsverzekering die schade tijdens het uitlaten dekt.`}
        </Melding>
        <Text style={s.voorwaarden}>
          Gratis annuleren tot {GRATIS_ANNULEREN_UUR} uur van tevoren, of zolang {u.voornaam} nog niet onderweg is. Daarna krijgt {u.voornaam} {Math.round(ANNULERINGSDEEL * 100)}% van het tarief.
        </Text>

        {oppas ? (
          <Text style={[s.voorwaarden, { marginTop: ruimte(3) }]}>Spreek na het accepteren in de chat af wat je verder belangrijk vindt, zoals eten, wandelen en wat er in huis mag.</Text>
        ) : null}
        <Knop
          titel={wekelijks ? `Vaste ${keer} aanvragen` : oppas ? 'Oppas aanvragen' : 'Aanvraag versturen'}
          icoon="paw"
          uitgeschakeld={cameraOnduidelijk}
          onPress={verstuur}
          stijl={{ marginTop: ruimte(4) }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), marginBottom: ruimte(5) },
  methodes: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden },
  methode: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingHorizontal: ruimte(4), paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: kleuren.vlak },
  methodeTekst: { flex: 1, fontSize: 16, fontWeight: '600', color: kleuren.tekst },
  vraag: { fontSize: 14, fontWeight: '700', color: kleuren.tekst, marginBottom: ruimte(2) },
  voorwaarden: { fontSize: 12, color: kleuren.gedempt, lineHeight: 17, textAlign: 'center', marginTop: ruimte(2) },
});
