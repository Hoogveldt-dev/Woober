import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BoekingRij } from '../../components/BoekingRij';
import { gedeeldeStijl, Leeg, Sectie } from '../../components/blokken';
import { Kop } from '../../components/ui';
import { LOPEND, useApp } from '../../state/AppContext';
import { ruimte } from '../../theme';
import type { Boeking } from '../../types';

const tijdVan = (b: Boeking) => (b.moment.type === 'later' ? b.moment.tijdstip : b.aangemaakt);

export default function Opdrachten() {
  const router = useRouter();
  const { boekingen, klant } = useApp();
  const mijn = boekingen.filter((b) => b.mijnRol === 'uitlater');
  const nu = mijn.filter((b) => LOPEND.includes(b.status) || b.status === 'aangevraagd');
  const gepland = mijn.filter((b) => b.status === 'gepland').sort((a, b) => tijdVan(a) - tijdVan(b));
  const eerder = mijn.filter((b) => b.status === 'afgerond').sort((a, b) => (b.beeindigd ?? 0) - (a.beeindigd ?? 0)).slice(0, 15);

  const rij = (b: Boeking) => {
    const k = klant(b.klantId);
    if (!k) return null;
    return (
      <BoekingRij
        key={b.id}
        b={b}
        naam={k.voornaam}
        kleur={k.honden[0].kleur}
        honden={k.honden.map((h) => h.naam).join(' en ')}
        bedrag={b.prijs.uitbetaling + b.fooi}
        onPress={() => (b.status === 'aangevraagd' ? router.push('/werk') : router.push({ pathname: '/opdracht/[id]', params: { id: b.id } }))}
      />
    );
  };

  return (
    <SafeAreaView style={gedeeldeStijl.scherm} edges={['top']}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud}>
        <Kop>Opdrachten</Kop>
        <View style={{ height: ruimte(4) }} />
        {mijn.length === 0 ? <Leeg icoon="calendar-blank" titel="Nog geen opdrachten" tekst="Ga online op de kaart om verzoeken uit de buurt te ontvangen." /> : null}
        {nu.length > 0 ? (
          <>
            <Sectie>Nu</Sectie>
            {nu.map(rij)}
          </>
        ) : null}
        {gepland.length > 0 ? (
          <>
            <Sectie>Gepland</Sectie>
            {gepland.map(rij)}
          </>
        ) : null}
        {eerder.length > 0 ? (
          <>
            <Sectie>Afgerond</Sectie>
            {eerder.map(rij)}
          </>
        ) : null}
        <Text style={[gedeeldeStijl.klein, { marginTop: ruimte(4) }]}>Een opdracht afzeggen kan altijd en wordt niet bijgehouden. Zeg wel zo vroeg mogelijk af: zeg je minder dan 2 uur van tevoren af, dan kan de eigenaar dat melden en kijkt een medewerker van Woober ernaar.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
