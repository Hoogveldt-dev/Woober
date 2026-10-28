import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Blok, gedeeldeStijl, MenuRij, Rij, Sectie, Tegel, useNu } from '../components/blokken';
import { Chip, Knop, Melding, Veld } from '../components/ui';
import { laadCijfers, laadVerdienmodellen, planVerdienmodel, type Cijfers, type ModelKort, type Planning } from '../lib/beheer';
import { datumTijdTekst } from '../lib/tijd';
import { procent } from '../lib/verdienmodel';
import { useApp } from '../state/AppContext';
import { ruimte } from '../theme';

const DAG = 86400000;

/** Middernacht over een aantal dagen, in de tijdzone van de telefoon */
function middernachtOver(dagen: number) {
  const d = new Date(Date.now() + dagen * DAG);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const MOMENTEN = [
  { label: 'Morgen', dagen: 1 },
  { label: 'Over 16 dagen', dagen: 16 },
  { label: 'Over 30 dagen', dagen: 30 },
];

/** Alleen voor beheerders (het team). De database controleert dat ook zelf. */
export default function Beheer() {
  const router = useRouter();
  const { gebruiker } = useApp();
  const [gegevens, setGegevens] = useState<{ actief: string | null; planning: Planning[]; modellen: ModelKort[] } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [dagen, setDagen] = useState(16);
  const [toelichting, setToelichting] = useState('');
  const [bevestig, setBevestig] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [gelukt, setGelukt] = useState<string | null>(null);

  const [cijfers, setCijfers] = useState<Cijfers | null>(null);
  const laad = useCallback(() => {
    laadVerdienmodellen().then(setGegevens, (e: Error) => setFout(e.message));
    laadCijfers().then(setCijfers, () => setCijfers(null));
  }, []);
  useEffect(laad, [laad]);

  const naam = (id: string | null) => gegevens?.modellen.find((m) => m.id === id)?.naam ?? id ?? 'onbekend';
  const actief = gegevens?.modellen.find((m) => m.id === gegevens.actief);
  const gekozen = gegevens?.modellen.find((m) => m.id === model);
  const nu = useNu(60000);
  const komend = gegevens?.planning.filter((p) => p.geldigVanaf > nu) ?? [];
  const eerder = gegevens?.planning.filter((p) => p.geldigVanaf <= nu).slice(0, 5) ?? [];
  const hogereCommissie = gekozen && actief ? gekozen.commissie > actief.commissie : false;

  const plan = async () => {
    if (!model) return;
    setBezig(true);
    setFout(null);
    try {
      await planVerdienmodel(model, middernachtOver(dagen), toelichting.trim() || `Ingepland door ${gebruiker?.voornaam ?? 'beheer'}`);
      setGelukt(`${naam(model)} geldt vanaf ${datumTijdTekst(middernachtOver(dagen))}.`);
      setModel(null);
      setToelichting('');
      setBevestig(false);
      laad();
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Inplannen lukte niet.');
    } finally {
      setBezig(false);
    }
  };

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
      <Text style={gedeeldeStijl.titel}>Beheer</Text>
      <Text style={[gedeeldeStijl.sub, { marginBottom: ruimte(5) }]}>Alleen zichtbaar voor het team. Wat je hier instelt, geldt voor alle gebruikers.</Text>

      {cijfers ? (
        <>
          <Sectie>Cijfers</Sectie>
          <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(2) }]}>
            <Tegel klein waarde={String(cijfers.accounts)} label="accounts" />
            <Tegel klein waarde={String(cijfers.eigenaren)} label="eigenaren" />
            <Tegel klein waarde={`${cijfers.uitlaters_geverifieerd}/${cijfers.uitlaters}`} label="uitlaters zichtbaar" />
          </View>
          <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(5) }]}>
            <Tegel klein waarde={String(cijfers.honden)} label="honden" />
            <Tegel klein waarde={String(cijfers.plekken)} label="plekken" />
            <Tegel klein waarde={String(cijfers.wachtlijst)} label="op de wachtlijst" />
          </View>
        </>
      ) : null}

      <Sectie>Beheren</Sectie>
      <Blok>
        <MenuRij
          icoon="location"
          titel="Plekken en meldingen"
          sub={cijfers ? `Te bekijken: ${cijfers.plekken_nieuw} ${cijfers.plekken_nieuw === 1 ? 'plek' : 'plekken'}, ${cijfers.meldingen_open} ${cijfers.meldingen_open === 1 ? 'melding' : 'meldingen'}` : 'Nieuwe plekken, meldingen, inladen'}
          onPress={() => router.push('/beheer-plekken')}
        />
        <MenuRij icoon="shield-checkmark" titel="Uitlaters verifiëren" sub="Identiteit, verzekering en rekening" onPress={() => router.push('/beheer-uitlaters')} />
        <MenuRij icoon="people" titel="Wachtlijst" sub="Wie het wil weten zodra Woober in de buurt start" onPress={() => router.push('/beheer-wachtlijst')} />
        <MenuRij icoon="create" titel="Teksten in de app" sub="Welkomscherm, mededeling, meldingen, privacyverklaring" onPress={() => router.push('/beheer-teksten')} />
      </Blok>

      <Sectie>Verdienmodel</Sectie>
      {!gegevens && !fout ? <ActivityIndicator style={{ marginBottom: ruimte(4) }} /> : null}
      {gegevens ? (
        <Blok>
          <Rij label="Nu actief" waarde={naam(gegevens.actief)} sterk />
          {actief ? <Rij label="Commissie" waarde={procent(actief.commissie)} /> : null}
          {komend.map((p) => (
            <Rij key={p.id} label={`Vanaf ${datumTijdTekst(p.geldigVanaf)}`} waarde={naam(p.modelId)} />
          ))}
        </Blok>
      ) : null}
      {eerder.length > 1 ? (
        <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(3), marginBottom: ruimte(4) }]}>
          Eerder: {eerder.slice(1).map((p) => `${naam(p.modelId)} (${datumTijdTekst(p.geldigVanaf)})`).join(', ')}
        </Text>
      ) : null}

      {gegevens ? (
        <>
          <Sectie>Nieuw model inplannen</Sectie>
          <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(3) }]}>
            {gegevens.modellen.map((m) => (
              <Chip key={m.id} label={m.naam} actief={model === m.id} onPress={() => { setModel(m.id); setBevestig(false); setGelukt(null); }} />
            ))}
          </View>
          {gekozen ? <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(3) }]}>{gekozen.omschrijving}. Commissie {procent(gekozen.commissie)}.</Text> : null}

          <View style={[gedeeldeStijl.rij, { marginBottom: ruimte(3) }]}>
            {MOMENTEN.map((m) => (
              <Chip key={m.dagen} label={m.label} actief={dagen === m.dagen} onPress={() => { setDagen(m.dagen); setBevestig(false); }} />
            ))}
          </View>
          {hogereCommissie && dagen < 16 ? (
            <Melding type="waarschuwing">Dit model heeft een hogere commissie. Kondig het minstens 15 dagen vooraf aan bij uitlaters (P2B-verordening); de database weigert een eerdere datum.</Melding>
          ) : null}

          <Veld label="Toelichting" value={toelichting} onChangeText={setToelichting} placeholder="Bijv. aangekondigd per e-mail op 1 november" />

          {!bevestig ? (
            <Knop titel="Inplannen" uitgeschakeld={!model} onPress={() => setBevestig(true)} />
          ) : (
            <View style={{ gap: ruimte(2) }}>
              <Melding type="info">
                {naam(model)} gaat in op {datumTijdTekst(middernachtOver(dagen))}. Een ingepland model kun je niet meer aanpassen; bestaande boekingen houden hun prijs.
              </Melding>
              <Knop titel={bezig ? 'Bezig' : 'Ja, inplannen'} uitgeschakeld={bezig} onPress={plan} />
              <Knop titel="Annuleren" variant="tekst" onPress={() => setBevestig(false)} />
            </View>
          )}
        </>
      ) : null}
      {gelukt ? <Melding type="goed">{gelukt}</Melding> : null}
      {fout ? <Melding type="fout">{fout}</Melding> : null}

      <View style={{ height: ruimte(4) }} />
      <Sectie>Doorrekenen</Sectie>
      <Blok>
        <MenuRij
          icoon="calculator"
          titel="Fases vergelijken"
          sub="Prijzen per fase en drukte nabootsen. Verandert alleen wat jij in deze app ziet."
          onPress={() => router.push('/verdienmodel')}
        />
      </Blok>
    </ScrollView>
  );
}
