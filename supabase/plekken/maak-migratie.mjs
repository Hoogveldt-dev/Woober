// Maakt van supabase/plekken/nijmegen.json een migratie met de plekken voor de tabel plekken.
// Coördinaten komen van OpenStreetMap (Nominatim) en worden bewaard in nijmegen.json, zodat een volgende run
// niets meer hoeft op te zoeken. Draaien: node supabase/plekken/maak-migratie.mjs
// Nominatim vraagt hooguit één verzoek per seconde en een herkenbare User-Agent.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const map = path.dirname(fileURLToPath(import.meta.url));
const bron = path.join(map, 'nijmegen.json');
const doel = path.join(map, '..', 'migrations', '20261028020000_plekken_nijmegen.sql');
const data = JSON.parse(fs.readFileSync(bron, 'utf8'));

// Ruim om Nijmegen en de Ooijpolder; alles daarbuiten is een verkeerde treffer
const GEBIED = { latMin: 51.74, latMax: 51.9, lngMin: 5.7, lngMax: 6.02 };
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

async function zoek(vraag) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(vraag)}`;
  const antwoord = await fetch(url, { headers: { 'User-Agent': 'Woober-plekken/1.0 (https://woober.nl)', 'Accept-Language': 'nl' } });
  if (!antwoord.ok) throw new Error(`Nominatim gaf ${antwoord.status} voor "${vraag}"`);
  const [treffer] = await antwoord.json();
  if (!treffer) throw new Error(`Niets gevonden voor "${vraag}"`);
  const lat = Number(Number(treffer.lat).toFixed(6));
  const lng = Number(Number(treffer.lon).toFixed(6));
  if (lat < GEBIED.latMin || lat > GEBIED.latMax || lng < GEBIED.lngMin || lng > GEBIED.lngMax) {
    throw new Error(`"${vraag}" ligt buiten Nijmegen: ${lat}, ${lng} (${treffer.display_name})`);
  }
  return { lat, lng, gevonden: treffer.display_name };
}

let fouten = 0;
for (const p of data.plekken) {
  if (typeof p.lat === 'number' && typeof p.lng === 'number') continue;
  try {
    Object.assign(p, await zoek(p.zoek));
    console.log('  ok  ', p.naam, p.lat, p.lng, '|', p.gevonden);
  } catch (e) {
    fouten++;
    console.log('  FOUT', p.naam, e.message);
  }
  await wacht(1100);
}
fs.writeFileSync(bron, JSON.stringify(data, null, 2) + '\n');
if (fouten) {
  console.log(`\n${fouten} plekken zonder coördinaten. Pas 'zoek' aan in nijmegen.json en draai opnieuw.`);
  process.exit(1);
}

const tekst = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rijen = data.plekken.map(
  (p) =>
    `  (${tekst(p.soort)}::public.plek_soort, ${tekst(p.naam)}, ${tekst(p.omschrijving)}, array[${p.kenmerken.map(tekst).join(', ')}]::text[], ${tekst(p.regels)}, ${tekst(p.plaats)}, ${p.lat}, ${p.lng})`,
);
fs.writeFileSync(
  doel,
  `-- Woober: hondvriendelijke plekken in Nijmegen, de pilotstad
--
-- Gemaakt met supabase/plekken/maak-migratie.mjs uit supabase/plekken/nijmegen.json; daar staan ook de bronnen.
-- Pas die JSON aan en maak de migratie opnieuw, niet dit bestand. Plekken van Woober hebben geen toevoeger
-- en zijn gecontroleerd. Een plek die er al is (zelfde naam en plaats) wordt overgeslagen.

insert into public.plekken (soort, naam, omschrijving, kenmerken, regels, plaats, lat, lng, toegevoegd_door, status)
select v.soort, v.naam, v.omschrijving, v.kenmerken, v.regels, v.plaats, v.lat, v.lng, null, 'gecontroleerd'
from (values
${rijen.join(',\n')}
) as v (soort, naam, omschrijving, kenmerken, regels, plaats, lat, lng)
where not exists (select 1 from public.plekken p where p.naam = v.naam and p.plaats = v.plaats);
`,
);
console.log(`\n${data.plekken.length} plekken in ${path.relative(process.cwd(), doel)}`);
