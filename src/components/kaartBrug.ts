import { useCallback, useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { KaartPunt, LatLng, NaarKaart, VanKaart } from '../lib/kaart';

export interface EchteKaartProps {
  punten: KaartPunt[];
  /** Waar de kaart begint; standaard het centrum van Nijmegen */
  begin?: LatLng & { zoom?: number };
  /** Verandert deze sleutel, dan richt de kaart zich opnieuw op alle punten (bijvoorbeeld bij een ander filter) */
  richtSleutel?: string;
  /** Uit om op `begin` te blijven staan, bijvoorbeeld bij het aanwijzen van een plek */
  richten?: boolean;
  onKies?: (id: string) => void;
  /** Tik op de kaart naast een speld */
  onTik?: () => void;
  /** Het midden van de kaart na elke verschuiving, om een plek aan te wijzen met een vaste speld */
  onMidden?: (p: LatLng) => void;
  /** Ruimte die boven en onder bedekt is, zodat punten niet achter een blad vallen */
  bovenmarge?: number;
  ondermarge?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Gedeelde logica voor de kaart op web en app: wacht tot de kaart klaar is, stuurt de punten en geeft
 * berichten van de kaart door. `stuur` levert het bericht af in de iframe of WebView.
 */
export function useKaartBrug(props: EchteKaartProps, stuur: (b: NaarKaart) => void) {
  const { punten, richtSleutel, richten = true, bovenmarge = 0, ondermarge = 0 } = props;
  const klaar = useRef(false);
  const vorigeSleutel = useRef<string | undefined>(undefined);
  const eersteKeer = useRef(true);
  const terug = useRef(props);
  useEffect(() => {
    terug.current = props;
  });

  const stuurPunten = useCallback(() => {
    if (!klaar.current) return;
    const passend = richten && (eersteKeer.current || richtSleutel !== vorigeSleutel.current);
    eersteKeer.current = false;
    vorigeSleutel.current = richtSleutel;
    stuur({ type: 'punten', punten, passend, boven: bovenmarge, onder: ondermarge });
  }, [punten, richtSleutel, richten, bovenmarge, ondermarge, stuur]);

  useEffect(stuurPunten, [stuurPunten]);

  return useCallback(
    (b: VanKaart) => {
      if (b.type === 'klaar') {
        klaar.current = true;
        stuurPunten();
      } else if (b.type === 'kies') terug.current.onKies?.(b.id);
      else if (b.type === 'tik') terug.current.onTik?.();
      else if (b.type === 'midden') terug.current.onMidden?.({ lat: b.lat, lng: b.lng });
    },
    [stuurPunten],
  );
}
