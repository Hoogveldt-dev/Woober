import { LEAFLET_CSS, LEAFLET_JS } from './leaflet.gen';

// De echte kaart: Leaflet met de achtergrondkaart van PDOK (Kadaster), gratis en zonder sleutel.
// Dezelfde HTML draait op het web in een afgeschermde iframe en in de app in een WebView
// (src/components/EchteKaart.web.tsx en EchteKaart.tsx). App en kaart praten via berichten.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Centrum van de pilotstad */
export const NIJMEGEN: LatLng = { lat: 51.8426, lng: 5.8528 };

export interface KaartPunt extends LatLng {
  id: string;
  /** Kleur van de speld, als #rrggbb */
  kleur: string;
  /** Eén teken of emoji in de speld */
  teken: string;
  titel?: string;
  actief?: boolean;
}

export type NaarKaart =
  | { type: 'punten'; punten: KaartPunt[]; passend: boolean; boven: number; onder: number }
  | { type: 'centreer'; lat: number; lng: number; zoom?: number };

export type VanKaart = { type: 'klaar' } | { type: 'kies'; id: string } | { type: 'tik' } | ({ type: 'midden' } & LatLng);

const TEGELS = 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png';

/** Afstand in meters over de aarde */
export function afstandMeter(a: LatLng, b: LatLng): number {
  const r = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/**
 * De volledige pagina met kaart. Namen van plekken komen van gebruikers; daarom zet het script ze als tekst
 * in de pagina (textContent en title), nooit als HTML.
 */
export function kaartHtml(begin: LatLng & { zoom: number }, middenMelden: boolean): string {
  const instellingen = JSON.stringify({ lat: begin.lat, lng: begin.lng, zoom: begin.zoom, middenMelden, tegels: TEGELS });
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${LEAFLET_CSS}
html,body,#k{margin:0;padding:0;height:100%;width:100%;background:#eef0ec;font-family:-apple-system,system-ui,sans-serif}
.speld{box-sizing:border-box;width:30px;height:30px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.speld.actief{width:42px;height:42px;font-size:20px;border-width:4px}
.leaflet-control-attribution{font-size:10px}
</style></head><body><div id="k"></div>
<script>${LEAFLET_JS}</script>
<script>
(function () {
  var o = ${instellingen};
  var kaart = L.map('k', { zoomControl: false, attributionControl: true }).setView([o.lat, o.lng], o.zoom);
  L.tileLayer(o.tegels, { maxZoom: 19, attribution: 'Kaart: Kadaster / PDOK' }).addTo(kaart);
  kaart.attributionControl.setPrefix('Leaflet');
  var laag = L.layerGroup().addTo(kaart);
  var kleurOk = /^#[0-9a-fA-F]{6}$/;
  function stuur(b) {
    var s = JSON.stringify(b);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }
  function speld(p) {
    var d = document.createElement('div');
    d.className = 'speld' + (p.actief ? ' actief' : '');
    d.style.background = kleurOk.test(p.kleur) ? p.kleur : '#FF5A5F';
    d.textContent = String(p.teken || '').slice(0, 4);
    var maat = p.actief ? 42 : 30;
    return L.divIcon({ className: '', html: d, iconSize: [maat, maat], iconAnchor: [maat / 2, maat / 2] });
  }
  function ontvang(b) {
    if (typeof b === 'string') b = JSON.parse(b);
    if (b.type === 'punten') {
      laag.clearLayers();
      var grenzen = [];
      b.punten.forEach(function (p) {
        var m = L.marker([p.lat, p.lng], { icon: speld(p), title: p.titel || '', zIndexOffset: p.actief ? 1000 : 0, keyboard: true });
        m.on('click', function (e) { L.DomEvent.stopPropagation(e); stuur({ type: 'kies', id: p.id }); });
        m.addTo(laag);
        grenzen.push([p.lat, p.lng]);
      });
      if (b.passend && grenzen.length === 1) kaart.setView(grenzen[0], 15);
      else if (b.passend && grenzen.length > 1) {
        kaart.fitBounds(grenzen, { paddingTopLeft: [30, 30 + (b.boven || 0)], paddingBottomRight: [30, 30 + (b.onder || 0)], maxZoom: 15 });
      }
    } else if (b.type === 'centreer') {
      kaart.setView([b.lat, b.lng], b.zoom || kaart.getZoom());
    }
  }
  window.ontvang = ontvang;
  window.addEventListener('message', function (e) {
    if (e.source && e.source !== window.parent) return;
    try { ontvang(e.data); } catch (x) {}
  });
  kaart.on('click', function () { stuur({ type: 'tik' }); });
  if (o.middenMelden) {
    var meld = function () { var c = kaart.getCenter(); stuur({ type: 'midden', lat: c.lat, lng: c.lng }); };
    kaart.on('moveend', meld);
    meld();
  }
  stuur({ type: 'klaar' });
})();
</script></body></html>`;
}
