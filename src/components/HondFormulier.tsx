import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HOND_KLEUREN, RASSEN } from '../data/honden';
import { isoNaarNl, nlNaarIso } from '../lib/tijd';
import { nieuweUuid } from '../lib/account';
import { kleuren, ruimte } from '../theme';
import type { Aanlijnen, Energie, Grootte, Hond, MetHonden } from '../types';
import { HondAvatar } from './avatars';
import { gedeeldeStijl } from './blokken';
import { Chip, Knop, Label, Melding, Veld } from './ui';

export function HondFormulier({ begin, knopTitel, onBewaar, extra }: { begin: Hond | null; knopTitel: string; onBewaar: (h: Hond) => void; extra?: ReactNode }) {
  const [naam, setNaam] = useState(begin?.naam ?? '');
  const [ras, setRas] = useState(begin?.ras ?? '');
  const [rasZoek, setRasZoek] = useState('');
  const [geboorte, setGeboorte] = useState(isoNaarNl(begin?.geboortedatum));
  const [grootte, setGrootte] = useState<Grootte | null>(begin?.grootte ?? null);
  const [energie, setEnergie] = useState<Energie>(begin?.energie ?? 'gemiddeld');
  const [aanlijnen, setAanlijnen] = useState<Aanlijnen>(begin?.aanlijnen ?? 'altijd');
  const [metHonden, setMetHonden] = useState<MetHonden>(begin?.metHonden ?? 'goed');
  const [karakter, setKarakter] = useState(begin?.karakter ?? '');
  const [bijzonderheden, setBijzonderheden] = useState(begin?.bijzonderheden ?? '');
  const [dierenarts, setDierenarts] = useState(begin?.dierenarts ?? '');
  const [kleur, setKleur] = useState<[string, string]>(begin?.kleur ?? HOND_KLEUREN[0]);
  const [geprobeerd, setGeprobeerd] = useState(false);

  const geboorteIso = nlNaarIso(geboorte);
  const fouten = {
    naam: naam.trim().length < 2 ? 'Vul de naam van je hond in.' : null,
    ras: ras ? null : 'Kies een ras of Kruising.',
    geboorte: geboorteIso ? null : 'Gebruik de vorm DD-MM-JJJJ. Weet je het niet precies? Schat dan.',
    grootte: grootte ? null : 'Kies een grootte.',
  };
  const geldig = Object.values(fouten).every((f) => f === null);
  const toon = (f: string | null) => (geprobeerd ? f : null);

  const rasLijst = useMemo(() => {
    const z = rasZoek.trim().toLowerCase();
    const lijst = RASSEN.filter((r) => !z || r.toLowerCase().includes(z));
    return z ? lijst : lijst.slice(0, 12);
  }, [rasZoek]);

  const bewaar = () => {
    setGeprobeerd(true);
    if (!geldig || !geboorteIso || !grootte) return;
    onBewaar({
      id: begin?.id ?? nieuweUuid(),
      naam: naam.trim(),
      ras,
      geboortedatum: geboorteIso,
      grootte,
      energie,
      aanlijnen,
      metHonden,
      karakter: karakter.trim(),
      bijzonderheden: bijzonderheden.trim(),
      dierenarts: dierenarts.trim(),
      kleur,
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={gedeeldeStijl.inhoud} keyboardShouldPersistTaps="handled">
        <View style={s.avatarRij}>
          <HondAvatar hond={{ kleur }} grootte={84} />
          <View style={{ flex: 1 }}>
            <Label>Kleur</Label>
            <View style={s.kleuren}>
              {HOND_KLEUREN.map((k) => (
                <Pressable
                  key={k[0]}
                  onPress={() => setKleur(k)}
                  accessibilityLabel="Kies kleur"
                  style={[s.kleurBol, { backgroundColor: k[1] }, kleur[0] === k[0] ? s.kleurActief : null]}
                />
              ))}
            </View>
            <Text style={gedeeldeStijl.hulp}>{"Foto's uploaden komt in de volgende versie."}</Text>
          </View>
        </View>

        <Veld label="Naam" value={naam} onChangeText={setNaam} placeholder="Bijv. Luna" fout={toon(fouten.naam)} />

        <Veld label={ras ? `Ras: ${ras}` : 'Ras'} value={rasZoek} onChangeText={setRasZoek} placeholder="Zoek een ras" fout={toon(fouten.ras)} />
        <View style={[gedeeldeStijl.rij, { marginTop: -ruimte(2), marginBottom: ruimte(4) }]}>
          {rasLijst.map((r) => (
            <Chip key={r} label={r} actief={ras === r} onPress={() => setRas(r)} />
          ))}
        </View>

        <Veld
          label="Geboortedatum"
          value={geboorte}
          onChangeText={setGeboorte}
          placeholder="DD-MM-JJJJ"
          keyboardType="numbers-and-punctuation"
          fout={toon(fouten.geboorte)}
        />

        <Label>Grootte</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Klein (tot 10 kg)" actief={grootte === 'klein'} onPress={() => setGrootte('klein')} />
          <Chip label="Middel (10 tot 25 kg)" actief={grootte === 'middel'} onPress={() => setGrootte('middel')} />
          <Chip label="Groot (vanaf 25 kg)" actief={grootte === 'groot'} onPress={() => setGrootte('groot')} />
        </View>
        {toon(fouten.grootte) ? <Text style={s.fout}>{fouten.grootte}</Text> : null}

        <View style={{ height: ruimte(4) }} />
        <Label>Energie</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Rustig" actief={energie === 'rustig'} onPress={() => setEnergie('rustig')} />
          <Chip label="Gemiddeld" actief={energie === 'gemiddeld'} onPress={() => setEnergie('gemiddeld')} />
          <Chip label="Energiek" actief={energie === 'energiek'} onPress={() => setEnergie('energiek')} />
        </View>

        <View style={{ height: ruimte(4) }} />
        <Label>Aanlijnen</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Altijd aan de lijn" icoon="link" actief={aanlijnen === 'altijd'} onPress={() => setAanlijnen('altijd')} />
          <Chip label="Mag los in losloopgebied" actief={aanlijnen === 'losloop-ok'} onPress={() => setAanlijnen('losloop-ok')} />
        </View>

        <View style={{ height: ruimte(4) }} />
        <Label>Met andere honden</Label>
        <View style={gedeeldeStijl.rij}>
          <Chip label="Gaat goed" actief={metHonden === 'goed'} onPress={() => setMetHonden('goed')} />
          <Chip label="Wisselend" actief={metHonden === 'soms'} onPress={() => setMetHonden('soms')} />
          <Chip label="Liever niet" actief={metHonden === 'liever-niet'} onPress={() => setMetHonden('liever-niet')} />
        </View>

        <View style={{ height: ruimte(5) }} />
        <Veld label="Karakter" value={karakter} onChangeText={setKarakter} multiline maxLength={300} placeholder="Hoe is je hond onderweg?" />
        <Veld
          label="Bijzonderheden"
          value={bijzonderheden}
          onChangeText={setBijzonderheden}
          multiline
          maxLength={300}
          placeholder="Medicijnen, allergieën, angsten, trekt aan de lijn"
          hulp="De uitlater ziet dit na het accepteren van een boeking."
        />
        <Veld label="Dierenarts" value={dierenarts} onChangeText={setDierenarts} placeholder="Naam en telefoonnummer" hulp="Staat tijdens de wandeling in de app, voor noodgevallen." />

        {aanlijnen === 'losloop-ok' ? (
          <Melding type="info">Loslopen mag alleen in losloopgebieden van de gemeente. Daarbuiten geldt meestal een aanlijnplicht.</Melding>
        ) : null}

        {extra}
        <Knop titel={knopTitel} onPress={bewaar} stijl={{ marginTop: ruimte(4) }} />
        {geprobeerd && !geldig ? <Text style={[s.fout, { textAlign: 'center' }]}>Controleer de rode velden.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  avatarRij: { flexDirection: 'row', gap: ruimte(4), alignItems: 'center', marginBottom: ruimte(6) },
  kleuren: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(2) },
  kleurBol: { width: 30, height: 30, borderRadius: 15 },
  kleurActief: { borderWidth: 3, borderColor: kleuren.tekst },
  fout: { fontSize: 12, color: kleuren.nope, marginTop: 4, fontWeight: '600' },
});
