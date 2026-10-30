import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PersoonAvatar } from '../components/avatars';
import { EigenaarBoeking, eigenaarBoekingen } from '../components/BoekingRij';
import { gedeeldeStijl, Leeg, Sectie } from '../components/blokken';
import { Knop } from '../components/ui';
import { euro } from '../lib/prijs';
import { dagenTekst, duurTekst } from '../lib/tijd';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';

/** Wat nu loopt en wat eraan komt, voor de eigenaar. Te openen vanaf Zoeken; eerdere boekingen staan onder Account. */
export default function Afspraken() {
  const router = useRouter();
  const { boekingen, series, uitlater, stopSerie, honden, prijsVoor } = useApp();
  const { nuBezig, gepland } = eigenaarBoekingen(boekingen);
  const actieveSeries = series.filter((s) => s.actief);

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud}>
      {nuBezig.length + gepland.length + actieveSeries.length === 0 ? (
        <Leeg icoon="calendar-blank" titel="Geen afspraken" tekst="Geplande wandelingen, oppas en vaste afspraken komen hier te staan.">
          <Knop titel="Uitlater zoeken" icoon="paw" onPress={() => router.replace('/')} stijl={{ marginTop: ruimte(4) }} />
        </Leeg>
      ) : null}

      {nuBezig.length > 0 ? (
        <>
          <Sectie>Nu</Sectie>
          {nuBezig.map((b) => (
            <EigenaarBoeking key={b.id} b={b} />
          ))}
        </>
      ) : null}

      {gepland.length > 0 ? (
        <>
          <Sectie>Gepland</Sectie>
          {gepland.map((b) => (
            <EigenaarBoeking key={b.id} b={b} />
          ))}
        </>
      ) : null}

      {actieveSeries.length > 0 ? (
        <>
          <Sectie>Vaste afspraken</Sectie>
          {actieveSeries.map((serie) => {
            const u = uitlater(serie.uitlaterId);
            if (!u) return null;
            const prijs = prijsVoor(u, serie.dienst, serie.duur, serie.hondIds.length, { type: 'wekelijks', dagen: serie.dagen, tijd: serie.tijd });
            const namen = honden.filter((h) => serie.hondIds.includes(h.id)).map((h) => h.naam).join(' en ');
            return (
              <View key={serie.id} style={s.serie}>
                <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.serieTitel}>
                    {serie.dienst === 'oppas' ? 'Oppas' : 'Uitlaten'}: {namen} met {u.voornaam}
                  </Text>
                  <Text style={s.serieSub}>
                    {dagenTekst(serie.dagen)} om {serie.tijd}, {duurTekst(serie.duur)}, {euro(prijs.totaal)} per keer
                  </Text>
                </View>
                <Knop titel="Stoppen" variant="tekst" onPress={() => stopSerie(serie.id)} />
              </View>
            );
          })}
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  serie: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), padding: ruimte(3), borderRadius: radius.midden, backgroundColor: kleuren.vlak, marginBottom: ruimte(2) },
  serieTitel: { fontSize: 15, fontWeight: '700', color: kleuren.tekst },
  serieSub: { fontSize: 13, color: kleuren.gedempt, marginTop: 2 },
});
