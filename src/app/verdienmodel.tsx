import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Blok, gedeeldeStijl, Rij, Sectie, Tegel, Vinkje } from '../components/blokken';
import { Melding } from '../components/ui';
import { berekenPrijs, euro } from '../lib/prijs';
import { duurTekst } from '../lib/tijd';
import { factorTekst, procent, VERDIENMODEL_VOLGORDE, VERDIENMODELLEN, type Verdienmodel } from '../lib/verdienmodel';
import { useApp } from '../state/AppContext';
import { kleuren, radius, ruimte } from '../theme';
import type { Dienst, Uitlater } from '../types';

type IconNaam = ComponentProps<typeof Ionicons>['name'];

const VOORBEELDEN: { dienst: Dienst; duur: number }[] = [
  { dienst: 'uitlaten', duur: 30 },
  { dienst: 'oppas', duur: 180 },
];

function kenmerken(m: Verdienmodel): string[] {
  const k: string[] = [];
  k.push(m.servicekostenPercentage > 0 ? `Service ${procent(m.servicekostenPercentage)}` : 'Geen servicekosten');
  if (m.boekingskosten > 0) k.push(`Boeking ${euro(m.boekingskosten)}`);
  k.push(m.commissiePercentage > 0 ? `Commissie ${procent(m.commissiePercentage)}` : 'Geen commissie');
  if (m.drukte.aan) k.push('Drukte');
  if (m.plus.aan) k.push('Plus');
  return k;
}

function Punt({ icoon, titel, tekst }: { icoon: IconNaam; titel: string; tekst: string }) {
  return (
    <View style={s.punt}>
      <View style={s.puntIcoon}>
        <Ionicons name={icoon} size={18} color={kleuren.primair} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.puntTitel}>{titel}</Text>
        <Text style={s.puntTekst}>{tekst}</Text>
      </View>
    </View>
  );
}

function Voorbeeld({ uitlater, dienst, duur, model, drukteFactor, plus }: { uitlater: Uitlater; dienst: Dienst; duur: number; model: Verdienmodel; drukteFactor: number; plus: boolean }) {
  const p = berekenPrijs(uitlater, dienst, duur, 1, model, { drukteFactor, plus });
  return (
    <View>
      <Text style={s.voorbeeldTitel}>
        {uitlater.voornaam}, {dienst === 'oppas' ? `${duurTekst(duur)} oppas` : `${duur} minuten uitlaten`}
      </Text>
      <View style={s.tegels}>
        <Tegel klein waarde={euro(p.totaal)} label="betaald" />
        <Tegel klein waarde={euro(p.uitbetaling)} label="uitbetaald" />
        <Tegel klein waarde={euro(p.platform)} label="Woober" />
      </View>
      <Blok>
        <Rij label="Tarief van de uitlater" waarde={euro(p.tarief + p.toeslag)} />
        {p.drukte > 0 ? <Rij label={`Drukte-toeslag (${factorTekst(p.drukteFactor)})`} waarde={euro(p.drukte)} /> : null}
        {p.drukteUitlater > 0 ? <Rij label="Waarvan naar de uitlater" waarde={euro(p.drukteUitlater)} /> : null}
        <Rij label={p.plus ? `Servicekosten (${model.plus.naam})` : 'Servicekosten eigenaar'} waarde={euro(p.servicekosten)} />
        <Rij label="Boekingskosten eigenaar" waarde={euro(p.boekingskosten)} />
        <Rij label="Commissie uitlater" waarde={p.commissie > 0 ? `-${euro(p.commissie)}` : euro(0)} />
      </Blok>
    </View>
  );
}

/**
 * Demoscherm: laat zien hoe Woober van gratis naar een Uber-achtig verdienmodel gaat. In de echte app bestaat dit
 * scherm niet voor gebruikers; het team kiest het actieve model in de tabel `verdienmodellen`.
 */
export default function VerdienmodelScherm() {
  const { verdienmodel: model, zetVerdienmodel, drukteNagebootst, zetDrukteNagebootst, plus, boekingen, uitlater } = useApp();
  const sanne = uitlater('u1');
  const drukte = drukteNagebootst ? model.drukte.maxFactor : 1;

  const afgerond = boekingen.filter((b) => b.soort === 'betaald' && b.status === 'afgerond');
  const som = (f: (b: (typeof afgerond)[number]) => number) => afgerond.reduce((t, b) => t + f(b), 0);

  const plusVoordeel = sanne && model.plus.aan ? berekenPrijs(sanne, 'uitlaten', 30, 1, model).servicekosten - berekenPrijs(sanne, 'uitlaten', 30, 1, model, { plus: true }).servicekosten : 0;

  return (
    <ScrollView style={gedeeldeStijl.scherm} contentContainerStyle={gedeeldeStijl.inhoud}>
      <Melding type="info">
        Alleen voor de demo. In de echte app kiest het Woober-team het verdienmodel in de database; gebruikers kunnen dit niet wijzigen.
      </Melding>
      <View style={{ height: ruimte(4) }} />

      <Sectie>Fase</Sectie>
      <View style={{ gap: ruimte(2), marginBottom: ruimte(5) }}>
        {VERDIENMODEL_VOLGORDE.map((id) => {
          const m = VERDIENMODELLEN[id];
          const actief = m.id === model.id;
          return (
            <Pressable
              key={id}
              onPress={() => zetVerdienmodel(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: actief }}
              style={({ pressed }) => [s.model, actief && s.modelActief, pressed && { opacity: 0.8 }]}
            >
              <View style={s.modelKop}>
                <Ionicons name={actief ? 'radio-button-on' : 'radio-button-off'} size={20} color={actief ? kleuren.primair : kleuren.gedempt} />
                <Text style={s.modelNaam}>{m.naam}</Text>
              </View>
              <Text style={s.modelUitleg}>{m.uitleg}</Text>
              <View style={s.kenmerken}>
                {kenmerken(m).map((k) => (
                  <Text key={k} style={[s.kenmerk, actief && { backgroundColor: '#fff' }]}>
                    {k}
                  </Text>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Sectie>{`Instellingen ${model.naam.toLowerCase()}`}</Sectie>
      <Blok>
        <Rij
          label="Servicekosten eigenaar"
          waarde={
            model.servicekostenPercentage > 0
              ? `${procent(model.servicekostenPercentage)}, min. ${euro(model.servicekostenMinimum)}${model.servicekostenMaximum !== null ? `, max. ${euro(model.servicekostenMaximum)}` : ''}`
              : 'Geen'
          }
        />
        <Rij label="Boekingskosten eigenaar" waarde={model.boekingskosten > 0 ? euro(model.boekingskosten) : 'Geen'} />
        <Rij label="Commissie uitlater" waarde={model.commissiePercentage > 0 ? procent(model.commissiePercentage) : 'Geen'} />
        <Rij label="Drukte-toeslag" waarde={model.drukte.aan ? `Tot ${factorTekst(model.drukte.maxFactor)}, ${procent(model.drukte.deelUitlater)} naar uitlater` : 'Uit'} />
        <Rij label={model.plus.naam} waarde={model.plus.aan ? `${euro(model.plus.prijsPerMaand)} per maand` : 'Uit'} />
        <Rij label="Welkomsttegoed" waarde={model.welkomsttegoed > 0 ? euro(model.welkomsttegoed) : 'Geen'} />
        <Rij label="Uitnodigingstegoed" waarde={model.uitnodigingstegoed > 0 ? `${euro(model.uitnodigingstegoed)} voor beiden` : 'Geen'} />
      </Blok>
      {model.drukte.aan ? (
        <View style={{ marginBottom: ruimte(3) }}>
          <Vinkje aan={drukteNagebootst} onPress={() => zetDrukteNagebootst(!drukteNagebootst)}>
            Drukte nabootsen (maximale toeslag in de hele demo)
          </Vinkje>
        </View>
      ) : (
        <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(5) }]}>Dit model heeft geen drukte-toeslag.</Text>
      )}

      {sanne ? (
        <>
          <Sectie>Voorbeelden met 1 hond</Sectie>
          {VOORBEELDEN.map((v) => (
            <Voorbeeld key={v.dienst} uitlater={sanne} dienst={v.dienst} duur={v.duur} model={model} drukteFactor={drukte} plus={plus} />
          ))}
          {plusVoordeel > 0 ? (
            <Text style={[gedeeldeStijl.hulp, { marginTop: -ruimte(2), marginBottom: ruimte(5) }]}>
              {model.plus.naam} kost {euro(model.plus.prijsPerMaand)} per maand en scheelt {euro(plusVoordeel)} per wandeling van 30 minuten. Voor de eigenaar loont het vanaf{' '}
              {Math.ceil(model.plus.prijsPerMaand / plusVoordeel)} wandelingen per maand.
            </Text>
          ) : null}
        </>
      ) : null}

      <Sectie>Afgeronde demoboekingen</Sectie>
      <Blok>
        <Rij label="Aantal" waarde={String(afgerond.length)} />
        <Rij label="Betaald door eigenaren" waarde={euro(som((b) => b.prijs.totaal))} />
        <Rij label="Tegoed betaald door Woober" waarde={euro(som((b) => b.prijs.korting))} />
        <Rij label="Naar uitlaters (zonder fooi)" waarde={euro(som((b) => b.prijs.uitbetaling))} />
        <Rij label="Fooien, volledig naar uitlaters" waarde={euro(som((b) => b.fooi))} />
        <Rij label="Woober netto" waarde={euro(som((b) => b.prijs.platform))} sterk />
      </Blok>
      <Text style={[gedeeldeStijl.hulp, { marginBottom: ruimte(5) }]}>
        Elke boeking bewaart het model waarmee hij is berekend. Wissel je van fase, dan houden bestaande en geplande boekingen hun prijs.
      </Text>

      <Sectie>Zo staat het klaar</Sectie>
      <Punt icoon="options" titel="Eén actief model" tekst="De tabel verdienmodellen bevat de fases. Precies één is actief en alleen het team kan wisselen." />
      <Punt icoon="lock-closed" titel="Vastgelegd per boeking" tekst="De database berekent de prijs zelf en bewaart model, drukte, servicekosten, commissie en tegoed bij de boeking." />
      <Punt icoon="book" titel="Grootboek" tekst="Elke betaalde boeking schrijft regels voor eigenaar, uitlater, Woober en tegoed. De som is altijd nul." />
      <Punt icoon="star" titel="Abonnement, tegoed en actiecodes" tekst="Woober Plus, welkomst- en uitnodigingstegoed en actiecodes staan klaar en zijn uit tijdens de lancering." />
      <Punt icoon="trending-up" titel="Drukte per wijk" tekst="De server zet een factor per wijk en tijdvak. Uitlaters krijgen het grootste deel, eigenaren zien de toeslag vooraf." />

      <Text style={[gedeeldeStijl.klein, { marginTop: ruimte(4) }]}>
        Verandert de commissie of een andere voorwaarde voor uitlaters, dan kondigt Woober dat minstens 15 dagen vooraf aan. Eigenaren zien altijd de volledige prijs voordat ze boeken.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  model: { borderWidth: 1.5, borderColor: kleuren.rand, borderRadius: radius.midden, padding: ruimte(4) },
  modelActief: { borderColor: kleuren.primair, backgroundColor: kleuren.primairVlak },
  modelKop: { flexDirection: 'row', alignItems: 'center', gap: ruimte(2) },
  modelNaam: { fontSize: 17, fontWeight: '800', color: kleuren.tekst },
  modelUitleg: { fontSize: 14, color: kleuren.gedempt, lineHeight: 19, marginTop: ruimte(1) },
  kenmerken: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: ruimte(3) },
  kenmerk: { fontSize: 12, fontWeight: '700', color: kleuren.tekst, backgroundColor: kleuren.vlak, borderRadius: radius.rond, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  voorbeeldTitel: { fontSize: 16, fontWeight: '800', color: kleuren.tekst, marginBottom: ruimte(2) },
  tegels: { flexDirection: 'row', gap: ruimte(2), marginBottom: ruimte(3) },
  punt: { flexDirection: 'row', gap: ruimte(3), marginBottom: ruimte(4) },
  puntIcoon: { width: 36, height: 36, borderRadius: 18, backgroundColor: kleuren.primairVlak, alignItems: 'center', justifyContent: 'center' },
  puntTitel: { fontSize: 15, fontWeight: '700', color: kleuren.tekst },
  puntTekst: { fontSize: 14, color: kleuren.gedempt, lineHeight: 19, marginTop: 2 },
});
