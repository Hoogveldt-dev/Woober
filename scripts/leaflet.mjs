// Zet Leaflet (kaartbibliotheek, BSD-2-licentie) als tekst in src/lib/leaflet.gen.ts, zodat de kaart in de app
// en op het web werkt zonder iets van een CDN te laden. Opnieuw draaien na het bijwerken van leaflet:
// npm run kaart:leaflet
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const map = path.dirname(require.resolve('leaflet/dist/leaflet.js'));
const versie = require('leaflet/package.json').version;
const js = fs.readFileSync(path.join(map, 'leaflet.js'), 'utf8');
const css = fs.readFileSync(path.join(map, 'leaflet.css'), 'utf8');
const doel = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'lib', 'leaflet.gen.ts');
fs.writeFileSync(
  doel,
  `// Gegenereerd door scripts/leaflet.mjs uit leaflet ${versie} (BSD-2-Clause, (c) Vladimir Agafonkin). Niet met de hand aanpassen.\n` +
    `export const LEAFLET_VERSIE = ${JSON.stringify(versie)};\n` +
    `export const LEAFLET_CSS = ${JSON.stringify(css)};\n` +
    `export const LEAFLET_JS = ${JSON.stringify(js)};\n`,
);
console.log(`Leaflet ${versie} in ${path.relative(process.cwd(), doel)} (${Math.round((js.length + css.length) / 1024)} kB)`);
