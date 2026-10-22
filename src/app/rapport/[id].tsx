import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HondenStapel, PersoonAvatar } from '../../components/avatars';
import { Blok, gedeeldeStijl, Rij, Sectie, SterrenKiezer, Tegel } from '../../components/blokken';
import { Kaart } from '../../components/Kaart';
import { Chip, Knop, Melding, Veld } from '../../components/ui';
import { WandelFeed } from '../../components/WandelFeed';
import { REVIEW_TAGS_OPPAS, REVIEW_TAGS_UITLATER } from '../../data/uitlaters';
import { boekingOpKaart } from '../../lib/kaartLagen';
import { euro } from '../../lib/prijs';
import { formatAfstand, lengte } from '../../lib/route';
import { dagTekst, duurTekst, tijdTekst } from '../../lib/tijd';
import { useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';

const FOOIEN = [100, 200, 300, 500];
const METHODE = { ideal: 'iDEAL', applepay: 'Apple Pay', kaart: 'creditcard' } as const;

export default function Rapport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { boekingen, uitlater, hondenVan, geefFooi, beoordeel, zetConcept } = useApp();
  const [fooi, setFooi] = useState<number | null>(null);
  const [sterren, setSterren] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tekst, setTekst] = useState('');

  const b = boekingen.find((x) => x.id === id);
  const u = b ? uitlater(b.uitlaterId) : undefined;
  if (!b || !u || b.status !== 'afgerond') return <Redirect href="/" />;

  const honden = hondenVan(b);
  const hondNamen = honden.map((h) => h.naam).join(' en ');
  const laag = boekingOpKaart(b, b.beeindigd ?? b.statusSinds, u, honden[0]?.kleur ?? ['#F6D28B', '#D8A13D']);
  const tel = (soort: string) => b.gebeurtenissen.filter((g) => g.soort === soort).length;
  const einde = b.gebeurtenissen.find((g) => g.soort === 'einde');
  const duurMin = b.duur;
  const oppas = b.dienst === 'oppas';

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={{ paddingBottom: ruimte(12) }}>
      <Stack.Screen options={{ title: oppas ? 'Oppasrapport' : 'Wandelrapport' }} />
      <View style={s.kaart}>
        <Kaart markers={laag.markers} routes={laag.routes} focus={laag.focus} maxZoom={0.8} vast />
      </View>
      <View style={[gedeeldeStijl.inhoud, { paddingTop: ruimte(4) }]}>
        <View style={s.kop}>
          <HondenStapel honden={honden} grootte={48} />
          <View style={{ flex: 1 }}>
            <Text style={gedeeldeStijl.titel}>
              {oppas ? 'Oppas' : 'Wandeling'} met {u.voornaam}
            </Text>
            <Text style={gedeeldeStijl.sub}>
              {hondNamen}, {dagTekst(b.gestart ?? b.statusSinds)} om {tijdTekst(b.gestart ?? b.statusSinds)}
            </Text>
          </View>
        </View>

        <View style={s.tegels}>
          {oppas ? (
            <>
              <Tegel klein waarde={duurTekst(duurMin)} label="geboekt" />
              <Tegel klein waarde={String(tel('eten'))} label="maaltijd" />
              <Tegel klein waarde={String(tel('plas'))} label="plasrondje" />
              <Tegel klein waarde={String(tel('foto'))} label="foto's" />
            </>
          ) : (
            <>
              <Tegel klein waarde={`${duurMin} min`} label="duur" />
              <Tegel klein waarde={formatAfstand(lengte(b.wandelroute))} label="afstand" />
              <Tegel klein waarde={String(tel('plas'))} label="plasjes" />
              <Tegel klein waarde={String(tel('poep'))} label="poepjes" />
            </>
          )}
        </View>

        {einde?.tekst ? (
          <View style={s.notitie}>
            <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={36} />
            <View style={{ flex: 1 }}>
              <Text style={s.notitieNaam}>{u.voornaam} schrijft</Text>
              <Text style={s.notitieTekst}>{einde.tekst}</Text>
            </View>
          </View>
        ) : null}

        <Sectie>Verloop</Sectie>
        <WandelFeed gebeurtenissen={b.gebeurtenissen} start={b.gestart} duur={b.basisDuur ?? b.duur} oppas={b.dienst === 'oppas'} />

        <View style={{ height: ruimte(4) }} />
        <Sectie>Betaling</Sectie>
        <Blok>
          <Rij label={oppas ? `${u.voornaam}, ${duurTekst(b.duur)} oppas` : `Tarief ${u.voornaam}`} waarde={euro(b.prijs.tarief)} />
          {b.prijs.toeslag > 0 ? <Rij label="Extra hond" waarde={euro(b.prijs.toeslag)} /> : null}
          <Rij label="Servicekosten" waarde={euro(b.prijs.servicekosten)} />
          {b.fooi > 0 ? <Rij label="Fooi" waarde={euro(b.fooi)} /> : null}
          <Rij label={`Betaald met ${METHODE[b.betaalmethode]}`} waarde={euro(b.prijs.totaal + b.fooi)} sterk />
        </Blok>

        {b.fooi === 0 ? (
          <>
            <Sectie>Fooi geven</Sectie>
            <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(3) }]}>Een fooi gaat volledig naar {u.voornaam}.</Text>
            <View style={gedeeldeStijl.rij}>
              {FOOIEN.map((f) => (
                <Chip key={f} label={euro(f)} actief={fooi === f} onPress={() => setFooi(f)} />
              ))}
            </View>
            <Knop titel={fooi ? `${euro(fooi)} fooi geven` : 'Kies een bedrag'} variant="secundair" icoon="heart" uitgeschakeld={!fooi} onPress={() => fooi && geefFooi(b.id, fooi)} stijl={{ marginTop: ruimte(3), marginBottom: ruimte(5) }} />
          </>
        ) : (
          <Melding type="goed">Bedankt! {u.voornaam} heeft je fooi van {euro(b.fooi)} ontvangen.</Melding>
        )}

        <Sectie>Beoordeling</Sectie>
        {b.beoordelingDoorMij ? (
          <Melding type="goed">Je gaf {u.voornaam} {b.beoordelingDoorMij.sterren} van de 5 sterren. Dank je wel!</Melding>
        ) : (
          <View style={s.review}>
            <Text style={s.reviewVraag}>
              Hoe was {oppas ? 'de oppas' : 'de wandeling'} met {u.voornaam}?
            </Text>
            <SterrenKiezer waarde={sterren} onChange={setSterren} />
            {sterren > 0 ? (
              <>
                <View style={[gedeeldeStijl.rij, { justifyContent: 'center', marginBottom: ruimte(3) }]}>
                  {(oppas ? REVIEW_TAGS_OPPAS : REVIEW_TAGS_UITLATER).map((t) => (
                    <Chip key={t} label={t} actief={tags.includes(t)} onPress={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />
                  ))}
                </View>
                <Veld label="Toelichting (optioneel)" value={tekst} onChangeText={setTekst} multiline maxLength={300} />
                <Knop titel="Beoordeling plaatsen" onPress={() => beoordeel(b.id, { sterren, tags, tekst: tekst.trim() })} />
                <Text style={[gedeeldeStijl.klein, { marginTop: ruimte(2) }]}>
                  Je beoordeling helpt andere eigenaren kiezen. Woober gebruikt beoordelingen niet om uitlaters automatisch te schorsen.
                </Text>
              </>
            ) : null}
          </View>
        )}

        <View style={{ gap: ruimte(2), marginTop: ruimte(5) }}>
          <Knop
            titel={`Opnieuw boeken bij ${u.voornaam}`}
            icoon="paw"
            onPress={() => {
              zetConcept({ dienst: b.dienst, hondIds: b.hondIds, duur: b.duur, moment: { type: 'nu' }, uitlaterId: u.id });
              router.push('/boeken');
            }}
          />
          {!b.serieId ? (
            <Knop
              titel={oppas ? 'Maak er een vaste oppasavond van' : 'Maak er een vaste wandeling van'}
              variant="secundair"
              icoon="repeat"
              onPress={() => {
                zetConcept({
                  dienst: b.dienst,
                  hondIds: b.hondIds,
                  duur: b.duur,
                  moment: oppas ? { type: 'wekelijks', dagen: [4], tijd: '19:00' } : { type: 'wekelijks', dagen: [0, 2, 4], tijd: '12:30' },
                  uitlaterId: u.id,
                });
                router.push('/boeken');
              }}
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kaart: { height: 260 },
  kop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), marginBottom: ruimte(4) },
  tegels: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(4) },
  notitie: { flexDirection: 'row', gap: ruimte(3), backgroundColor: kleuren.vlak, borderRadius: radius.midden, padding: ruimte(3), marginBottom: ruimte(4) },
  notitieNaam: { fontSize: 13, fontWeight: '800', color: kleuren.tekst },
  notitieTekst: { fontSize: 15, color: kleuren.tekst, lineHeight: 21, marginTop: 2 },
  review: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4) },
  reviewVraag: { fontSize: 16, fontWeight: '700', color: kleuren.tekst, textAlign: 'center' },
});
