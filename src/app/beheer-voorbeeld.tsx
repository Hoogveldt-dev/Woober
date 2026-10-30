import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTeksten } from '../state/Teksten';
import { Inloggen } from './aanmelden';
import { WelkomScherm } from './welkom';

/**
 * Schermen die je als ingelogde beheerder normaal niet ziet (welkom en inloggen), om hun teksten met de hamer aan
 * te passen. De knoppen doen hier niets.
 */
export default function BeheerVoorbeeld() {
  const { scherm } = useLocalSearchParams<{ scherm?: string }>();
  const { zetBewerken } = useTeksten();
  // Wie hier komt, wil teksten aanpassen
  useEffect(() => zetBewerken(true), [zetBewerken]);
  return scherm === 'inloggen' ? <Inloggen voorbeeld /> : <WelkomScherm voorbeeld />;
}
