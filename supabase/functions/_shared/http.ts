/** Hulp voor de Edge Functions: antwoorden, CORS voor woober.nl en omgevingsvariabelen (Supabase, Secrets) */

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Foutmelding voor de app; de tekst is Nederlands en mag de gebruiker zien */
export function fout(tekst: string, status = 400): Response {
  return json({ fout: tekst }, status);
}

export function omgeving(naam: string): string {
  const waarde = Deno.env.get(naam);
  if (!waarde) throw new Error(`Omgevingsvariabele ${naam} ontbreekt (Supabase, Edge Functions, Secrets)`);
  return waarde;
}

export function doorsturen(naar: string): Response {
  return new Response(null, { status: 302, headers: { Location: naar } });
}
