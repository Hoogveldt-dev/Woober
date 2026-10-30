import { omgeving } from './http.ts';

/**
 * De database via de REST-laag van Supabase, met de service_role-sleutel. Die staat alleen in de omgeving van de
 * Edge Functions, nooit in de app. De functies die hier worden aangeroepen staan in 20261031000000_mollie.sql.
 */

/** Fout uit de database; de tekst komt uit de migratie en is bedoeld voor de gebruiker */
export class DbFout extends Error {}

function koppen(): Record<string, string> {
  const sleutel = omgeving('SUPABASE_SERVICE_ROLE_KEY');
  return { apikey: sleutel, Authorization: `Bearer ${sleutel}`, 'Content-Type': 'application/json' };
}

export async function rpc<T>(naam: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`${omgeving('SUPABASE_URL')}/rest/v1/rpc/${naam}`, { method: 'POST', headers: koppen(), body: JSON.stringify(args) });
  const tekst = await r.text();
  const data = tekst ? JSON.parse(tekst) : null;
  if (!r.ok) throw new DbFout(data?.message ?? `Database: ${r.status}`);
  return data as T;
}

/** Lezen met een filter in de vorm van PostgREST, bijvoorbeeld `uitlaters?id=eq.123&select=id` */
export async function lees<T>(pad: string): Promise<T[]> {
  const r = await fetch(`${omgeving('SUPABASE_URL')}/rest/v1/${pad}`, { headers: koppen() });
  if (!r.ok) throw new DbFout(`Database: ${r.status}`);
  return (await r.json()) as T[];
}

/** De ingelogde gebruiker van de app, uit de sleutel die de app meestuurt; null als die ontbreekt of verlopen is */
export async function gebruiker(req: Request): Promise<{ id: string; email: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const r = await fetch(`${omgeving('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: omgeving('SUPABASE_SERVICE_ROLE_KEY'), Authorization: auth },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return typeof u?.id === 'string' ? { id: u.id, email: u.email ?? '' } : null;
}
