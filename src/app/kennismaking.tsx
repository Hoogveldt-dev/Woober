import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PersoonAvatar } from '../components/avatars';
import { gedeeldeStijl } from '../components/blokken';
import { Chip, Knop, Label, Melding, Veld } from '../components/ui';
import { afgiftePunten } from '../lib/huis';
import { DAGEN_KORT, dagdeelVan, dagVan, tijdstipOp } from '../lib/tijd';
import { useApp } from '../state/AppContext';
import { kleuren, ruimte } from '../theme';
import type { Plek } from '../types';

const TIJDEN = ['09:00', '12:30', '17:30', '19:00', '20:00'];

export default function Kennismaking() {
  const { uitlaterId } = useLocalSearchParams<{ uitlaterId: string }>();
  const router = useRouter();
  const { uitlater, honden, vraagKennismakingAan, plekken, gebruiker } = useApp();
  const u = uitlater(uitlaterId ?? '');
  const [nu] = useState(() => Date.now());
  const [dag, setDag] = useState(1);
  const [tijd, setTijd] = useState<string | null>(null);
  // Kennismaken bij jou thuis, of op een openbare plek als je je adres nog niet wilt delen
  const [plek, setPlek] = useState<Plek | null>(null);
  const [bericht, setBericht] = useState(u ? `Hoi ${u.voornaam}! Zullen we kennismaken? Dan kun je ${honden.map((h) => h.naam).join(' en ')} ontmoeten.` : '');

  if (!u) return <Redirect href="/" />;

  const kanOp = (d: number, t: string) => {
    const tijdstip = tijdstipOp(d, t, nu);
    const datum = new Date(tijdstip);
    return tijdstip > nu + 60 * 60000 && u.beschikbaarheid[dagVan(datum)].includes(dagdeelVan(datum.getHours()));
  };

  const verstuur = () => {
    if (!tijd) return;
    const id = vraagKennismakingAan(u.id, tijdstipOp(dag, tijd, nu), bericht, plek ? { omschrijving: plek.naam, punt: plek.punt } : undefined);
    router.dismissAll();
    router.push({ pathname: '/wandeling/[id]', params: { id } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <View style={s.kop}>
          <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={72} />
          <MaterialCommunityIcons name="handshake" size={28} color={kleuren.primair} />
          <View style={s.hond}>
            <MaterialCommunityIcons name="dog" size={40} color="#fff" />
          </View>
        </View>
        <Text style={[gedeeldeStijl.titel, { textAlign: 'center' }]}>Eerst even kennismaken</Text>
        <Text style={[gedeeldeStijl.sub, { textAlign: 'center', marginBottom: ruimte(5) }]}>
          {u.voornaam} komt een kwartiertje langs om jou en je {honden.length > 1 ? 'honden' : 'hond'} te ontmoeten. Gratis en zonder verplichtingen.
        </Text>

        <Label>Waar</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Bij mij thuis" icoon="home" actief={!plek} onPress={() => setPlek(null)} />
          {gebruiker
            ? afgiftePunten(plekken, gebruiker.thuis).map((p) => <Chip key={p.id} label={p.naam} icoon="location" actief={plek?.id === p.id} onPress={() => setPlek(p)} />)
            : null}
        </View>
        <Text style={[gedeeldeStijl.hulp, { marginTop: ruimte(2), marginBottom: ruimte(4) }]}>
          {plek ? `${u.voornaam} ziet je adres dan niet. Je kunt ook later op een ander punt afgeven.` : `${u.voornaam} ziet je adres pas als de kennismaking is bevestigd.`}
        </Text>

        <Label>Dag</Label>
        <View style={gedeeldeStijl.rij}>
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const datum = new Date(nu + d * 86400000);
            const label = d === 0 ? 'Vandaag' : d === 1 ? 'Morgen' : `${DAGEN_KORT[dagVan(datum)]} ${datum.getDate()}`;
            const mogelijk = TIJDEN.some((t) => kanOp(d, t));
            return (
              <Chip
                key={d}
                label={label}
                actief={dag === d}
                onPress={() => {
                  if (!mogelijk) return;
                  setDag(d);
                  setTijd(null);
                }}
              />
            );
          })}
        </View>
        <View style={{ height: ruimte(4) }} />
        <Label>Tijd</Label>
        <View style={gedeeldeStijl.rij}>
          {TIJDEN.filter((t) => kanOp(dag, t)).map((t) => (
            <Chip key={t} label={t} actief={tijd === t} onPress={() => setTijd(t)} />
          ))}
          {TIJDEN.every((t) => !kanOp(dag, t)) ? <Text style={gedeeldeStijl.hulp}>{u.voornaam} is deze dag niet beschikbaar. Kies een andere dag.</Text> : null}
        </View>

        <View style={{ height: ruimte(5) }} />
        <Veld label="Bericht" value={bericht} onChangeText={setBericht} multiline maxLength={300} />

        <Melding type="info">
          Bespreek bij de kennismaking hoe je hond reageert op andere honden, fietsers en verkeer, hoe het met de sleutel gaat en, bij oppas, wat de huisregels zijn. Daarna kun je boeken.
        </Melding>

        <Knop titel="Kennismaking aanvragen" icoon="hand-left" uitgeschakeld={!tijd} onPress={verstuur} stijl={{ marginTop: ruimte(4) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ruimte(3), marginBottom: ruimte(4) },
  hond: { width: 72, height: 72, borderRadius: 36, backgroundColor: kleuren.primair, alignItems: 'center', justifyContent: 'center' },
});
