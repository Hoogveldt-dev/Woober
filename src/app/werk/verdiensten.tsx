import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Blok, gedeeldeStijl, Rij, Sectie } from '../../components/blokken';
import { Kop, Melding } from '../../components/ui';
import { euro } from '../../lib/prijs';
import { procent } from '../../lib/verdienmodel';
import { DAGEN_KORT, dagTekst, dagVan, duurTekst, tijdTekst } from '../../lib/tijd';
import { afgerondeOpdrachten, verdiend, verdiendOp } from '../../lib/verdiensten';
import { useApp } from '../../state/AppContext';
import { kleuren, ruimte } from '../../theme';

const GRAFIEK_HOOGTE = 140;

export default function Verdiensten() {
  const { boekingen, klant, verdienmodel } = useApp();
  const [nu] = useState(() => Date.now());
  const dagen = Array.from({ length: 7 }, (_, i) => new Date(nu - (6 - i) * 86400000));
  const bedragen = dagen.map((d) => verdiendOp(boekingen, d));
  const [gekozen, setGekozen] = useState(6);
  const max = Math.max(...bedragen, 1);
  const week = bedragen.reduce((t, b) => t + b, 0);
  const opdrachten = afgerondeOpdrachten(boekingen);
  const deWeek = opdrachten.filter((b) => (b.beeindigd ?? 0) > nu - 7 * 86400000);
  const fooien = deWeek.reduce((t, b) => t + b.fooi, 0);
  const commissie = deWeek.reduce((t, b) => t + b.prijs.commissie, 0);
  const bruto = deWeek.reduce((t, b) => t + b.prijs.tarief + b.prijs.toeslag, 0);
  const drukteBonus = deWeek.reduce((t, b) => t + b.prijs.drukteUitlater, 0);

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['top']}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud}>
        <Kop>Verdiensten</Kop>
        <Text style={s.label}>Laatste 7 dagen</Text>
        <Text style={s.totaal}>{euro(week)}</Text>

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

        <Sectie>Deze week</Sectie>
        <Blok>
          <Rij label="Jouw tarieven" waarde={euro(bruto)} />
          {drukteBonus > 0 ? <Rij label="Drukte-bonus" waarde={euro(drukteBonus)} /> : null}
          <Rij label="Commissie Woober" waarde={commissie > 0 ? `-${euro(commissie)}` : euro(0)} />
          <Rij label="Fooien (100% voor jou)" waarde={euro(fooien)} />
          <Rij label="Uitbetaald" waarde={euro(week)} sterk />
        </Blok>
        <Melding type={verdienmodel.commissiePercentage === 0 ? 'goed' : 'info'}>
          {verdienmodel.commissiePercentage === 0
            ? `Tijdens de ${verdienmodel.naam.toLowerCase()} houdt Woober geen commissie in: je tarief is helemaal voor jou.`
            : `Woober houdt nu ${procent(verdienmodel.commissiePercentage)} commissie in. Wijzigingen hoor je minstens 15 dagen van tevoren.`}
        </Melding>
        <Melding type="info">
          Na elke wandeling zet Woober je geld klaar; Stripe maakt het over naar je eigen rekening, meestal binnen een paar werkdagen. Je bent zelf verantwoordelijk voor de belastingaangifte van je inkomsten.
        </Melding>

        <Sectie>Afgerond</Sectie>
        <Blok>
          {opdrachten.map((b) => {
            const k = klant(b.klantId);
            return (
              <Rij
                key={b.id}
                label={`${dagTekst(b.beeindigd ?? 0, nu)} ${tijdTekst(b.gestart ?? 0)}, ${k?.honden.map((h) => h.naam).join(' en ')} (${b.dienst === 'oppas' ? 'oppas ' : ''}${duurTekst(b.duur)})${b.fooi ? ', met fooi' : ''}`}
                waarde={euro(verdiend(b))}
              />
            );
          })}
        </Blok>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 14, color: kleuren.gedempt, marginTop: ruimte(4) },
  totaal: { fontSize: 40, fontWeight: '900', color: kleuren.tekst, letterSpacing: -1 },
  grafiek: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: ruimte(4), height: GRAFIEK_HOOGTE + 48 },
  kolom: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  waardeVak: { height: 22, justifyContent: 'flex-end' },
  waarde: { fontSize: 12, fontWeight: '800', color: kleuren.tekst },
  staaf: { width: '58%', maxWidth: 30, backgroundColor: kleuren.primair, borderTopLeftRadius: 4, borderTopRightRadius: 4, marginTop: 4 },
  staafActief: { backgroundColor: kleuren.primairDonker },
  dag: { fontSize: 12, color: kleuren.gedempt, marginTop: 6, fontWeight: '600' },
  basislijn: { height: 1, backgroundColor: kleuren.rand, marginTop: -22, marginBottom: ruimte(8) },
});
