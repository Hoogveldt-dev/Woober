import type { Dag, Dagdeel, Moment } from '../types';

export const DAGEN_KORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
export const DAGEN_LANG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const DAGDELEN: Dagdeel[] = ['ochtend', 'middag', 'avond'];

/** Maandag = 0, zoals in de rest van de app */
export function dagVan(d: Date): Dag {
  return ((d.getDay() + 6) % 7) as Dag;
}

export function dagdeelVan(uur: number): Dagdeel {
  if (uur < 12) return 'ochtend';
  if (uur < 17) return 'middag';
  return 'avond';
}

export function tijdTekst(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function zelfdeDag(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dagTekst(ms: number, nu = Date.now()): string {
  const d = new Date(ms);
  const vandaag = new Date(nu);
  const morgen = new Date(nu + 86400000);
  const gisteren = new Date(nu - 86400000);
  if (zelfdeDag(d, vandaag)) return 'vandaag';
  if (zelfdeDag(d, morgen)) return 'morgen';
  if (zelfdeDag(d, gisteren)) return 'gisteren';
  return `${DAGEN_LANG[dagVan(d)]} ${d.getDate()} ${d.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '')}`;
}

export function datumTijdTekst(ms: number, nu = Date.now()): string {
  return `${dagTekst(ms, nu)} om ${tijdTekst(ms)}`;
}

export function dagenTekst(dagen: Dag[]): string {
  const gesorteerd = [...dagen].sort((a, b) => a - b);
  if (gesorteerd.length === 5 && gesorteerd.every((d, i) => d === i)) return 'elke werkdag';
  if (gesorteerd.length === 7) return 'elke dag';
  return `elke ${gesorteerd.map((d) => DAGEN_KORT[d]).join(', ')}`;
}

export function momentTekst(m: Moment, nu = Date.now()): string {
  if (m.type === 'nu') return 'Nu';
  if (m.type === 'later') return datumTijdTekst(m.tijdstip, nu);
  return `${dagenTekst(m.dagen)} om ${m.tijd}`;
}

/** Eerstvolgende keer van een vaste wandeling, na een bepaald moment */
export function volgendeKeer(dagen: Dag[], tijd: string, na: number): number {
  const [uur, minuut] = tijd.split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(na + i * 86400000);
    d.setHours(uur, minuut, 0, 0);
    if (d.getTime() > na && dagen.includes(dagVan(d))) return d.getTime();
  }
  return na + 86400000;
}

/** Tijdstip op dag (0 = vandaag) en tijd "HH:MM" */
export function tijdstipOp(dagVanaf: number, tijd: string, nu = Date.now()): number {
  const [uur, minuut] = tijd.split(':').map(Number);
  const d = new Date(nu + dagVanaf * 86400000);
  d.setHours(uur, minuut, 0, 0);
  return d.getTime();
}

export function begroeting(nu = Date.now()): string {
  const uur = new Date(nu).getHours();
  if (uur < 6) return 'Goedenacht';
  if (uur < 12) return 'Goedemorgen';
  if (uur < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export function leeftijdTekst(iso: string, nu = Date.now()): string {
  const d = new Date(iso);
  const maanden = Math.floor((nu - d.getTime()) / (30.44 * 86400000));
  if (maanden < 12) return `${Math.max(0, maanden)} mnd`;
  const jaar = Math.floor(maanden / 12);
  return `${jaar} jaar`;
}

/** "15-04-2022" naar "2022-04-15", of null als het geen geldige datum is */
export function nlNaarIso(invoer: string): string | null {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(invoer.trim());
  if (!m) return null;
  const dag = Number(m[1]);
  const maand = Number(m[2]);
  const jaar = Number(m[3]);
  const d = new Date(jaar, maand - 1, dag);
  if (d.getFullYear() !== jaar || d.getMonth() !== maand - 1 || d.getDate() !== dag) return null;
  if (d.getTime() > Date.now()) return null;
  return `${jaar}-${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
}

export function isoNaarNl(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

export function minutenTekst(min: number): string {
  const m = Math.max(1, Math.round(min));
  return `${m} min`;
}

/** "30 min", "3 uur", "2,5 uur" of "2 uur 10 min" */
export function duurTekst(minuten: number): string {
  const m = Math.round(minuten);
  if (m < 90) return `${m} min`;
  if (m % 30 === 0) return `${String(m / 60).replace('.', ',')} uur`;
  return `${Math.floor(m / 60)} uur ${m % 60} min`;
}

/** Verstreken tijd als klok: "2:05" */
export function klokTekst(minuten: number): string {
  const m = Math.max(0, Math.floor(minuten));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Tot hoe laat, bijv. "tot 23:10" */
export function totTekst(start: number, minuten: number): string {
  return `tot ${tijdTekst(start + minuten * 60000)}`;
}
