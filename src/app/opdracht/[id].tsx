import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HondenStapel } from '../../components/avatars';
import { ActieKnop, Blad, RondeKnop, Sterren, SterrenKiezer, Tegel, useNu } from '../../components/blokken';
import { IncidentBlad } from '../../components/IncidentBlad';
import { Kaart } from '../../components/Kaart';
import { Chip, Knop, Melding } from '../../components/ui';
import { WandelFeed } from '../../components/WandelFeed';
import { REVIEW_TAGS_EIGENAAR } from '../../data/uitlaters';
import { boekingOpKaart } from '../../lib/kaartLagen';
import { euro } from '../../lib/prijs';
import { deelPad, formatAfstand, lengte } from '../../lib/route';
import { resterendeRitMin, ritVoortgang, verstrekenMin, wandelVoortgang } from '../../lib/simulatie';
import { duurTekst, leeftijdTekst, momentTekst, tijdTekst } from '../../lib/tijd';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

const SLEUTEL = { thuis: 'Eigenaar is thuis', kastje: 'Sleutelkastje, code via de chat', overhandigd: 'Je hebt een sleutel' } as const;
const GROOTTE = { klein: 'klein', middel: 'middelgroot', groot: 'groot' } as const;

export default function Opdracht() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nu = useNu(300);
  const { boekingen, mijnProfiel, klant, accepteer, weiger, annuleer, startNu, ikBenEr, startWandeling, voegToe, beeindig, versnel, rondKennismakingAf, beoordeel } = useApp();
  const [bladHoogte, setBladHoogte] = useState(360);
  const [code, setCode] = useState('');
  const [codeFout, setCodeFout] = useState(false);
  const [notitie, setNotitie] = useState<string | null>(null);
  const [incident, setIncident] = useState(false);
  const [bevestigEinde, setBevestigEinde] = useState(false);
  const [sterren, setSterren] = useState(0);
  const [tags, setTags] = useState<string[]>([]);

  const b = boekingen.find((x) => x.id === id);
  const k = b ? klant(b.klantId) : undefined;
  if (!b || !k || !mijnProfiel) return <Redirect href="/werk" />;

  const honden = k.honden;
  const hondNamen = honden.map((h) => h.naam).join(' en ');
  const kennismaking = b.soort === 'kennismaking';
  const oppas = b.dienst === 'oppas';
  const laag = boekingOpKaart(b, nu, mijnProfiel, honden[0].kleur, { ophaalSoort: 'klant', uitlaterAlsIk: true, toonPlan: true });
  const terug = () => (router.canGoBack() ? router.back() : router.replace('/werk'));
  const chat = () => router.push({ pathname: '/chat/[id]', params: { id: k.id } });

  const hondInfo = (
    <View style={s.hondInfo}>
      <HondenStapel honden={honden} grootte={48} />
      <View style={{ flex: 1 }}>
        <Text style={s.hondNaam}>{hondNamen}</Text>
        <Text style={s.hondSub}>
          {honden[0].ras}, {leeftijdTekst(honden[0].geboortedatum)}, {GROOTTE[honden[0].grootte]}, {honden[0].aanlijnen === 'altijd' ? 'altijd aan de lijn' : 'mag los in losloopgebied'}
        </Text>
      </View>
      <Pressable onPress={chat} accessibilityRole="button" accessibilityLabel={`Bericht aan ${k.voornaam}`} style={s.rondIcoon}>
        <Ionicons name="chatbubble" size={20} color={kleuren.tekst} />
      </Pressable>
    </View>
  );

  let inhoud = null;
  switch (b.status) {
    case 'aangevraagd':
      inhoud = (
        <>
          <Text style={s.titel}>Verzoek van {k.voornaam}</Text>
          <Text style={s.sub}>{momentTekst(b.moment, nu)}</Text>
          {hondInfo}
          <View style={s.knoppen}>
            <Knop titel="Weigeren" variant="secundair" stijl={{ flex: 1 }} onPress={() => { weiger(b.id); terug(); }} />
            <Knop titel="Accepteren" icoon="checkmark" stijl={{ flex: 1.5 }} onPress={() => accepteer(b.id)} />
          </View>
        </>
      );
      break;
    case 'gepland':
      inhoud = (
        <>
          <Text style={s.titel}>
            {kennismaking ? 'Kennismaking' : oppas ? `Oppas ${duurTekst(b.duur)}` : 'Wandeling'} {momentTekst(b.moment, nu)}
          </Text>
          <Text style={s.sub}>
            {k.voornaam}, {b.adres}
          </Text>
          {hondInfo}
          <View style={s.detail}>
            <Ionicons name={b.sleutel === 'kastje' ? 'key' : 'home'} size={16} color={kleuren.gedempt} />
            <Text style={s.detailTekst}>{SLEUTEL[b.sleutel]}</Text>
          </View>
          {kennismaking ? (
            <Knop titel="Kennismaking gehad (demo)" icoon="checkmark" variant="secundair" onPress={() => rondKennismakingAf(b.id)} />
          ) : (
            <Knop titel="Nu vertrekken (demo)" icoon="bicycle" variant="secundair" onPress={() => startNu(b.id)} />
          )}
          <Knop titel="Afzeggen" variant="tekst" onPress={() => { annuleer(b.id); terug(); }} />
          <Text style={s.klein}>Afzeggen heeft geen gevolgen voor je account. Laat het {k.voornaam} wel zo snel mogelijk weten.</Text>
        </>
      );
      break;
    case 'onderweg': {
      const aangekomen = ritVoortgang(b, mijnProfiel.vervoer, nu) >= 1;
      const min = Math.max(1, Math.round(resterendeRitMin(b, mijnProfiel.vervoer, nu)));
      inhoud = (
        <>
          <View style={s.etaRij}>
            <View style={{ flex: 1 }}>
              <Text style={s.titel}>{aangekomen ? `Je bent bij ${k.voornaam}` : `Onderweg naar ${k.voornaam}`}</Text>
              <Text style={s.sub}>{b.adres}</Text>
            </View>
            {!aangekomen ? (
              <View style={s.eta}>
                <Text style={s.etaGetal}>{min}</Text>
                <Text style={s.etaEenheid}>min</Text>
              </View>
            ) : null}
          </View>
          {hondInfo}
          {b.notitie ? <Melding type="info">{b.notitie}</Melding> : null}
          <Knop titel="Ik ben er" icoon="location" uitgeschakeld={!aangekomen} onPress={() => ikBenEr(b.id)} />
          {!aangekomen ? <Knop titel="Sneller (demo)" icoon="play-forward" variant="tekst" onPress={() => versnel(b.id)} /> : null}
        </>
      );
      break;
    }
    case 'aangekomen':
      inhoud = kennismaking ? (
        <>
          <Text style={s.titel}>Kennismaken met {hondNamen}</Text>
          <Text style={s.sub}>Bespreek gedrag onderweg, sleutels en noodcontacten.</Text>
          {hondInfo}
          <Knop titel="Kennismaking afronden" icoon="checkmark" onPress={() => beeindig(b.id)} />
        </>
      ) : (
        <>
          <Text style={s.titel}>Vraag {k.voornaam} om de code</Text>
          <Text style={s.sub}>
            {oppas
              ? `Zo weet ${k.voornaam} zeker dat de juiste persoon binnenkomt. Vraag ook naar eten, riem en huisregels.`
              : `Zo weet ${k.voornaam} zeker dat de juiste persoon ${hondNamen} meeneemt.`}
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/\D/g, '').slice(0, 4));
              setCodeFout(false);
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={kleuren.rand}
            style={[s.codeInvoer, codeFout && { borderColor: kleuren.nope }]}
            accessibilityLabel="Ophaalcode"
          />
          {codeFout ? <Text style={s.fout}>Deze code klopt niet. Vraag het nog een keer.</Text> : null}
          <Text style={s.klein}>Demo: {k.voornaam} zegt {b.ophaalcode}</Text>
          <Knop
            titel={oppas ? 'Start oppas' : 'Start wandeling'}
            icoon="walk"
            uitgeschakeld={code.length !== 4}
            stijl={{ marginTop: ruimte(3) }}
            onPress={() => {
              if (!startWandeling(b.id, code)) setCodeFout(true);
            }}
          />
        </>
      );
      break;
    case 'bezig': {
      const v = wandelVoortgang(b, nu);
      const min = Math.floor(verstrekenMin(b, nu));
      const gelopen = lengte(deelPad(b.wandelroute, v));
      const resterend = Math.max(0, b.duur - min);
      if (oppas) {
        const eind = (b.gestart ?? nu) + b.duur * 60000;
        inhoud = (
          <>
            <View style={s.etaRij}>
              <View style={{ flex: 1 }}>
                <Text style={s.titel}>Oppassen op {hondNamen}</Text>
                <Text style={s.sub}>{resterend > 0 ? `Tot ${tijdTekst(eind)}, nog ${duurTekst(resterend)}` : `${k.voornaam} kan elk moment thuiskomen`}</Text>
              </View>
              <View style={s.eta}>
                <Text style={s.etaGetal}>
                  {Math.floor(min / 60)}:{String(min % 60).padStart(2, '0')}
                </Text>
                <Text style={s.etaEenheid}>uur</Text>
              </View>
            </View>
            <View style={[s.acties, { marginTop: ruimte(3) }]}>
              <ActieKnop icoon="camera" titel="Foto" kleur={kleuren.primair} onPress={() => voegToe(b.id, 'foto', `${hondNamen} heeft het naar de zin`)} />
              <ActieKnop icoon="food-drumstick" titel="Eten" kleur="#E8783C" onPress={() => voegToe(b.id, 'eten')} />
              <ActieKnop icoon="water" titel="Plas" kleur="#E2B714" onPress={() => voegToe(b.id, 'plas')} />
              <ActieKnop icoon="sleep" titel="Slaapt" kleur="#6A7FDB" onPress={() => voegToe(b.id, 'slapen')} />
              <ActieKnop icoon="note-text" titel="Notitie" onPress={() => setNotitie('')} />
            </View>
            {notitie !== null ? (
              <View style={s.notitieRij}>
                <TextInput value={notitie} onChangeText={setNotitie} placeholder="Bijv. blafte even bij de deurbel" placeholderTextColor="#A1A1AA" style={s.notitieInvoer} autoFocus />
                <Pressable
                  onPress={() => {
                    if (notitie.trim()) voegToe(b.id, 'notitie', notitie.trim());
                    setNotitie(null);
                  }}
                  style={s.notitieKnop}
                  accessibilityLabel="Notitie toevoegen"
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            ) : null}
            <ScrollView style={{ maxHeight: 120 }}>
              <WandelFeed gebeurtenissen={b.gebeurtenissen} compact start={b.gestart} duur={b.basisDuur ?? b.duur} oppas={b.dienst === 'oppas'} />
            </ScrollView>
            {bevestigEinde ? (
              <View style={s.bevestig}>
                <Text style={s.bevestigTekst}>Is {k.voornaam} weer thuis? De geboekte tijd wordt betaald, ook als het eerder klaar is.</Text>
                <Knop titel="Ja, oppas afronden" onPress={() => beeindig(b.id)} />
                <Knop titel="Nog niet" variant="tekst" onPress={() => setBevestigEinde(false)} />
              </View>
            ) : (
              <Knop titel={`${k.voornaam} is thuis`} icoon="home" stijl={{ marginTop: ruimte(3) }} onPress={() => setBevestigEinde(true)} />
            )}
            <View style={s.tekstKnoppen}>
              <Knop titel="Incident melden" variant="tekst" icoon="alert-circle" tekstKleur={kleuren.nope} onPress={() => setIncident(true)} />
              <Knop titel="Half uur verder (demo)" icoon="play-forward" variant="tekst" onPress={() => versnel(b.id)} />
            </View>
          </>
        );
        break;
      }
      inhoud = (
        <>
          <View style={s.etaRij}>
            <View style={{ flex: 1 }}>
              <Text style={s.titel}>Wandelen met {hondNamen}</Text>
              <Text style={s.sub}>{resterend > 0 ? `Nog ${resterend} min van de ${b.duur}` : 'Tijd om terug te gaan'}</Text>
            </View>
            <View style={s.eta}>
              <Text style={s.etaGetal}>{min}</Text>
              <Text style={s.etaEenheid}>min</Text>
            </View>
          </View>
          <View style={s.tegels}>
            <Tegel waarde={formatAfstand(gelopen)} label="gelopen" />
            <Tegel waarde={String(b.gebeurtenissen.filter((g) => g.soort === 'foto').length)} label="foto's" />
          </View>
          <View style={s.acties}>
            <ActieKnop icoon="camera" titel="Foto" kleur={kleuren.primair} onPress={() => voegToe(b.id, 'foto', `${hondNamen} onderweg`)} />
            <ActieKnop icoon="water" titel="Plas" kleur="#E2B714" onPress={() => voegToe(b.id, 'plas')} />
            <ActieKnop icoon="emoticon-poop" titel="Poep" kleur="#8B5E3C" onPress={() => voegToe(b.id, 'poep')} />
            <ActieKnop icoon="cup-water" titel="Water" kleur={kleuren.info} onPress={() => voegToe(b.id, 'water')} />
            <ActieKnop icoon="note-text" titel="Notitie" onPress={() => setNotitie('')} />
          </View>
          {notitie !== null ? (
            <View style={s.notitieRij}>
              <TextInput value={notitie} onChangeText={setNotitie} placeholder="Bijv. speelde met een andere hond" placeholderTextColor="#A1A1AA" style={s.notitieInvoer} autoFocus />
              <Pressable
                onPress={() => {
                  if (notitie.trim()) voegToe(b.id, 'notitie', notitie.trim());
                  setNotitie(null);
                }}
                style={s.notitieKnop}
                accessibilityLabel="Notitie toevoegen"
              >
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          ) : null}
          <ScrollView style={{ maxHeight: 120 }}>
            <WandelFeed gebeurtenissen={b.gebeurtenissen} compact start={b.gestart} duur={b.basisDuur ?? b.duur} oppas={b.dienst === 'oppas'} />
          </ScrollView>
          {bevestigEinde ? (
            <View style={s.bevestig}>
              <Text style={s.bevestigTekst}>
                {resterend > 0 ? `Je bent ${resterend} min eerder klaar dan afgesproken. ${k.voornaam} ziet de werkelijke duur.` : `${hondNamen} weer thuis afgeleverd?`}
              </Text>
              <Knop titel="Ja, wandeling beëindigen" onPress={() => beeindig(b.id)} />
              <Knop titel="Nog niet" variant="tekst" onPress={() => setBevestigEinde(false)} />
            </View>
          ) : (
            <View style={s.knoppen}>
              <Knop titel="Incident" variant="gevaar" icoon="alert-circle" stijl={{ flex: 1 }} onPress={() => setIncident(true)} />
              <Knop titel="Beëindigen" icoon="home" stijl={{ flex: 1.4 }} onPress={() => setBevestigEinde(true)} />
            </View>
          )}
          <View style={{ alignItems: 'center' }}>
            <Knop titel="Sneller (demo)" icoon="play-forward" variant="tekst" onPress={() => versnel(b.id)} />
          </View>
        </>
      );
      break;
    }
    case 'afgerond':
      inhoud = (
        <>
          <Text style={s.titel}>{kennismaking ? 'Kennismaking afgerond' : 'Goed gedaan!'}</Text>
          {!kennismaking ? (
            <>
              <Text style={s.sub}>
                {oppas ? `${k.voornaam} is weer thuis.` : `${hondNamen} is weer thuis.`} Je ontvangt {euro(b.prijs.uitbetaling + b.fooi)}, via Stripe op je rekening.
              </Text>
              <View style={s.tegels}>
                <Tegel klein waarde={duurTekst(Math.max(1, Math.round(verstrekenMin(b, nu))))} label="duur" />
                {oppas ? (
                  <Tegel klein waarde={duurTekst(b.duur)} label="geboekt" />
                ) : (
                  <Tegel klein waarde={formatAfstand(lengte(deelPad(b.wandelroute, b.gebeurtenissen.find((g) => g.soort === 'einde')?.voortgang ?? 1)))} label="afstand" />
                )}
                <Tegel klein waarde={euro(b.prijs.uitbetaling)} label="verdiend" />
              </View>
            </>
          ) : (
            <Text style={s.sub}>{k.voornaam} kan nu wandelingen bij je boeken.</Text>
          )}
          {!kennismaking ? (
            b.beoordelingDoorMij ? (
              <Melding type="goed">Je beoordeling van {k.voornaam} is opgeslagen.</Melding>
            ) : (
              <View style={s.review}>
                <Text style={s.reviewVraag}>Hoe ging het met {k.voornaam}?</Text>
                <SterrenKiezer waarde={sterren} onChange={setSterren} />
                {sterren > 0 ? (
                  <>
                    <View style={s.tagRij}>
                      {REVIEW_TAGS_EIGENAAR.map((t) => (
                        <Chip key={t} label={t} actief={tags.includes(t)} onPress={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />
                      ))}
                    </View>
                    <Knop titel="Beoordeling plaatsen" variant="secundair" onPress={() => beoordeel(b.id, { sterren, tags, tekst: '' })} />
                  </>
                ) : null}
              </View>
            )
          ) : null}
          <Knop titel="Terug naar de kaart" onPress={() => router.replace('/werk')} stijl={{ marginTop: ruimte(3) }} />
        </>
      );
      break;
    default:
      inhoud = (
        <>
          <Text style={s.titel}>{b.status === 'geweigerd' ? 'Verzoek geweigerd' : 'Afgezegd'}</Text>
          <Text style={s.sub}>Dit heeft geen gevolgen voor je account.</Text>
          <Knop titel="Terug naar de kaart" onPress={() => router.replace('/werk')} />
        </>
      );
  }

  return (
    <View style={s.scherm}>
      <Kaart markers={laag.markers} routes={laag.routes} focus={laag.focus} bovenmarge={insets.top + 60} ondermarge={bladHoogte} />
      <View style={[s.boven, { top: insets.top + ruimte(2) }]} pointerEvents="box-none">
        <RondeKnop icoon="chevron-back" label="Terug" onPress={terug} />
        {b.status === 'bezig' ? (
          <View style={s.livePil}>
            <View style={s.liveStip} />
            <Text style={s.liveTekst}>LOCATIE GEDEELD</Text>
          </View>
        ) : null}
        <RondeKnop icoon="shield-checkmark" label="Veiligheid en hulp" kleur={kleuren.primair} onPress={() => router.push('/veiligheid')} />
      </View>
      <Blad onHoogte={setBladHoogte}>
        <View style={s.klantRij}>
          <Text style={s.klantNaam}>{k.voornaam}</Text>
          <Sterren waarde={k.beoordeling} grootte={12} />
          {b.prijs.uitbetaling > 0 ? <Text style={s.klantBedrag}>{euro(b.prijs.uitbetaling)}</Text> : null}
        </View>
        {inhoud}
      </Blad>
      <IncidentBlad zichtbaar={incident} onSluit={() => setIncident(false)} onMeld={(soort) => voegToe(b.id, 'incident', soort)} dierenarts={honden[0].dierenarts} ander={k.voornaam} />
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  boven: { position: 'absolute', left: ruimte(4), right: ruimte(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePil: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: kleuren.tekst, borderRadius: radius.rond, paddingHorizontal: 12, paddingVertical: 6 },
  liveStip: { width: 8, height: 8, borderRadius: 4, backgroundColor: kleuren.locatie },
  liveTekst: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  klantRij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginBottom: ruimte(1) },
  klantNaam: { fontSize: 13, fontWeight: '800', color: kleuren.primair, textTransform: 'uppercase', letterSpacing: 0.6 },
  klantBedrag: { marginLeft: 'auto', fontSize: 14, fontWeight: '800', color: kleuren.tekst },
  titel: { fontSize: 21, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.4 },
  sub: { fontSize: 14, color: kleuren.gedempt, marginTop: 2, marginBottom: ruimte(3), lineHeight: 19 },
  klein: { fontSize: 12, color: kleuren.gedempt, textAlign: 'center', marginTop: ruimte(1) },
  hondInfo: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingVertical: ruimte(2), marginBottom: ruimte(2) },
  hondNaam: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  hondSub: { fontSize: 13, color: kleuren.gedempt, marginTop: 1, lineHeight: 18 },
  rondIcoon: { width: 44, height: 44, borderRadius: 22, backgroundColor: kleuren.vlak, alignItems: 'center', justifyContent: 'center' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginBottom: ruimte(3) },
  detailTekst: { fontSize: 14, color: kleuren.tekst },
  etaRij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3) },
  eta: { backgroundColor: kleuren.tekst, borderRadius: radius.midden, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  etaGetal: { color: '#fff', fontSize: 24, fontWeight: '900' },
  etaEenheid: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: -2 },
  codeInvoer: {
    alignSelf: 'center',
    width: 200,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 12,
    color: kleuren.tekst,
    borderWidth: 2,
    borderColor: kleuren.rand,
    borderRadius: radius.midden,
    paddingVertical: ruimte(3),
  },
  fout: { fontSize: 13, color: kleuren.nope, fontWeight: '700', textAlign: 'center', marginTop: ruimte(2) },
  tegels: { flexDirection: 'row', gap: ruimte(2), marginVertical: ruimte(3) },
  acties: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(3) },
  notitieRij: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(3) },
  notitieInvoer: { flex: 1, backgroundColor: kleuren.vlak, borderRadius: radius.rond, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: kleuren.tekst },
  notitieKnop: { width: 42, height: 42, borderRadius: 21, backgroundColor: kleuren.primair, alignItems: 'center', justifyContent: 'center' },
  knoppen: { flexDirection: 'row', gap: ruimte(3), marginTop: ruimte(3) },
  tekstKnoppen: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  bevestig: { marginTop: ruimte(2), padding: ruimte(3), borderRadius: radius.midden, backgroundColor: kleuren.vlak, gap: ruimte(2) },
  bevestigTekst: { fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
  review: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(3) },
  reviewVraag: { fontSize: 15, fontWeight: '700', color: kleuren.tekst, textAlign: 'center' },
  tagRij: { flexDirection: 'row', flexWrap: 'wrap', gap: ruimte(2), justifyContent: 'center', marginBottom: ruimte(3) },
});
