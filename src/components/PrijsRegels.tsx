import { euro } from '../lib/prijs';
import { factorTekst, modelVoor } from '../lib/verdienmodel';
import type { PrijsOpbouw } from '../types';
import { Rij } from './blokken';

/**
 * Prijsopbouw zoals de eigenaar die ziet: eigen tarief van de uitlater, en wat Woober daarbovenop rekent
 * volgens het verdienmodel waarmee de boeking is berekend.
 */
export function PrijsRegels({
  prijs,
  tariefLabel,
  aantalHonden,
  fooi = 0,
  totaalLabel = 'Totaal',
}: {
  prijs: PrijsOpbouw;
  tariefLabel: string;
  aantalHonden: number;
  fooi?: number;
  totaalLabel?: string;
}) {
  const model = modelVoor(prijs.modelId);
  const gratisModel = model.servicekostenPercentage === 0;
  return (
    <>
      <Rij label={tariefLabel} waarde={euro(prijs.tarief)} />
      {prijs.toeslag > 0 ? <Rij label={aantalHonden > 2 ? 'Extra honden' : 'Extra hond'} waarde={euro(prijs.toeslag)} /> : null}
      {prijs.drukte > 0 ? <Rij label={`Drukte-toeslag (${factorTekst(prijs.drukteFactor)})`} waarde={euro(prijs.drukte)} /> : null}
      {gratisModel ? (
        <Rij label={`Servicekosten (${model.naam.toLowerCase()})`} waarde="Gratis" />
      ) : prijs.plus ? (
        <Rij label={`Servicekosten (${model.plus.naam})`} waarde={euro(prijs.servicekosten)} />
      ) : (
        <Rij label="Servicekosten Woober" waarde={euro(prijs.servicekosten)} />
      )}
      {prijs.boekingskosten > 0 ? <Rij label="Boekingskosten" waarde={euro(prijs.boekingskosten)} /> : null}
      {prijs.korting > 0 ? <Rij label="Tegoed" waarde={`-${euro(prijs.korting)}`} /> : null}
      {fooi > 0 ? <Rij label="Fooi" waarde={euro(fooi)} /> : null}
      <Rij label={totaalLabel} waarde={euro(prijs.totaal + fooi)} sterk />
    </>
  );
}
