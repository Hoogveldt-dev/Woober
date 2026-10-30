import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Blok, gedeeldeStijl, Rij, Sectie } from '../components/blokken';
import { Knop, Melding, Veld } from '../components/ui';
import { euro } from '../lib/prijs';
import { MIN_UITBETALING, mutaties, UITBETAAL_DAGEN } from '../lib/saldo';
import { DAGEN_KORT, dagTekst, dagVan } from '../lib/tijd';
import { procent } from '../lib/verdienmodel';
import { afgerondeOpdrachten, verdiendOp } from '../lib/verdiensten';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';

const GRAFIEK_HOOGTE = 120;

/**
 * Saldo (de wallet) van de uitlater, met verdiensten. Te openen onder Account en via het bedrag op het werkscherm.
 * Regels in src/lib/saldo.ts.
 */
export default function Saldo() {
  const router = useRouter();
  const { boekingen, uitbetalingen, klant, uitlater, verdienmodel, saldo, vraagUitbetalingAan, mijnProfiel, herlaadSaldo } = useApp();
  // Echte accounts: het saldo staat in de database en verandert ook buiten de app (uitbetaald, gerouteerd)
  useFocusEffect(
    useCallback(() => {
      herlaadSaldo();
    }, [herlaadSaldo]),
  );
  const [bezig, setBezig] = useState(false);
  const [nu] = useState(() => Date.now());
  const [anderBedrag, setAnderBedrag] = useState<string | null>(null);
  const [uitslag, setUitslag] = useState<{ gelukt: boolean; tekst: string } | null>(null);

  const dagen = Array.from({ length: 7 }, (_, i) => new Date(nu - (6 - i) * 86400000));
  const bedragen = dagen.map((d) => verdiendOp(boekingen, d));
  const [gekozen, setGekozen] = useState(6);
  const max = Math.max(...bedragen, 1);
  const week = bedragen.reduce((t, b) => t + b, 0);
  const deWeek = afgerondeOpdrachten(boekingen).filter((b) => (b.beeindigd ?? 0) > nu - 7 * 86400000);
  const fooien = deWeek.reduce((t, b) => t + b.fooi, 0);
  const commissie = deWeek.reduce((t, b) => t + b.prijs.commissie, 0);
  const bruto = deWeek.reduce((t, b) => t + b.prijs.tarief + b.prijs.toeslag, 0);
  const drukteBonus = deWeek.reduce((t, b) => t + b.prijs.drukteUitlater, 0);
  const rekening = mijnProfiel?.verificatie.uitbetaling ?? false;
  const lijst = mutaties(boekingen, uitbetalingen, (b) => (b.mijnRol === 'uitlater' ? klant(b.klantId)?.voornaam : uitlater(b.uitlaterId)?.voornaam) ?? 'iemand').slice(0, 20);

  const betaalUit = async (bedrag: number) => {
    setBezig(true);
    const u = await vraagUitbetalingAan(bedrag);
    setBezig(false);
    setUitslag(u);
    if (u.gelukt) setAnderBedrag(null);
  };
  // "12,50" of "12.50" naar centen
  const centen = (t: string) => Math.round(Number(t.replace(',', '.').replace(/[^\d.]/g, '')) * 100);

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
      <View style={s.saldo}>
        <Text style={s.label}>Je saldo</Text>
        <Text style={s.totaal}>{euro(saldo)}</Text>
        <Text style={s.uitleg}>
          Wat je verdient, blijft hier staan tot je het laat uitbetalen, in één keer. Boek je zelf een uitlater of oppas, dan kun je ook met je saldo betalen.
        </Text>
        {!rekening ? (
          <Knop titel="Eerst je rekening koppelen" variant="secundair" icoon="card" onPress={() => router.push('/verificatie')} />
        ) : anderBedrag === null ? (
          <View style={{ gap: ruimte(2) }}>
            <Knop titel={`Alles uitbetalen, ${euro(saldo)}`} icoon="arrow-down-circle" uitgeschakeld={saldo <= 0 || bezig} onPress={() => betaalUit(saldo)} />
            {saldo > MIN_UITBETALING ? (
              <Knop
                titel="Ander bedrag"
                variant="tekst"
                onPress={() => {
                  setAnderBedrag('');
                  setUitslag(null);
                }}
              />
            ) : null}
          </View>
        ) : (
          <View>
            <Veld
              label="Bedrag in euro"
              value={anderBedrag}
              onChangeText={(t) => {
                setAnderBedrag(t);
                setUitslag(null);
              }}
              keyboardType="decimal-pad"
              placeholder={`Vanaf ${euro(MIN_UITBETALING)}`}
              autoFocus
            />
            <Knop titel="Uitbetalen" icoon="arrow-down-circle" uitgeschakeld={!anderBedrag.trim() || bezig} onPress={() => betaalUit(centen(anderBedrag))} />
            <Knop titel="Annuleren" variant="tekst" onPress={() => setAnderBedrag(null)} stijl={{ marginTop: ruimte(1) }} />
          </View>
        )}
        {uitslag ? (
          <View style={{ marginTop: ruimte(3) }}>
            <Melding type={uitslag.gelukt ? 'goed' : 'fout'}>{uitslag.tekst}</Melding>
          </View>
        ) : null}
      </View>
      <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(6) }]}>
        Je geld staat bij onze betaalpartner Mollie, een betaalinstelling met een vergunning van De Nederlandsche Bank, niet bij Woober. Uitbetalen kan vanaf{' '}
        {euro(MIN_UITBETALING)}, of je hele saldo in één keer; het gaat naar je eigen Mollie-account, en Mollie maakt het over naar je bank volgens het schema dat je daar
        kiest. Staat geld {UITBETAAL_DAGEN} dagen op je saldo, dan maken we het automatisch over.
      </Text>

      <Sectie>Verdiend, laatste 7 dagen</Sectie>
      <Text style={s.week}>{euro(week)}</Text>
      <View style={s.grafiek} accessibilityLabel={`Verdiensten per dag: ${dagen.map((d, i) => `${DAGEN_KORT[dagVan(d)]} ${euro(bedragen[i])}`).join(', ')}`}>
        {dagen.map((d, i) => {
          const h = bedragen[i] > 0 ? Math.max(4, (bedragen[i] / max) * GRAFIEK_HOOGTE) : 2;
          const actief = gekozen === i;
          return (
            <Pressable key={i} onPress={() => setGekozen(i)} style={s.kolom} accessibilityRole="button" accessibilityLabel={`${DAGEN_KORT[dagVan(d)]}: ${euro(bedragen[i])}`}>
              <View style={s.waardeVak}>{actief ? <Text style={s.waarde}>{euro(bedragen[i])}</Text> : null}</View>
              <View style={[s.staaf, { height: h, opacity: bedragen[i] > 0 ? 1 : 0.3 }, actief && s.staafActief]} />
              <Text style={[s.dag, actief && { color: kleuren.tekst, fontWeight: '800' }]}>{i === 6 ? 'nu' : DAGEN_KORT[dagVan(d)]}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.basislijn} />

      <Blok>
        <Rij label="Jouw tarieven" waarde={euro(bruto)} />
        {drukteBonus > 0 ? <Rij label="Drukte-bonus" waarde={euro(drukteBonus)} /> : null}
        <Rij label="Commissie Woober" waarde={commissie > 0 ? `-${euro(commissie)}` : euro(0)} />
        <Rij label="Fooien (100% voor jou)" waarde={euro(fooien)} />
        <Rij label="Op je saldo gezet" waarde={euro(week)} sterk />
      </Blok>
      <Melding type={verdienmodel.commissiePercentage === 0 ? 'goed' : 'info'}>
        {verdienmodel.commissiePercentage === 0
          ? `Tijdens de ${verdienmodel.naam.toLowerCase()} houdt Woober geen commissie in: je tarief is helemaal voor jou.`
          : `Woober houdt nu ${procent(verdienmodel.commissiePercentage)} commissie in. Wijzigingen hoor je minstens 15 dagen van tevoren.`}
      </Melding>
      <Melding type="info">Je bent zelf verantwoordelijk voor de belastingaangifte van je inkomsten.</Melding>

      <Sectie>Bij en af</Sectie>
      {lijst.length === 0 ? (
        <Text style={gedeeldeStijl.hulp}>Nog niets. Na je eerste wandeling staat hier wat je verdiende.</Text>
      ) : (
        <Blok>
          {lijst.map((m) => (
            <View key={m.id} style={s.mutatie}>
              <View style={{ flex: 1 }}>
                <Text style={s.mutatieTekst}>{m.tekst}</Text>
                <Text style={s.mutatieTijd}>{dagTekst(m.tijd, nu)}</Text>
              </View>
              <Text style={[s.mutatieBedrag, m.bedrag > 0 && { color: kleuren.like }]}>
                {m.bedrag > 0 ? '+' : '-'}
                {euro(Math.abs(m.bedrag))}
              </Text>
            </View>
          ))}
        </Blok>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  saldo: { backgroundColor: kleuren.vlak, borderRadius: radius.groot, padding: ruimte(5), marginBottom: ruimte(3) },
  label: { fontSize: 14, color: kleuren.gedempt },
  totaal: { fontSize: 44, fontWeight: '900', color: kleuren.tekst, letterSpacing: -1 },
  uitleg: { fontSize: 14, color: kleuren.tekst, lineHeight: 20, marginTop: ruimte(1), marginBottom: ruimte(4) },
  week: { fontSize: 28, fontWeight: '800', color: kleuren.tekst, letterSpacing: -0.5 },
  grafiek: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: ruimte(3), height: GRAFIEK_HOOGTE + 48 },
  kolom: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  waardeVak: { height: 22, justifyContent: 'flex-end' },
  waarde: { fontSize: 12, fontWeight: '800', color: kleuren.tekst },
  staaf: { width: '58%', maxWidth: 30, backgroundColor: kleuren.primair, borderTopLeftRadius: 4, borderTopRightRadius: 4, marginTop: 4 },
  staafActief: { backgroundColor: kleuren.primairDonker },
  dag: { fontSize: 12, color: kleuren.gedempt, marginTop: 6, fontWeight: '600' },
  basislijn: { height: 1, backgroundColor: kleuren.rand, marginTop: -22, marginBottom: ruimte(6) },
  mutatie: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingHorizontal: ruimte(4), paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: kleuren.vlak },
  mutatieTekst: { fontSize: 15, color: kleuren.tekst },
  mutatieTijd: { fontSize: 12, color: kleuren.gedempt, marginTop: 1 },
  mutatieBedrag: { fontSize: 15, fontWeight: '800', color: kleuren.tekst },
});
