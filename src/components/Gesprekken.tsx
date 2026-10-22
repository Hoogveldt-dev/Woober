import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppContext';
import { kleuren, ruimte } from '../theme';
import type { Rol } from '../types';
import { PersoonAvatar } from './avatars';
import { Leeg } from './blokken';
import { Kop } from './ui';
import { dagTekst, tijdTekst } from '../lib/tijd';

/** Lijst met gesprekken voor de huidige rol */
export function Gesprekken({ rol }: { rol: Rol }) {
  const router = useRouter();
  const { gesprekken, uitlater, klant } = useApp();
  const lijst = gesprekken.filter((g) => g.rol === rol && g.berichten.length > 0).sort((a, b) => b.berichten[b.berichten.length - 1].tijd - a.berichten[a.berichten.length - 1].tijd);

  return (
    <SafeAreaView style={s.scherm} edges={['top']}>
      <View style={s.kop}>
        <Kop>Berichten</Kop>
      </View>
      {lijst.length === 0 ? (
        <Leeg
          icoon="chat-outline"
          titel="Nog geen berichten"
          tekst={rol === 'eigenaar' ? 'Stuur een uitlater een bericht vanaf het profiel of tijdens een wandeling.' : 'Eigenaren kunnen je een bericht sturen zodra je een verzoek hebt.'}
        />
      ) : (
        <FlatList
          data={lijst}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => {
            const ander = rol === 'eigenaar' ? uitlater(item.id) : klant(item.id);
            if (!ander) return null;
            const kleur: [string, string] = 'kleur' in ander ? ander.kleur : ander.honden[0].kleur;
            const laatste = item.berichten[item.berichten.length - 1];
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Gesprek met ${ander.voornaam}`}
                style={({ pressed }) => [s.rij, pressed && { backgroundColor: kleuren.vlak }]}
              >
                <PersoonAvatar naam={ander.voornaam} kleur={kleur} grootte={56} />
                <View style={{ flex: 1 }}>
                  <View style={s.naamRij}>
                    <Text style={s.naam}>{ander.voornaam}</Text>
                    <Text style={s.tijd}>{dagTekst(laatste.tijd) === 'vandaag' ? tijdTekst(laatste.tijd) : dagTekst(laatste.tijd)}</Text>
                  </View>
                  <Text style={s.laatste} numberOfLines={1}>
                    {laatste.van === 'ik' ? 'Jij: ' : ''}
                    {laatste.tekst}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: kleuren.achtergrond },
  kop: { paddingHorizontal: ruimte(5), paddingTop: ruimte(5), paddingBottom: ruimte(4) },
  rij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(4), paddingHorizontal: ruimte(5), paddingVertical: ruimte(3) },
  naamRij: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  naam: { fontSize: 17, fontWeight: '700', color: kleuren.tekst },
  tijd: { fontSize: 12, color: kleuren.gedempt },
  laatste: { fontSize: 15, color: kleuren.gedempt, marginTop: 3 },
});
