import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { kaartHtml, NIJMEGEN, type NaarKaart, type VanKaart } from '../lib/kaart';
import { useKaartBrug, type EchteKaartProps } from './kaartBrug';

/** De echte kaart op het web: een afgeschermde iframe (alleen scripts, geen toegang tot woober.nl zelf) */
export function EchteKaart(props: EchteKaartProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const begin = props.begin ?? NIJMEGEN;
  // Alleen bij het openen; een nieuwe pagina zou de kaart opnieuw laden
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => kaartHtml({ lat: begin.lat, lng: begin.lng, zoom: props.begin?.zoom ?? 13 }, Boolean(props.onMidden)), []);

  const stuur = useCallback((b: NaarKaart) => frame.current?.contentWindow?.postMessage(JSON.stringify(b), '*'), []);
  const ontvang = useKaartBrug(props, stuur);

  useEffect(() => {
    const luister = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        ontvang(JSON.parse(e.data) as VanKaart);
      } catch {
        // Onbekend bericht; negeren
      }
    };
    window.addEventListener('message', luister);
    return () => window.removeEventListener('message', luister);
  }, [ontvang]);

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, props.style]}>
      <iframe
        ref={frame}
        title="Kaart"
        srcDoc={html}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </View>
  );
}
