import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersoonAvatar } from '../../components/avatars';
import { BoekingRij } from '../../components/BoekingRij';
import { gedeeldeStijl, Leeg, Sectie } from '../../components/blokken';
import { Knop, Kop } from '../../components/ui';
import { euro } from '../../lib/prijs';
import { dagenTekst, duurTekst } from '../../lib/tijd';
import { LOPEND, useApp } from '../../state/AppContext';
import { kleuren, radius, ruimte } from '../../theme';
import type { Boeking } from '../../types';

const tijdVan = (b: Boeking) => (b.moment.type === 'later' ? b.moment.tijdstip : b.aangemaakt);

export default function Activiteit() {
  const router = useRouter();
  const { boekingen, series, uitlater, hondenVan, stopSerie, honden } = useApp();
  const mijn = boekingen.filter((b) => b.mijnRol === 'eigenaar');

  const nuBezig = mijn.filter((b) => LOPEND.includes(b.status) || (b.status === 'aangevraagd' && b.moment.type === 'nu'));
  const gepland = mijn.filter((b) => b.status === 'gepland' || (b.status === 'aangevraagd' && b.moment.type !== 'nu')).sort((a, b) => tijdVan(a) - tijdVan(b));
  const eerder = mijn
    .filter((b) => b.status === 'afgerond' || b.status === 'geannuleerd' || b.status === 'geweigerd')
    .sort((a, b) => (b.gestart ?? b.statusSinds) - (a.gestart ?? a.statusSinds));
  const actieveSeries = series.filter((s) => s.actief);

  const open = (b: Boeking) =>
    b.status === 'afgerond' && b.soort === 'betaald'
      ? router.push({ pathname: '/rapport/[id]', params: { id: b.id } })
      : router.push({ pathname: '/wandeling/[id]', params: { id: b.id } });

  const rij = (b: Boeking) => {
    const u = uitlater(b.uitlaterId);
    if (!u) return null;
    return (
      <BoekingRij
        key={b.id}
        b={b}
        naam={u.voornaam}
        kleur={u.kleur}
        honden={hondenVan(b).map((h) => h.naam).join(' en ')}
        bedrag={b.prijs.totaal + b.fooi}
        onPress={() => open(b)}
      />
    );
  };

  const totaalUitgegeven = eerder.filter((b) => b.status === 'afgerond').reduce((t, b) => t + b.prijs.totaal + b.fooi, 0);

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['top']}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud}>
        <Kop>Activiteit</Kop>
        <View style={{ height: ruimte(4) }} />

        {mijn.length === 0 ? (
          <Leeg icoon="calendar-blank" titel="Nog geen wandelingen" tekst="Boek je eerste wandeling vanaf de kaart.">
            <Knop titel="Uitlater zoeken" icoon="paw" onPress={() => router.push('/')} stijl={{ marginTop: ruimte(4) }} />
          </Leeg>
        ) : null}

        {nuBezig.length > 0 ? (
          <>
            <Sectie>Nu</Sectie>
            {nuBezig.map(rij)}
          </>
        ) : null}

        {gepland.length > 0 ? (
          <>
            <Sectie>Gepland</Sectie>
            {gepland.map(rij)}
          </>
        ) : null}

        {actieveSeries.length > 0 ? (
          <>
            <Sectie>Vaste afspraken</Sectie>
            {actieveSeries.map((serie) => {
              const u = uitlater(serie.uitlaterId);
              if (!u) return null;
              const namen = honden.filter((h) => serie.hondIds.includes(h.id)).map((h) => h.naam).join(' en ');
              return (
                <View key={serie.id} style={s.serie}>
                  <PersoonAvatar naam={u.voornaam} kleur={u.kleur} grootte={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.serieTitel}>
                      {serie.dienst === 'oppas' ? 'Oppas' : 'Uitlaten'}: {namen} met {u.voornaam}
                    </Text>
                    <Text style={s.serieSub}>
                      {dagenTekst(serie.dagen)} om {serie.tijd}, {duurTekst(serie.duur)}, {euro(serie.prijs.totaal)} per keer
                    </Text>
                  </View>
                  <Knop titel="Stoppen" variant="tekst" onPress={() => stopSerie(serie.id)} />
                </View>
              );
            })}
          </>
        ) : null}

        {eerder.length > 0 ? (
          <>
            <Sectie>Eerder</Sectie>
            {eerder.map(rij)}
            <Text style={s.totaal}>Totaal uitgegeven aan uitlaten en oppas: {euro(totaalUitgegeven)}</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  serie: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), padding: ruimte(3), borderRadius: radius.midden, backgroundColor: kleuren.vlak, marginBottom: ruimte(2) },
  serieTitel: { fontSize: 15, fontWeight: '700', color: kleuren.tekst },
  serieSub: { fontSize: 13, color: kleuren.gedempt, marginTop: 2 },
  totaal: { fontSize: 13, color: kleuren.gedempt, textAlign: 'center', marginTop: ruimte(4) },
});
