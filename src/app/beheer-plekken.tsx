import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { gedeeldeStijl, Segment } from '../components/blokken';
import { Badge, Knop, Melding, Veld } from '../components/ui';
import nijmegen from '../../supabase/plekken/nijmegen.json';
import {
  handelMeldingAf,
  laadMeldingen,
  verwijderReviewAlsBeheerder,
  voegWooberPlekToe,
  zetPlekStatus,
  zoekLigging,
  type Melding as MeldingRij,
} from '../lib/beheer';
import { PLEK_SOORTEN } from '../lib/plekken';
import { dagTekst } from '../lib/tijd';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Plek, PlekSoort } from '../types';

type Tab = 'bekijken' | 'alle' | 'inladen';

// Ruim om Nijmegen en de Ooijpolder; een treffer daarbuiten is vrijwel zeker fout
const GEBIED = { latMin: 51.74, latMax: 51.9, lngMin: 5.7, lngMax: 6.02 };
const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Moderatie van plekken en reviews, en de plekken van Woober inladen. Een mens beslist altijd. */
export default function BeheerPlekken() {
  const [tab, setTab] = useState<Tab>('bekijken');
  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
      <Segment<Tab>
        waarde={tab}
        onChange={setTab}
        opties={[
          { waarde: 'bekijken', label: 'Te bekijken' },
          { waarde: 'alle', label: 'Alle plekken' },
          { waarde: 'inladen', label: 'Inladen' },
        ]}
      />
      <View style={{ height: ruimte(4) }} />
      {tab === 'bekijken' ? <TeBekijken /> : tab === 'alle' ? <AllePlekken /> : <Inladen />}
    </ScrollView>
  );
}

function PlekRij({ p, children }: { p: Plek; children?: ReactNode }) {
  const router = useRouter();
  const soort = PLEK_SOORTEN[p.soort];
  return (
    <View style={s.kaart}>
      <Pressable onPress={() => router.push({ pathname: '/beheer-plek', params: { id: p.id } })} accessibilityRole="button">
        <View style={s.rij}>
          <Text style={s.naam}>
            {soort.teken} {p.naam}
          </Text>
          {p.status === 'nieuw' ? <Badge tekst="NIEUW" kleur={kleuren.info} /> : null}
          {p.status === 'verborgen' ? <Badge tekst="VERBORGEN" kleur={kleuren.gedempt} /> : null}
        </View>
        <Text style={s.sub}>
          {soort.label}, {p.plaats ?? 'onbekende plaats'}
          {p.toegevoegdDoor ? `, toegevoegd door ${p.toegevoegdDoor}` : ', van Woober'}
        </Text>
        {p.omschrijving ? <Text style={s.tekst}>{p.omschrijving}</Text> : null}
        <Text style={s.link}>Bekijken en aanpassen</Text>
      </Pressable>
      {children}
    </View>
  );
}

function TeBekijken() {
  const { plekken, herlaadPlekken } = useApp();
  const [meldingen, setMeldingen] = useState<MeldingRij[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [besluit, setBesluit] = useState<Record<string, string>>({});

  const laad = useCallback(() => {
    laadMeldingen().then(setMeldingen, (e: Error) => setFout(e.message));
  }, []);
  useEffect(laad, [laad]);

  const doe = async (actie: () => Promise<void>) => {
    setFout(null);
    try {
      await actie();
      await herlaadPlekken();
      laad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Er ging iets mis.');
    }
  };

  const nieuw = plekken.filter((p) => p.status === 'nieuw');
  const plekVan = (id: string | null) => plekken.find((p) => p.id === id);

  return (
    <>
      {fout ? <Melding type="fout">{fout}</Melding> : null}
      <Text style={s.kop}>Nieuwe plekken van gebruikers ({nieuw.length})</Text>
      <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(3) }]}>Al zichtbaar met het label Net toegevoegd. Klopt de plek, keur hem dan goed; anders verbergen.</Text>
      {nieuw.length === 0 ? <Text style={gedeeldeStijl.hulp}>Niets te bekijken.</Text> : null}
      {nieuw.map((p) => (
        <PlekRij key={p.id} p={p}>
          <View style={s.knoppen}>
            <Knop titel="Goedkeuren" icoon="checkmark" stijl={s.knop} onPress={() => doe(() => zetPlekStatus(p.id, 'gecontroleerd'))} />
            <Knop titel="Verbergen" variant="secundair" icoon="eye-off" stijl={s.knop} onPress={() => doe(() => zetPlekStatus(p.id, 'verborgen'))} />
          </View>
        </PlekRij>
      ))}

      <Text style={[s.kop, { marginTop: ruimte(6) }]}>Meldingen ({meldingen?.length ?? 0})</Text>
      <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(3) }]}>Een gemelde review of plek blijft staan tot jij beslist. Schrijf kort op waarom; dat blijft bewaard.</Text>
      {meldingen === null && !fout ? <ActivityIndicator /> : null}
      {meldingen?.length === 0 ? <Text style={gedeeldeStijl.hulp}>Geen open meldingen.</Text> : null}
      {meldingen?.map((m) => {
        const plek = plekVan(m.plekId);
        const reviewPlek = m.reviewId ? plekken.find((p) => p.reviews.some((r) => r.id === m.reviewId)) : undefined;
        return (
          <View key={m.id} style={s.kaart}>
            <Text style={s.naam}>{m.reden}</Text>
            <Text style={s.sub}>
              Gemeld door {m.melder}, {dagTekst(m.aangemaakt)}
              {m.gemeld ? `. Over ${m.gemeld}` : ''}
            </Text>
            {plek ? <Text style={s.tekst}>Plek: {plek.naam}</Text> : null}
            {m.reviewId ? (
              <Text style={s.tekst}>
                Review{reviewPlek ? ` bij ${reviewPlek.naam}` : ''}: {m.reviewTekst ?? 'al verwijderd'}
              </Text>
            ) : null}
            {m.toelichting ? <Text style={s.tekst}>{m.toelichting}</Text> : null}
            <Veld
              label="Besluit"
              value={besluit[m.id] ?? ''}
              onChangeText={(t) => setBesluit((b) => ({ ...b, [m.id]: t }))}
              placeholder="Bijv. review verwijderd: scheldwoorden"
            />
            <View style={s.knoppen}>
              {m.reviewId && m.reviewTekst ? (
                <Knop
                  titel="Review weg"
                  variant="gevaar"
                  stijl={s.knop}
                  onPress={() => doe(async () => {
                    await verwijderReviewAlsBeheerder(m.reviewId!);
                    await handelMeldingAf(m.id, besluit[m.id] || 'Review verwijderd');
                  })}
                />
              ) : null}
              {plek && plek.status !== 'verborgen' ? (
                <Knop
                  titel="Plek verbergen"
                  variant="gevaar"
                  stijl={s.knop}
                  onPress={() => doe(async () => {
                    await zetPlekStatus(plek.id, 'verborgen');
                    await handelMeldingAf(m.id, besluit[m.id] || 'Plek verborgen');
                  })}
                />
              ) : null}
              <Knop titel="Laten staan" variant="secundair" stijl={s.knop} onPress={() => doe(() => handelMeldingAf(m.id, besluit[m.id] || 'Niets aan gedaan'))} />
            </View>
          </View>
        );
      })}
    </>
  );
}

function AllePlekken() {
  const { plekken } = useApp();
  const [zoek, setZoek] = useState('');
  const lijst = plekken.filter((p) => !zoek.trim() || `${p.naam} ${p.plaats ?? ''}`.toLowerCase().includes(zoek.trim().toLowerCase()));
  return (
    <>
      <Veld label="Zoeken" value={zoek} onChangeText={setZoek} placeholder="Naam of plaats" />
      <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(3) }]}>{lijst.length} plekken, ook verborgen. Tik op een plek om hem aan te passen of te verplaatsen.</Text>
      {lijst.map((p) => (
        <PlekRij key={p.id} p={p} />
      ))}
    </>
  );
}

interface Voortgang {
  naam: string;
  tekst: string;
  goed: boolean;
}

/** De onderzochte plekken uit supabase/plekken/nijmegen.json in de database zetten, met coördinaten van OpenStreetMap */
function Inladen() {
  const { plekken, herlaadPlekken } = useApp();
  const [bezig, setBezig] = useState(false);
  const [voortgang, setVoortgang] = useState<Voortgang[]>([]);
  const lijst = nijmegen.plekken as {
    soort: PlekSoort;
    naam: string;
    zoek: string;
    plaats: string;
    omschrijving: string;
    kenmerken: string[];
    regels: string;
    lat?: number;
    lng?: number;
  }[];
  const nogNiet = lijst.filter((x) => !plekken.some((p) => p.naam === x.naam && p.plaats === x.plaats));

  const start = async () => {
    setBezig(true);
    setVoortgang([]);
    const erbij = (v: Voortgang) => setVoortgang((oud) => [...oud, v]);
    for (const x of nogNiet) {
      try {
        let ligging = typeof x.lat === 'number' && typeof x.lng === 'number' ? { lat: x.lat, lng: x.lng, gevonden: 'uit het bestand' } : null;
        if (!ligging) {
          ligging = await zoekLigging(x.zoek);
          await wacht(1100);
        }
        if (!ligging) {
          erbij({ naam: x.naam, tekst: `Niet gevonden met "${x.zoek}". Voeg hem toe via Plekken, Toevoegen.`, goed: false });
          continue;
        }
        if (ligging.lat < GEBIED.latMin || ligging.lat > GEBIED.latMax || ligging.lng < GEBIED.lngMin || ligging.lng > GEBIED.lngMax) {
          erbij({ naam: x.naam, tekst: `Gevonden buiten Nijmegen (${ligging.gevonden}); overgeslagen.`, goed: false });
          continue;
        }
        await voegWooberPlekToe({ soort: x.soort, naam: x.naam, omschrijving: x.omschrijving, kenmerken: x.kenmerken, regels: x.regels, plaats: x.plaats, lat: ligging.lat, lng: ligging.lng });
        erbij({ naam: x.naam, tekst: `Toegevoegd bij ${ligging.gevonden}`, goed: true });
      } catch (e) {
        erbij({ naam: x.naam, tekst: e instanceof Error ? e.message : 'Mislukt', goed: false });
      }
    }
    await herlaadPlekken();
    setBezig(false);
  };

  return (
    <>
      <Text style={s.kop}>Plekken in Nijmegen</Text>
      <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(3) }]}>
        {lijst.length} onderzochte plekken met bronnen (supabase/plekken/nijmegen.json). De coördinaten zoekt de app op bij OpenStreetMap; controleer daarna elke plek
        onder Alle plekken en schuif hem zo nodig op zijn plek. Plekken die er al zijn, worden overgeslagen.
      </Text>
      <Melding type="info">{nogNiet.length === 0 ? 'Alle plekken staan al in de database.' : `Nog in te laden: ${nogNiet.map((x) => x.naam).join(', ')}.`}</Melding>
      <Knop titel={bezig ? 'Bezig met inladen' : `${nogNiet.length} plekken inladen`} icoon="cloud-upload" uitgeschakeld={bezig || nogNiet.length === 0} onPress={start} stijl={{ marginTop: ruimte(2) }} />
      {bezig ? <ActivityIndicator style={{ marginTop: ruimte(3) }} /> : null}
      {voortgang.map((v) => (
        <View key={v.naam} style={[s.kaart, { marginTop: ruimte(2) }]}>
          <Text style={s.naam}>
            {v.goed ? '✓' : '!'} {v.naam}
          </Text>
          <Text style={s.sub}>{v.tekst}</Text>
        </View>
      ))}
    </>
  );
}

const s = StyleSheet.create({
  kop: { fontSize: 17, fontWeight: '800', color: kleuren.tekst, marginBottom: 4 },
  kaart: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4), marginBottom: ruimte(3), gap: 4 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), flexWrap: 'wrap' },
  naam: { fontSize: 15, fontWeight: '800', color: kleuren.tekst, flexShrink: 1 },
  sub: { fontSize: 13, color: kleuren.gedempt },
  tekst: { fontSize: 14, color: kleuren.tekst, lineHeight: 20 },
  link: { fontSize: 13, color: kleuren.primair, fontWeight: '700', marginTop: 2 },
  knoppen: { flexDirection: 'row', gap: ruimte(2), marginTop: ruimte(2), flexWrap: 'wrap' },
  knop: { flexGrow: 1, height: 42 },
});
