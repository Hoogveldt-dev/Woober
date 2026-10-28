import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HondenStapel } from '../../components/avatars';
import { Blad, RondeKnop, Sterren, useNu } from '../../components/blokken';
import { Kaart, type KaartMarker, type KaartRoute } from '../../components/Kaart';
import { Badge, Knop, Melding } from '../../components/ui';
import { boekingOpKaart } from '../../lib/kaartLagen';
import { euro } from '../../lib/prijs';
import { formatAfstand, lengte, routeTussen } from '../../lib/route';
import { duurTekst, leeftijdTekst, momentTekst, totTekst } from '../../lib/tijd';
import { verdiendOp } from '../../lib/verdiensten';
import { klaarVoorWerk, useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte, schaduw } from '../../theme';

function OnlineKnop({ onPress }: { onPress: () => void }) {
  const [puls] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const lus = Animated.loop(Animated.timing(puls, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }));
    lus.start();
    return () => lus.stop();
  }, [puls]);
  return (
    <View style={s.onlineBuiten}>
      <Animated.View
        style={[
          s.onlinePuls,
          { opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] },
        ]}
      />
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Online gaan">
        <LinearGradient colors={kleuren.verloop} style={[s.onlineKnop, schaduw]}>
          <Text style={s.onlineTekst}>GA{'\n'}ONLINE</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function Zoeken() {
  const [w] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const lus = Animated.loop(Animated.timing(w, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }));
    lus.start();
    return () => lus.stop();
  }, [w]);
  return (
    <View style={s.zoekbalk}>
      <Animated.View style={[s.zoekVulling, { left: w.interpolate({ inputRange: [0, 1], outputRange: ['-30%', '100%'] }) }]} />
    </View>
  );
}

export default function Werk() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const nu = useNu(300);
  const { mijnProfiel, online, zetOnline, openVerzoek, actieveOpdracht, accepteer, weiger, klant, boekingen, modus } = useApp();
  const [bladHoogte, setBladHoogte] = useState(300);
  if (!mijnProfiel) return null;

  const klaar = klaarVoorWerk(mijnProfiel);
  const vandaag = verdiendOp(boekingen, new Date(nu));
  const geplandVandaag = boekingen.filter((b) => b.mijnRol === 'uitlater' && b.status === 'gepland').length;
  const ik = mijnProfiel.positie;

  let markers: KaartMarker[] = [{ id: 'ik', soort: 'ik', punt: ik }];
  let routes: KaartRoute[] = [];
  let focus = [ik, { x: ik.x + 300, y: ik.y - 250 }, { x: ik.x - 100, y: ik.y + 250 }];

  const verzoekKlant = openVerzoek ? klant(openVerzoek.klantId) : undefined;
  const opdrachtKlant = actieveOpdracht ? klant(actieveOpdracht.klantId) : undefined;

  if (actieveOpdracht && opdrachtKlant) {
    const laag = boekingOpKaart(actieveOpdracht, nu, mijnProfiel, opdrachtKlant.honden[0].kleur, { ophaalSoort: 'klant', uitlaterAlsIk: true, toonPlan: true });
    markers = laag.markers;
    routes = laag.routes;
    focus = laag.focus;
  } else if (openVerzoek && verzoekKlant) {
    const route = routeTussen(ik, openVerzoek.ophaalPunt);
    markers = [markers[0], { id: 'klant', soort: 'klant', punt: openVerzoek.ophaalPunt, label: verzoekKlant.voornaam }];
    routes = [{ id: 'voorbeeld', punten: route, kleur: kleuren.tekst, dikte: 4, gestippeld: true }];
    focus = [ik, openVerzoek.ophaalPunt];
  }

  let inhoud;
  if (!klaar) {
    inhoud = (
      <>
        <Text style={s.titel}>Nog even en je kunt aan de slag</Text>
        <Melding type="waarschuwing">Rond eerst je verificatie af: identiteit, verzekering en uitbetaalrekening.</Melding>
        <Knop titel="Verificatie afronden" icoon="shield-checkmark" onPress={() => router.push('/verificatie')} />
      </>
    );
  } else if (actieveOpdracht && opdrachtKlant) {
    const tekst = {
      onderweg: `Onderweg naar ${opdrachtKlant.voornaam}`,
      aangekomen: `Je bent bij ${opdrachtKlant.voornaam}`,
      bezig: actieveOpdracht.dienst === 'oppas' ? 'Oppas bezig' : 'Wandeling bezig',
    } as Record<string, string>;
    inhoud = (
      <Pressable onPress={() => router.push({ pathname: '/opdracht/[id]', params: { id: actieveOpdracht.id } })} accessibilityRole="button">
        <LinearGradient colors={kleuren.verloop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.actief}>
          <HondenStapel honden={opdrachtKlant.honden} grootte={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.actiefTitel}>{tekst[actieveOpdracht.status]}</Text>
            <Text style={s.actiefSub}>Tik om verder te gaan</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>
    );
  } else if (openVerzoek && verzoekKlant) {
    const honden = verzoekKlant.honden;
    const afstand = lengte(routeTussen(ik, openVerzoek.ophaalPunt));
    const kennismaking = openVerzoek.soort === 'kennismaking';
    const oppas = openVerzoek.dienst === 'oppas';
    inhoud = (
      <>
        <View style={s.verzoekKop}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge tekst={kennismaking ? 'KENNISMAKING' : 'NIEUW VERZOEK'} icoon="notifications" kleur={kleuren.primair} />
            {!kennismaking ? <Badge tekst={oppas ? 'OPPAS AAN HUIS' : 'UITLATEN'} icoon={oppas ? 'home' : 'walk'} kleur={kleuren.tekst} /> : null}
          </View>
          <Text style={s.verzoekAfstand}>{formatAfstand(afstand)}</Text>
        </View>
        <View style={s.verzoekHond}>
          <HondenStapel honden={honden} grootte={52} />
          <View style={{ flex: 1 }}>
            <Text style={s.verzoekNaam}>{honden.map((h) => h.naam).join(' en ')}</Text>
            <Text style={s.verzoekSub}>
              {honden[0].ras}, {leeftijdTekst(honden[0].geboortedatum)}, {honden[0].grootte}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 }}>
              <Text style={s.verzoekSub}>{verzoekKlant.voornaam}</Text>
              <Sterren waarde={verzoekKlant.beoordeling} grootte={12} />
              <Text style={s.verzoekSub}>{verzoekKlant.wijk}</Text>
            </View>
          </View>
        </View>
        <View style={s.feiten}>
          <View style={s.feit}>
            <Ionicons name="time" size={15} color={kleuren.tekst} />
            <Text style={s.feitTekst}>{momentTekst(openVerzoek.moment, nu)}</Text>
          </View>
          {!kennismaking ? (
            <View style={s.feit}>
              <MaterialCommunityIcons name={oppas ? 'sofa' : 'walk'} size={15} color={kleuren.tekst} />
              <Text style={s.feitTekst}>
                {duurTekst(openVerzoek.duur)}
                {oppas ? `, ${totTekst(openVerzoek.moment.type === 'later' ? openVerzoek.moment.tijdstip : nu, openVerzoek.duur)}` : ''}
              </Text>
            </View>
          ) : null}
          <View style={s.feit}>
            <Ionicons name={openVerzoek.sleutel === 'kastje' ? 'key' : 'home'} size={15} color={kleuren.tekst} />
            <Text style={s.feitTekst}>{openVerzoek.sleutel === 'kastje' ? 'Sleutelkastje' : 'Eigenaar thuis'}</Text>
          </View>
        </View>
        {openVerzoek.notitie ? (
          <View style={s.notitie}>
            <Ionicons name="information-circle" size={16} color={kleuren.info} />
            <Text style={s.notitieTekst}>{openVerzoek.notitie}</Text>
          </View>
        ) : null}
        {!kennismaking ? (
          <View style={s.verdienRij}>
            <Text style={s.verdienLabel}>Jij ontvangt</Text>
            <Text style={s.verdienBedrag}>{euro(openVerzoek.prijs.uitbetaling)}</Text>
          </View>
        ) : (
          <Text style={s.kennisTekst}>Kennismaken is gratis. Daarna kan {verzoekKlant.voornaam} wandelingen bij je boeken.</Text>
        )}
        {!kennismaking ? (
          <Text style={s.verdienSub}>
            Jouw tarief {euro(openVerzoek.prijs.tarief + openVerzoek.prijs.toeslag)}
            {openVerzoek.prijs.drukteUitlater > 0 ? `, plus ${euro(openVerzoek.prijs.drukteUitlater)} drukte-bonus` : ''}
            {openVerzoek.prijs.commissie > 0 ? `, min ${euro(openVerzoek.prijs.commissie)} commissie` : ', zonder commissie'}. Het adres zie je na accepteren.
          </Text>
        ) : null}
        <View style={s.knoppen}>
          <Knop titel="Weigeren" variant="secundair" stijl={{ flex: 1 }} onPress={() => weiger(openVerzoek.id)} />
          <Knop
            titel="Accepteren"
            icoon="checkmark"
            stijl={{ flex: 1.5 }}
            onPress={() => {
              accepteer(openVerzoek.id);
              if (openVerzoek.moment.type === 'nu' && !kennismaking) router.push({ pathname: '/opdracht/[id]', params: { id: openVerzoek.id } });
            }}
          />
        </View>
        <Text style={s.geenGevolgen}>Weigeren heeft geen gevolgen. Woober houdt niet bij hoe vaak je weigert.</Text>
      </>
    );
  } else if (online) {
    inhoud = (
      <>
        <View style={s.statusRij}>
          <View style={[s.stip, { backgroundColor: kleuren.like }]} />
          <Text style={s.titel}>Je bent online</Text>
        </View>
        <Zoeken />
        <Text style={s.uitleg}>Verzoeken van eigenaren in je werkgebied verschijnen hier. Jij kiest welke je aanneemt.</Text>
        <Knop titel="Offline gaan" variant="secundair" icoon="pause" onPress={() => zetOnline(false)} />
      </>
    );
  } else {
    inhoud = (
      <View style={{ alignItems: 'center' }}>
        <View style={s.statusRij}>
          <View style={[s.stip, { backgroundColor: kleuren.gedempt }]} />
          <Text style={s.titel}>Je bent offline</Text>
        </View>
        <OnlineKnop onPress={() => zetOnline(true)} />
        <Text style={s.uitleg}>Je bepaalt zelf wanneer je werkt. Online zijn betekent alleen dat eigenaren in de buurt je een verzoek kunnen sturen.</Text>
      </View>
    );
  }

  return (
    <View style={s.scherm}>
      <Kaart markers={markers} routes={routes} focus={focus} bovenmarge={insets.top + 64} ondermarge={bladHoogte} />
      <View style={[s.boven, { top: insets.top + ruimte(2) }]} pointerEvents="box-none">
        <RondeKnop icoon="calendar" label="Opdrachten" onPress={() => router.push('/werk/opdrachten')} />
        <Pressable onPress={() => router.push('/werk/verdiensten')} style={[s.verdienPil, schaduw]} accessibilityRole="button">
          <Text style={s.verdienPilLabel}>Vandaag</Text>
          <Text style={s.verdienPilBedrag}>{euro(vandaag)}</Text>
        </Pressable>
        <RondeKnop icoon="shield-checkmark" label="Veiligheid en hulp" kleur={kleuren.primair} onPress={() => router.push('/veiligheid')} />
      </View>
      <Blad onHoogte={setBladHoogte}>
        {modus === 'echt' && !actieveOpdracht ? <Melding type="info">Woober start binnenkort in jouw buurt. Tot dan zijn verzoeken voorbeelden en verdien je er nog niets mee.</Melding> : null}
        {inhoud}
        {geplandVandaag > 0 && !openVerzoek && !actieveOpdracht ? (
          <Pressable onPress={() => router.push('/werk/opdrachten')} style={s.gepland} accessibilityRole="button">
            <Ionicons name="calendar" size={16} color={kleuren.primair} />
            <Text style={s.geplandTekst}>
              {geplandVandaag} geplande {geplandVandaag === 1 ? 'opdracht' : 'opdrachten'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={kleuren.gedempt} />
          </Pressable>
        ) : null}
      </Blad>
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  boven: { position: 'absolute', left: ruimte(4), right: ruimte(4), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verdienPil: { backgroundColor: kleuren.tekst, borderRadius: radius.rond, paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center' },
  verdienPilLabel: { color: '#fff', opacity: 0.7, fontSize: 11, fontWeight: '700' },
  verdienPilBedrag: { color: '#fff', fontSize: 18, fontWeight: '900' },
  titel: { fontSize: 21, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.4, marginBottom: ruimte(2) },
  statusRij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  stip: { width: 10, height: 10, borderRadius: 5, marginBottom: ruimte(2) },
  uitleg: { fontSize: 14, color: kleuren.gedempt, textAlign: 'center', lineHeight: 20, marginVertical: ruimte(3) },
  onlineBuiten: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginVertical: ruimte(2) },
  onlinePuls: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: kleuren.primair },
  onlineKnop: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  onlineTekst: { color: '#fff', fontSize: 17, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  zoekbalk: { height: 4, borderRadius: 2, backgroundColor: kleuren.vlak, overflow: 'hidden', marginTop: ruimte(1) },
  zoekVulling: { position: 'absolute', top: 0, bottom: 0, width: '30%', borderRadius: 2, backgroundColor: kleuren.like },
  actief: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), padding: ruimte(3), borderRadius: radius.midden },
  actiefTitel: { color: '#fff', fontSize: 16, fontWeight: '800' },
  actiefSub: { color: '#fff', opacity: 0.9, fontSize: 13, marginTop: 1 },
  verzoekKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ruimte(3) },
  verzoekAfstand: { fontSize: 13, fontWeight: '700', color: kleuren.gedempt },
  verzoekHond: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), marginBottom: ruimte(3) },
  verzoekNaam: { fontSize: 19, fontWeight: '800', color: kleuren.tekst },
  verzoekSub: { fontSize: 13, color: kleuren.gedempt },
  feiten: { flexDirection: 'row', flexWrap: 'wrap', gap: ruimte(2), marginBottom: ruimte(3) },
  feit: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: kleuren.vlak, borderRadius: radius.rond, paddingHorizontal: 10, paddingVertical: 6 },
  feitTekst: { fontSize: 13, fontWeight: '700', color: kleuren.tekst },
  notitie: { flexDirection: 'row', gap: 6, backgroundColor: '#EEF4FF', borderRadius: radius.klein, padding: ruimte(2), marginBottom: ruimte(3) },
  notitieTekst: { flex: 1, fontSize: 13, color: kleuren.tekst, lineHeight: 18 },
  verdienRij: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  verdienLabel: { fontSize: 15, fontWeight: '700', color: kleuren.tekst },
  verdienBedrag: { fontSize: 28, fontWeight: '900', color: kleuren.tekst },
  verdienSub: { fontSize: 12, color: kleuren.gedempt, marginTop: 2 },
  kennisTekst: { fontSize: 14, color: kleuren.gedempt, lineHeight: 20 },
  knoppen: { flexDirection: 'row', gap: ruimte(3), marginTop: ruimte(4) },
  geenGevolgen: { fontSize: 12, color: kleuren.gedempt, textAlign: 'center', marginTop: ruimte(2) },
  gepland: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginTop: ruimte(3), paddingTop: ruimte(3), borderTopWidth: 1, borderTopColor: kleuren.vlak },
  geplandTekst: { flex: 1, fontSize: 14, fontWeight: '700', color: kleuren.tekst },
});
