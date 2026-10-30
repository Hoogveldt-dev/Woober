import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { euro } from '../lib/prijs';
import { duurTekst, momentTekst } from '../lib/tijd';
import { LOPEND, useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Boeking } from '../types';
import { PersoonAvatar } from './avatars';

const STATUS: Record<Boeking['status'], { tekst: string; kleur: string }> = {
  aangevraagd: { tekst: 'Aangevraagd', kleur: kleuren.waarschuwing },
  gepland: { tekst: 'Bevestigd', kleur: kleuren.like },
  onderweg: { tekst: 'Onderweg', kleur: kleuren.info },
  aangekomen: { tekst: 'Voor de deur', kleur: kleuren.info },
  bezig: { tekst: 'Live', kleur: kleuren.primair },
  afgerond: { tekst: 'Afgerond', kleur: kleuren.gedempt },
  geannuleerd: { tekst: 'Geannuleerd', kleur: kleuren.gedempt },
  geweigerd: { tekst: 'Niet mogelijk', kleur: kleuren.gedempt },
};

/** Eén boeking in een lijst, vanuit de rol van de gebruiker */
export function BoekingRij({
  b,
  naam,
  kleur,
  honden,
  bedrag,
  onPress,
}: {
  b: Boeking;
  naam: string;
  kleur: [string, string];
  honden: string;
  /** Bedrag dat in de lijst staat: wat de eigenaar betaalt of wat de uitlater ontvangt */
  bedrag: number;
  onPress: () => void;
}) {
  const status = STATUS[b.status];
  const kennismaking = b.soort === 'kennismaking';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.rij, pressed && { backgroundColor: kleuren.vlak }]}>
      <PersoonAvatar naam={naam} kleur={kleur} grootte={48} />
      <View style={{ flex: 1 }}>
        <Text style={s.titel} numberOfLines={1}>
          {kennismaking ? `Kennismaking met ${naam}` : b.dienst === 'oppas' ? `Oppas voor ${honden}, ${naam}` : `${honden} met ${naam}`}
        </Text>
        <Text style={s.sub} numberOfLines={1}>
          {b.status === 'afgerond' || b.status === 'geannuleerd'
            ? momentTekst({ type: 'later', tijdstip: b.gestart ?? b.statusSinds })
            : momentTekst(b.moment)}
          {kennismaking ? '' : `, ${duurTekst(b.duur)}`}
        </Text>
        <View style={s.statusRij}>
          <View style={[s.stip, { backgroundColor: status.kleur }]} />
          <Text style={[s.status, { color: status.kleur }]}>{status.tekst}</Text>
          {b.serieId ? <Ionicons name="repeat" size={13} color={kleuren.gedempt} /> : null}
          {b.beoordelingDoorMij ? <Ionicons name="star" size={12} color={kleuren.ster} /> : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {!kennismaking ? <Text style={s.bedrag}>{b.status === 'geannuleerd' ? euro(b.annuleringskosten ?? 0) : euro(bedrag)}</Text> : <Text style={s.gratis}>Gratis</Text>}
        <Ionicons name="chevron-forward" size={16} color={kleuren.gedempt} style={{ marginTop: 4 }} />
      </View>
    </Pressable>
  );
}

const tijdVan = (b: Boeking) => (b.moment.type === 'later' ? b.moment.tijdstip : b.aangemaakt);

/** Boekingen van de eigenaar, verdeeld zoals ze in de app staan: nu bezig, gepland en eerder */
export function eigenaarBoekingen(boekingen: Boeking[]) {
  const mijn = boekingen.filter((b) => b.mijnRol === 'eigenaar');
  return {
    nuBezig: mijn.filter((b) => LOPEND.includes(b.status) || (b.status === 'aangevraagd' && b.moment.type === 'nu')),
    gepland: mijn.filter((b) => b.status === 'gepland' || (b.status === 'aangevraagd' && b.moment.type !== 'nu')).sort((a, b) => tijdVan(a) - tijdVan(b)),
    eerder: mijn
      .filter((b) => b.status === 'afgerond' || b.status === 'geannuleerd' || b.status === 'geweigerd')
      .sort((a, b) => (b.gestart ?? b.statusSinds) - (a.gestart ?? a.statusSinds)),
  };
}

/** Boeking in een lijst van de eigenaar: een betaalde, afgeronde wandeling opent het rapport, de rest de wandeling */
export function EigenaarBoeking({ b }: { b: Boeking }) {
  const router = useRouter();
  const { uitlater, hondenVan } = useApp();
  const u = uitlater(b.uitlaterId);
  if (!u) return null;
  return (
    <BoekingRij
      b={b}
      naam={u.voornaam}
      kleur={u.kleur}
      honden={hondenVan(b).map((h) => h.naam).join(' en ')}
      bedrag={b.prijs.totaal + b.fooi}
      onPress={() =>
        b.status === 'afgerond' && b.soort === 'betaald'
          ? router.push({ pathname: '/rapport/[id]', params: { id: b.id } })
          : router.push({ pathname: '/wandeling/[id]', params: { id: b.id } })
      }
    />
  );
}

const s = StyleSheet.create({
  rij: { flexDirection: 'row', alignItems: 'center', gap: ruimte(3), paddingVertical: ruimte(3), paddingHorizontal: ruimte(2), borderRadius: radius.midden },
  titel: { fontSize: 16, fontWeight: '700', color: kleuren.tekst },
  sub: { fontSize: 14, color: kleuren.gedempt, marginTop: 1 },
  statusRij: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  stip: { width: 7, height: 7, borderRadius: 4 },
  status: { fontSize: 12, fontWeight: '700' },
  bedrag: { fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  gratis: { fontSize: 13, fontWeight: '700', color: kleuren.like },
});
