import { DbFout, gebruiker, lees, rpc } from '../_shared/db.ts';
import { cors, fout, json, omgeving } from '../_shared/http.ts';
import { autorisatieLink } from '../_shared/mollie.ts';
import { maakStaat, veiligTerugAdres } from '../_shared/regels.ts';

/**
 * Een uitlater sluit zich aan bij Mollie, zodat Woober zijn saldo naar hem kan routeren. Geeft de pagina van Mollie
 * terug; daar maakt hij een account of logt hij in, en geeft hij Woober toestemming. Daarna komt hij via
 * mollie-oauth terug in de app. Body: { terug?: adres in de app }.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fout('Alleen POST', 405);
  try {
    const ik = await gebruiker(req);
    if (!ik) return fout('Log eerst in.', 401);
    const [uitlater] = await lees<{ id: string }>(`uitlaters?id=eq.${ik.id}&select=id`);
    if (!uitlater) return fout('Maak eerst je profiel als uitlater.');
    const body = await req.json().catch(() => ({}));
    const app = omgeving('APP_URL');
    const staat = maakStaat(crypto.randomUUID(), veiligTerugAdres(body.terug, app, `${app}/verificatie`));
    await rpc('start_koppeling', { p_uitlater: ik.id, p_staat: staat });
    return json({ url: autorisatieLink(staat) });
  } catch (e) {
    if (e instanceof DbFout) return fout(e.message);
    console.error('mollie-aansluiten', e);
    return fout('Koppelen met Mollie lukt nu niet. Probeer het zo nog eens.', 502);
  }
});
