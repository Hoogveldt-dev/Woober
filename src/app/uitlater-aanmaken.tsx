import { UitlaterFormulier } from '../components/UitlaterFormulier';
import { standaardProfiel, useApp } from '../state/AppContext';

export default function UitlaterAanmaken() {
  const { gebruiker, bewaarProfiel } = useApp();
  return <UitlaterFormulier begin={standaardProfiel(gebruiker?.voornaam ?? '')} knopTitel="Profiel opslaan" onBewaar={bewaarProfiel} />;
}
