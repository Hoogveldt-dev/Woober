import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { bewaardeAanpassingen, laadAanpassingen, TEKSTEN, type Aanpassingen, type TekstSleutel } from '../lib/teksten';

interface TekstenContext {
  aanpassingen: Aanpassingen;
  /** Opnieuw ophalen, bijvoorbeeld nadat een beheerder iets heeft aangepast */
  herlaad: () => Promise<void>;
}

const Context = createContext<TekstenContext>({ aanpassingen: {}, herlaad: async () => {} });

export function TekstenProvider({ children }: { children: ReactNode }) {
  const [aanpassingen, setAanpassingen] = useState<Aanpassingen>(bewaardeAanpassingen);
  const herlaad = useCallback(async () => {
    setAanpassingen(await laadAanpassingen());
  }, []);
  // Zonder verbinding blijven de laatst bekende teksten of de standaard staan
  useEffect(() => {
    laadAanpassingen().then(setAanpassingen, () => undefined);
  }, []);
  return <Context.Provider value={{ aanpassingen, herlaad }}>{children}</Context.Provider>;
}

/** De tekst zoals de beheerder hem heeft ingesteld, anders de standaard uit src/lib/teksten.ts */
export function useTekst(sleutel: TekstSleutel): string {
  const { aanpassingen } = useContext(Context);
  return aanpassingen[sleutel] ?? TEKSTEN[sleutel].standaard;
}

export function useTeksten() {
  return useContext(Context);
}
