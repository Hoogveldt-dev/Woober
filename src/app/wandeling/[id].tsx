import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HondenStapel, PersoonAvatar } from '../../components/avatars';
import { Blad, RondeKnop, Sterren, Tegel, useNu } from '../../components/blokken';
import { AfspraakMelden } from '../../components/AfspraakMelden';
import { IncidentBlad } from '../../components/IncidentBlad';
import { Kaart } from '../../components/Kaart';
import { Knop, Melding } from '../../components/ui';
import { WandelFeed } from '../../components/WandelFeed';
import { boekingOpKaart } from '../../lib/kaartLagen';
import { annuleringskosten, euro } from '../../lib/prijs';
import { deelPad, formatAfstand, lengte } from '../../lib/route';
import { resterendeRitMin, verstrekenMin, wandelVoortgang } from '../../lib/simulatie';
import { duurTekst, klokTekst, momentTekst, tijdTekst } from '../../lib/tijd';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

function Zoekbalk() {
  const [w] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const lus = Animated.loop(Animated.timing(w, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: false }));
    lus.start();
    return () => lus.stop();
  }, [w]);
  return (
    <View style={s.zoekbalk}>
      <Animated.View style={[s.zoekbalkVulling, { width: w.interpolate({ inputRange: [0, 1], outputRange: ['5%', '100%'] }), opacity: w.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }) }]} />
    </View>
  );
}

function Ophaalcode({ code, label = 'Ophaalcode' }: { code: string; label?: string }) {
  return (
    <View style={s.code}>
      <Text style={s.codeLabel}>{label}</Text>
      <View style={s.codeCijfers}>
        {code.split('').map((c, i) => (
          <View key={i} style={s.codeVak}>
            <Text style={s.codeCijfer}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Wandeling() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nu = useNu(300);
  const { boekingen, uitlater, hondenVan, annuleer, startNu, versnel, rondKennismakingAf, voegToe, zetConcept, verleng, beeindig } = useApp();
  const [bladHoogte, setBladHoogte] = useState(360);
  const [incident, setIncident] = useState(false);
  const [bevestigAnnuleren, setBevestigAnnuleren] = useState(false);

  const b = boekingen.find((x) => x.id === id);
  const u = b ? uitlater(b.uitlaterId) : undefined;

  useEffect(() => {
    if (b?.status === 'afgerond' && b.soort === 'betaald') {
      const t = setTimeout(() => router.replace({ pathname: '/rapport/[id]', params: { id: b.id } }), 1800);
      return () => clearTimeout(t);
    }
  }, [b?.status, b?.soort, b?.id, router]);

  if (!b || !u) return <Redirect href="/" />;

  const honden = hondenVan(b);
  const hondNamen = honden.map((h) => h.naam).join(' en ');
  const laag = boekingOpKaart(b, nu, u, honden[0]?.kleur ?? ['#F6D28B', '#D8A13D']);
  const kosten = annuleringskosten(b, nu);
  const kennismaking = b.soort === 'kennismaking';
  const oppas = b.dienst === 'oppas';
  const codeLabel = oppas ? 'Code bij de deur' : 'Ophaalcode';

  const terug = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const chat = () => router.push({ pathname: '/chat/[id]', params: { id: u.id } });

  const uitlaterKaart = (
    <View style={s.uitlater}>
      <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={52} />
      <View style={{ flex: 1 }}>
        <Text style={s.uitlaterNaam}>{u.voornaam}</Text>
        <Sterren waarde={u.beoordeling} aantal={u.aantalBeoordelingen} grootte={13} />
      </View>
      <Pressable onPress={chat} accessibilityRole="button" accessibilityLabel={`Bericht aan ${u.voornaam}`} style={s.rondIcoon}>
        <Ionicons name="chatbubble" size={20} color={kleuren.tekst} />
      </Pressable>
      <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`Bel ${u.voornaam}`} style={[s.rondIcoon, { opacity: 0.5 }]}>
        <Ionicons name="call" size={20} color={kleuren.tekst} />
      </Pressable>
    </View>
  );

  const annuleerKnop =
    b.status === 'aangevraagd' || b.status === 'gepland' || b.status === 'onderweg' || b.status === 'aangekomen' ? (
      bevestigAnnuleren ? (
        <View style={s.bevestig}>
          <Text style={s.bevestigTekst}>
            {kosten > 0
              ? `${u.voornaam} is al onderweg of de ${oppas ? 'oppas' : 'wandeling'} begint binnen 2 uur. Je betaalt ${euro(kosten)} annuleringskosten.`
              : 'Annuleren is nu nog gratis.'}
          </Text>
          <Knop titel="Ja, annuleren" variant="gevaar" onPress={() => annuleer(b.id)} />
          <Knop titel="Toch niet" variant="tekst" onPress={() => setBevestigAnnuleren(false)} />
        </View>
      ) : (
        <Knop titel={kennismaking ? 'Kennismaking annuleren' : 'Annuleren'} variant="tekst" onPress={() => setBevestigAnnuleren(true)} />
      )
    ) : null;

  let inhoud = null;
  switch (b.status) {
    case 'aangevraagd':
      inhoud = (
        <>
          <Text style={s.titel}>{kennismaking ? 'Kennismaking aangevraagd' : `Aanvraag verstuurd naar ${u.voornaam}`}</Text>
          <Text style={s.sub}>
            {u.voornaam} reageert meestal binnen {u.reageertBinnen}. {u.voornaam} beslist zelf of het past.
          </Text>
          <Zoekbalk />
          {uitlaterKaart}
          <Text style={s.regel}>
            {momentTekst(b.moment, nu)}, {kennismaking ? '15 minuten' : oppas ? `oppas ${duurTekst(b.duur)}` : `${b.duur} minuten`}, {hondNamen}
          </Text>
          {annuleerKnop}
        </>
      );
      break;
    case 'gepland':
      inhoud = (
        <>
          <Text style={s.titel}>{kennismaking ? 'Kennismaking gepland' : oppas ? 'Oppas gepland' : 'Wandeling gepland'}</Text>
          <Text style={s.sub}>
            {momentTekst(b.moment, nu)} met {u.voornaam}
            {kennismaking ? ', bij jou thuis' : `, ${duurTekst(b.duur)}`}
          </Text>
          {uitlaterKaart}
          {kennismaking ? (
            <Knop titel="Kennismaking gehad (demo)" icoon="checkmark" variant="secundair" onPress={() => rondKennismakingAf(b.id)} />
          ) : (
            <Knop titel="Nu laten beginnen (demo)" icoon="play" variant="secundair" onPress={() => startNu(b.id)} />
          )}
          <AfspraakMelden b={b} naam={u.voornaam} nu={nu} />
          {annuleerKnop}
        </>
      );
      break;
    case 'onderweg': {
      const min = Math.max(1, Math.round(resterendeRitMin(b, u.vervoer, nu)));
      inhoud = (
        <>
          <View style={s.etaRij}>
            <View style={{ flex: 1 }}>
              <Text style={s.titel}>{u.voornaam} is onderweg</Text>
              <Text style={s.sub}>{oppas ? `Om op ${hondNamen} te passen` : `Om ${hondNamen} op te halen`}</Text>
            </View>
            <View style={s.eta}>
              <Text style={s.etaGetal}>{min}</Text>
              <Text style={s.etaEenheid}>min</Text>
            </View>
          </View>
          {uitlaterKaart}
          <Ophaalcode code={b.ophaalcode} label={codeLabel} />
          <Text style={s.hulp}>
            {oppas ? 'Laat alleen iemand binnen die deze code van jou heeft gekregen.' : 'Geef je hond alleen mee aan iemand die deze code van jou heeft gekregen.'}
          </Text>
          <View style={s.demoRij}>
            <Knop titel="Sneller (demo)" icoon="play-forward" variant="tekst" onPress={() => versnel(b.id)} />
          </View>
          {annuleerKnop}
        </>
      );
      break;
    }
    case 'aangekomen':
      inhoud = (
        <>
          <Text style={s.titel}>{u.voornaam} staat voor de deur</Text>
          <Text style={s.sub}>
            {kennismaking
              ? 'Tijd om kennis te maken.'
              : oppas
                ? `Laat ${u.voornaam} binnen, noem de code en vertel waar het eten en de riem liggen.`
                : `Geef ${hondNamen} mee en noem de ophaalcode.`}
          </Text>
          {uitlaterKaart}
          <Ophaalcode code={b.ophaalcode} label={codeLabel} />
          {annuleerKnop}
        </>
      );
      break;
    case 'bezig': {
      const v = wandelVoortgang(b, nu);
      const gelopen = lengte(deelPad(b.wandelroute, v));
      const minuten = Math.min(b.duur, Math.floor(verstrekenMin(b, nu)));
      if (oppas) {
        const eind = (b.gestart ?? nu) + b.duur * 60000;
        inhoud = (
          <>
            <View style={s.etaRij}>
              <HondenStapel honden={honden} grootte={44} />
              <View style={{ flex: 1 }}>
                <Text style={s.titel}>
                  {hondNamen} in goede handen bij {u.voornaam}
                </Text>
                <Text style={s.sub}>Oppas tot {tijdTekst(eind)}. Geniet van je avond!</Text>
              </View>
            </View>
            <View style={s.voortgang}>
              <View style={[s.voortgangVulling, { width: `${Math.round(v * 100)}%` }]} />
            </View>
            <View style={s.tegels}>
              <Tegel klein waarde={klokTekst(minuten)} label={`van ${duurTekst(b.duur)}`} />
              <Tegel klein waarde={tijdTekst(eind)} label="tot" />
              <Tegel klein waarde={String(b.gebeurtenissen.filter((g) => g.soort === 'foto').length)} label="foto's" />
            </View>
            <ScrollView style={{ maxHeight: 170 }}>
              <WandelFeed gebeurtenissen={b.gebeurtenissen} compact start={b.gestart} duur={b.basisDuur ?? b.duur} oppas={b.dienst === 'oppas'} />
            </ScrollView>
            <View style={s.knoppen}>
              <Knop titel="Bericht" variant="secundair" icoon="chatbubble" stijl={{ flex: 1 }} onPress={chat} />
              <Knop titel="Verlengen" variant="secundair" icoon="add-circle" stijl={{ flex: 1 }} onPress={() => verleng(b.id)} />
            </View>
            <Knop titel="Ik ben thuis" icoon="home" stijl={{ marginTop: ruimte(3) }} onPress={() => beeindig(b.id)} />
            <View style={s.demoRij}>
              <Knop titel="Incident melden" variant="tekst" icoon="alert-circle" tekstKleur={kleuren.nope} onPress={() => setIncident(true)} />
              <Knop titel="Half uur verder (demo)" icoon="play-forward" variant="tekst" onPress={() => versnel(b.id)} />
            </View>
            <Text style={s.hulp}>Verlengen gaat per uur. Ben je eerder thuis, dan betaal je de geboekte tijd.</Text>
          </>
        );
        break;
      }
      inhoud = (
        <>
          <View style={s.etaRij}>
            <HondenStapel honden={honden} grootte={44} />
            <View style={{ flex: 1 }}>
              <Text style={s.titel}>{hondNamen} {honden.length > 1 ? 'wandelen' : 'wandelt'} met {u.voornaam}</Text>
              <Text style={s.sub}>Live, alleen zichtbaar voor jou tijdens de wandeling</Text>
            </View>
          </View>
          <View style={s.voortgang}>
            <View style={[s.voortgangVulling, { width: `${Math.round(v * 100)}%` }]} />
          </View>
          <View style={s.tegels}>
            <Tegel waarde={`${minuten} min`} label={`van ${b.duur} minuten`} />
            <Tegel waarde={formatAfstand(gelopen)} label="gelopen" />
            <Tegel waarde={String(b.gebeurtenissen.filter((g) => g.soort === 'foto').length)} label="foto's" />
          </View>
          <ScrollView style={{ maxHeight: 210 }}>
            <WandelFeed gebeurtenissen={b.gebeurtenissen} compact start={b.gestart} duur={b.basisDuur ?? b.duur} oppas={b.dienst === 'oppas'} />
          </ScrollView>
          <View style={s.knoppen}>
            <Knop titel="Bericht" variant="secundair" icoon="chatbubble" stijl={{ flex: 1 }} onPress={chat} />
            <Knop titel="Incident" variant="gevaar" icoon="alert-circle" stijl={{ flex: 1 }} onPress={() => setIncident(true)} />
          </View>
          <View style={s.demoRij}>
            <Knop titel="Sneller (demo)" icoon="play-forward" variant="tekst" onPress={() => versnel(b.id)} />
          </View>
        </>
      );
      break;
    }
    case 'afgerond':
      inhoud = kennismaking ? (
        <>
          <Text style={s.titel}>Kennismaking afgerond</Text>
          <Text style={s.sub}>
            Klikte het? Dan kun je nu {u.diensten.length > 1 ? 'uitlaten en oppas' : u.diensten[0] === 'oppas' ? 'oppas' : 'wandelingen'} boeken bij {u.voornaam}.
          </Text>
          <Knop
            titel={`Eerste afspraak met ${u.voornaam}`}
            icoon="paw"
            onPress={() => {
              const dienst = u.diensten.includes('uitlaten') ? 'uitlaten' : 'oppas';
              zetConcept({
                dienst,
                hondIds: dienst === 'oppas' ? b.hondIds : b.hondIds.slice(0, 1),
                duur: dienst === 'oppas' ? 180 : 30,
                moment: { type: 'nu' },
                uitlaterId: u.id,
              });
              router.replace('/boeken');
            }}
          />
          <Knop titel="Terug naar de kaart" variant="tekst" onPress={() => router.replace('/')} />
        </>
      ) : (
        <>
          <Text style={s.titel}>{oppas ? 'De oppas is klaar' : `${hondNamen} ${honden.length > 1 ? 'zijn' : 'is'} weer thuis`}</Text>
          <Text style={s.sub}>{oppas ? 'Het oppasrapport wordt geopend.' : 'Het wandelrapport wordt geopend.'}</Text>
          <Knop titel={oppas ? 'Bekijk oppasrapport' : 'Bekijk wandelrapport'} icoon="document-text" onPress={() => router.replace({ pathname: '/rapport/[id]', params: { id: b.id } })} />
        </>
      );
      break;
    case 'geannuleerd':
    case 'geweigerd':
      inhoud = (
        <>
          <Text style={s.titel}>{b.status === 'geweigerd' ? `${u.voornaam} kan helaas niet` : b.geannuleerdDoor === 'uitlater' ? `${u.voornaam} heeft afgezegd` : 'Geannuleerd'}</Text>
          <Text style={s.sub}>
            {b.status === 'geannuleerd'
              ? b.annuleringskosten
                ? `Er is ${euro(b.annuleringskosten)} in rekening gebracht, dat gaat naar ${u.voornaam}.`
                : 'Er zijn geen kosten in rekening gebracht.'
              : 'Kies een andere uitlater in de buurt.'}
          </Text>
          <Knop
            titel="Andere uitlater zoeken"
            icoon="search"
            onPress={() => {
              zetConcept({ dienst: b.dienst, hondIds: b.hondIds, duur: b.duur, moment: { type: 'nu' }, uitlaterId: null });
              router.replace('/boeken');
            }}
          />
          <AfspraakMelden b={b} naam={u.voornaam} nu={nu} />
        </>
      );
      break;
  }

  return (
    <View style={s.scherm}>
      <Kaart markers={laag.markers} routes={laag.routes} focus={laag.focus} bovenmarge={insets.top + 60} ondermarge={bladHoogte} />
      <View style={[s.boven, { top: insets.top + ruimte(2) }]} pointerEvents="box-none">
        <RondeKnop icoon="chevron-back" label="Terug" onPress={terug} />
        {b.status === 'bezig' ? (
          <View style={s.livePil}>
            <View style={s.liveStip} />
            <Text style={s.liveTekst}>{oppas ? 'OPPAS LIVE' : 'LIVE'}</Text>
          </View>
        ) : null}
        <RondeKnop icoon="shield-checkmark" label="Veiligheid en hulp" kleur={kleuren.primair} onPress={() => router.push('/veiligheid')} />
      </View>
      <Blad onHoogte={setBladHoogte}>
        {inhoud}
      </Blad>
      <IncidentBlad
        zichtbaar={incident}
        onSluit={() => setIncident(false)}
        onMeld={(soort) => voegToe(b.id, 'incident', soort)}
        dierenarts={honden[0]?.dierenarts ?? ''}
        ander={u.voornaam}
      />
      {b.status === 'bezig' && b.gebeurtenissen.some((g) => g.soort === 'incident') ? (
        <View style={[s.incidentBanner, { top: insets.top + 64 }]}>
          <Melding type="fout">Incident gemeld. Een medewerker van Woober neemt contact met je op.</Melding>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  boven: { position: 'absolute', left: ruimte(4), right: ruimte(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePil: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: kleuren.tekst, borderRadius: radius.rond, paddingHorizontal: 12, paddingVertical: 6 },
  liveStip: { width: 8, height: 8, borderRadius: 4, backgroundColor: kleuren.nope },
  liveTekst: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  titel: { fontSize: 21, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.4 },
  sub: { fontSize: 14, color: kleuren.gedempt, marginTop: 2, marginBottom: ruimte(3), lineHeight: 19 },
  regel: { fontSize: 14, color: kleuren.gedempt, marginBottom: ruimte(2), textAlign: 'center' },
  hulp: { fontSize: 12, color: kleuren.gedempt, textAlign: 'center', marginBottom: ruimte(2) },
  zoekbalk: { height: 4, borderRadius: 2, backgroundColor: kleuren.vlak, overflow: 'hidden', marginBottom: ruimte(3) },
  zoekbalkVulling: { height: 4, borderRadius: 2, backgroundColor: kleuren.primair },
  uitlater: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingVertical: ruimte(2), marginBottom: ruimte(2) },
  uitlaterNaam: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  rondIcoon: { width: 44, height: 44, borderRadius: 22, backgroundColor: kleuren.vlak, alignItems: 'center', justifyContent: 'center' },
  etaRij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3) },
  eta: { backgroundColor: kleuren.tekst, borderRadius: radius.midden, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  etaGetal: { color: '#fff', fontSize: 24, fontWeight: '900' },
  etaEenheid: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: -2 },
  code: { alignItems: 'center', backgroundColor: kleuren.primairVlak, borderRadius: radius.midden, padding: ruimte(3), marginBottom: ruimte(2) },
  codeLabel: { fontSize: 12, fontWeight: '800', color: kleuren.primair, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  codeCijfers: { flexDirection: 'row', gap: ruimte(2) },
  codeVak: { width: 44, height: 52, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  codeCijfer: { fontSize: 26, fontWeight: '900', color: kleuren.tekst },
  voortgang: { height: 6, borderRadius: 3, backgroundColor: kleuren.vlak, overflow: 'hidden', marginBottom: ruimte(3) },
  voortgangVulling: { height: 6, backgroundColor: kleuren.primair },
  tegels: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(2) },
  knoppen: { flexDirection: 'row', gap: ruimte(3), marginTop: ruimte(3) },
  demoRij: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  bevestig: { marginTop: ruimte(2), padding: ruimte(3), borderRadius: radius.midden, backgroundColor: kleuren.foutVlak, gap: ruimte(2) },
  bevestigTekst: { fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
  incidentBanner: { position: 'absolute', left: ruimte(4), right: ruimte(4) },
});
