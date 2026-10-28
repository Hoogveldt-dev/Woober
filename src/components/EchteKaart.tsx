import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { kaartHtml, NIJMEGEN, type NaarKaart, type VanKaart } from '../lib/kaart';
import { kleuren } from '../theme';
import { useKaartBrug, type EchteKaartProps } from './kaartBrug';

// De typen van react-native-webview beschrijven de webversie zonder ref; in de app heeft de WebView wel injectJavaScript
type WebViewRef = { injectJavaScript: (script: string) => void };

/** De echte kaart in de app: dezelfde Leaflet-pagina als op het web, in een WebView */
export function EchteKaart(props: EchteKaartProps) {
  const web = useRef<WebViewRef>(null);
  const begin = props.begin ?? NIJMEGEN;
  // Alleen bij het openen; een nieuwe pagina zou de kaart opnieuw laden
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => kaartHtml({ lat: begin.lat, lng: begin.lng, zoom: props.begin?.zoom ?? 13 }, Boolean(props.onMidden)), []);

  const stuur = useCallback((b: NaarKaart) => {
    web.current?.injectJavaScript(`window.ontvang(${JSON.stringify(JSON.stringify(b))});true;`);
  }, []);
  const ontvang = useKaartBrug(props, stuur);

  const bericht = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        ontvang(JSON.parse(e.nativeEvent.data) as VanKaart);
      } catch {
        // Onbekend bericht; negeren
      }
    },
    [ontvang],
  );

  return (
    <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: kleuren.vlak }, props.style]}>
      <WebView
        {...({ ref: web } as object)}
        source={{ html, baseUrl: 'https://woober.nl' }}
        originWhitelist={['*']}
        onMessage={bericht}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
