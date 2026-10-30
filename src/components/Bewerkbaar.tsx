import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bewaarTekst, TEKSTEN, zetTekstTerug, type TekstDefinitie, type TekstSleutel } from '../lib/teksten';
import { useApp } from '../state/AppContext';
import { useTeksten } from '../state/Teksten';
import { kleuren, radius, ruimte, schaduw } from '../theme';
import { OnderBlad } from './blokken';
import { Badge, Knop, Melding, Veld } from './ui';

/**
 * Bewerkmodus voor beheerders: zet je hem aan onder Account, Beheer, dan staat bij elke aanpasbare tekst een
 * hamertje. Tik erop, pas de tekst aan en sla op; iedereen ziet het daarna. Een tekst aanpasbaar maken:
 * zet hem in src/lib/teksten.ts, gebruik useTekst() en zet <Bewerkbaar sleutels="..."> om wat hem toont.
 */
export function useBewerkmodus(): boolean {
  const { beheerder } = useApp();
  const { bewerken } = useTeksten();
  return beheerder && bewerken;
}

/**
 * Laat in de bewerkmodus een hamertje zien bij wat erin staat; daarbuiten verandert er niets.
 * `leeg`: de tekst is leeg en staat daarom normaal niet op het scherm. In de bewerkmodus komt er dan een vak voor
 * in de plaats, zodat je hem toch kunt invullen.
 */
export function Bewerkbaar({
  sleutels,
  children,
  leeg,
  stijl,
}: {
  sleutels: TekstSleutel | TekstSleutel[];
  children?: ReactNode;
  leeg?: boolean;
  stijl?: StyleProp<ViewStyle>;
}) {
  const aan = useBewerkmodus();
  const [open, setOpen] = useState(false);
  const lijst = Array.isArray(sleutels) ? sleutels : [sleutels];
  if (!aan) return leeg ? null : <>{children}</>;

  const naam = lijst.map((k) => TEKSTEN[k].label).join(', ');
  return (
    <View style={[s.vak, stijl]}>
      {leeg ? (
        <View style={s.leeg}>
          <Text style={s.leegTekst}>{naam}: leeg, dus niet zichtbaar</Text>
        </View>
      ) : (
        children
      )}
      <View pointerEvents="none" style={s.rand} />
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Aanpassen: ${naam}`} style={({ pressed }) => [s.hamer, pressed && { transform: [{ scale: 0.9 }] }]}>
        <Ionicons name="hammer" size={12} color="#fff" />
      </Pressable>
      <TekstBlad sleutels={lijst} zichtbaar={open} sluit={() => setOpen(false)} />
    </View>
  );
}

/** Het venster dat opent na een tik op het hamertje */
function TekstBlad({ sleutels, zichtbaar, sluit }: { sleutels: TekstSleutel[]; zichtbaar: boolean; sluit: () => void }) {
  return (
    <OnderBlad zichtbaar={zichtbaar} sluit={sluit} stijl={{ maxHeight: '85%', paddingTop: ruimte(3) }}>
      <View style={s.bladKop}>
        <Ionicons name="hammer" size={18} color={kleuren.primair} />
        <Text style={s.bladTitel}>{sleutels.length === 1 ? 'Tekst aanpassen' : 'Teksten aanpassen'}</Text>
        <Knop titel="Klaar" variant="tekst" onPress={sluit} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: ruimte(2) }}>
        <Text style={[s.uitleg]}>Wat je opslaat, ziet iedereen de volgende keer dat de app opent, ook op woober.nl.</Text>
        {sleutels.map((k) => (
          <TekstVeld key={k} sleutel={k} definitie={TEKSTEN[k]} />
        ))}
      </ScrollView>
    </OnderBlad>
  );
}

/** Eén aanpasbare tekst met Opslaan en Standaard; ook gebruikt in de lijst onder Beheer, Teksten */
export function TekstVeld({ sleutel, definitie }: { sleutel: TekstSleutel; definitie: TekstDefinitie }) {
  const { aanpassingen, herlaad } = useTeksten();
  const aangepast = aanpassingen[sleutel] !== undefined;
  const huidig = aanpassingen[sleutel] ?? definitie.standaard;
  const [waarde, setWaarde] = useState(huidig);
  const [bezig, setBezig] = useState(false);
  const [uitslag, setUitslag] = useState<{ goed: boolean; tekst: string } | null>(null);
  const gewijzigd = waarde !== huidig;

  const doe = async (actie: () => Promise<void>, gelukt: string, nieuw?: string) => {
    setBezig(true);
    setUitslag(null);
    try {
      await actie();
      await herlaad();
      if (nieuw !== undefined) setWaarde(nieuw);
      setUitslag({ goed: true, tekst: gelukt });
    } catch (e) {
      setUitslag({ goed: false, tekst: e instanceof Error ? e.message : 'Er ging iets mis.' });
    } finally {
      setBezig(false);
    }
  };

  return (
    <View style={s.kaart}>
      <View style={s.kop}>
        <Text style={s.label}>{definitie.label}</Text>
        {aangepast ? <Badge tekst="AANGEPAST" kleur={kleuren.primair} /> : null}
      </View>
      <Veld
        label=""
        accessibilityLabel={definitie.label}
        value={waarde}
        onChangeText={(t) => {
          setWaarde(t);
          setUitslag(null);
        }}
        multiline={definitie.lang}
        hulp={definitie.hulp}
      />
      {aangepast && definitie.standaard ? <Text style={s.standaard}>Standaard: {definitie.standaard}</Text> : null}
      <View style={s.knoppen}>
        <Knop
          titel="Opslaan"
          uitgeschakeld={!gewijzigd || bezig}
          onPress={() => doe(() => bewaarTekst(sleutel, waarde.trim()), 'Opgeslagen. Iedereen ziet nu deze tekst.')}
          stijl={{ flex: 1, height: 44 }}
        />
        {aangepast ? (
          <Knop
            titel="Standaard"
            variant="secundair"
            uitgeschakeld={bezig}
            onPress={() => doe(() => zetTekstTerug(sleutel), 'De standaardtekst staat weer terug.', definitie.standaard)}
            stijl={{ flex: 1, height: 44 }}
          />
        ) : null}
      </View>
      {uitslag ? (
        <View style={{ marginTop: ruimte(2) }}>
          <Melding type={uitslag.goed ? 'goed' : 'fout'}>{uitslag.tekst}</Melding>
        </View>
      ) : null}
    </View>
  );
}

/** Balk onderin zolang de bewerkmodus aan staat, op elk scherm, met een knop om hem uit te zetten */
export function BewerkBalk() {
  const aan = useBewerkmodus();
  const { zetBewerken } = useTeksten();
  const insets = useSafeAreaInsets();
  if (!aan) return null;
  return (
    <View style={[s.balkBuiten, { bottom: insets.bottom + 64 }]} pointerEvents="box-none">
      <View style={[s.balk, schaduw]}>
        <Ionicons name="hammer" size={16} color="#fff" />
        <Text style={s.balkTekst}>Bewerkmodus</Text>
        <Pressable onPress={() => zetBewerken(false)} accessibilityRole="button" hitSlop={8} style={s.balkKnop}>
          <Text style={s.balkKnopTekst}>Klaar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  vak: { position: 'relative' },
  rand: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: kleuren.primair, borderRadius: radius.klein },
  hamer: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: kleuren.primair,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  leeg: { paddingVertical: ruimte(3), paddingHorizontal: ruimte(3), marginBottom: ruimte(2), borderRadius: radius.klein, backgroundColor: kleuren.primairVlak },
  leegTekst: { fontSize: 13, color: kleuren.gedempt, fontStyle: 'italic' },
  bladKop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), marginBottom: ruimte(2) },
  bladTitel: { flex: 1, fontSize: 18, fontWeight: '800', color: kleuren.tekst },
  uitleg: { fontSize: 13, color: kleuren.gedempt, lineHeight: 18, marginBottom: ruimte(3) },
  kaart: { borderWidth: 1, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4), marginBottom: ruimte(3) },
  kop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ruimte(2), marginBottom: ruimte(2) },
  label: { flex: 1, fontSize: 15, fontWeight: '800', color: kleuren.tekst },
  standaard: { fontSize: 12, color: kleuren.gedempt, lineHeight: 17, marginTop: -ruimte(2), marginBottom: ruimte(3) },
  knoppen: { flexDirection: 'row', gap: ruimte(2) },
  // Links onderin, zodat hij zo min mogelijk over knoppen valt (rechtsonder zit op het web het Netlify-logo)
  balkBuiten: { position: 'absolute', left: ruimte(4) },
  balk: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2), backgroundColor: kleuren.tekst, borderRadius: radius.rond, paddingLeft: ruimte(3), paddingRight: 4, paddingVertical: 4 },
  balkTekst: { color: '#fff', fontSize: 13, fontWeight: '700' },
  balkKnop: { backgroundColor: kleuren.primair, borderRadius: radius.rond, paddingHorizontal: ruimte(3), paddingVertical: 5 },
  balkKnopTekst: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
