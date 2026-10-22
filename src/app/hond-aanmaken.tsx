import { HondFormulier } from '../components/HondFormulier';
import { Melding } from '../components/ui';
import { useApp } from '../state/AppContext';

export default function HondAanmaken() {
  const { bewaarHond, gebruiker } = useApp();
  return (
    <HondFormulier
      begin={null}
      knopTitel="Klaar, naar de kaart"
      onBewaar={bewaarHond}
      extra={<Melding type="info">Welkom {gebruiker?.voornaam}! Heb je meer honden? Die voeg je straks toe onder Account.</Melding>}
    />
  );
}
