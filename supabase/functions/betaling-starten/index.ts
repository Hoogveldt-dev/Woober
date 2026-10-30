import { DbFout, gebruiker, rpc } from '../_shared/db.ts';
import { cors, fout, json, omgeving } from '../_shared/http.ts';
import { maakBetaling } from '../_shared/mollie.ts';
import { betaalSoort, MOLLIE_METHODE, veiligTerugAdres, type Betaalmethode } from '../_shared/regels.ts';

/**
 * Start een betaling bij Mollie voor een boeking, een extra uur oppas of een fooi van de ingelogde eigenaar en geeft
 * de betaalpagina terug. Body: { boekingId, soort?: 'boeking' | 'verlenging' | 'fooi', fooi?: centen, terug?: adres in
 * de app om naar terug te keren }. De database controleert of de boeking van deze eigenaar is en wat er te betalen is
 * (betaling_voor); een verlenging gaat pas in als Mollie meldt dat hij betaald is.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fout('Alleen POST', 405);
  try {
    const ik = await gebruiker(req);
    if (!ik) return fout('Log eerst in.', 401);
    const body = await req.json().catch(() => ({}));
    const soort = betaalSoort(body.soort);
    if (typeof body.boekingId !== 'string') return fout('Geen boeking meegegeven.');
    const app = omgeving('APP_URL');
    const terug = veiligTerugAdres(body.terug, app, `${app}/betaald?boeking=${encodeURIComponent(body.boekingId)}`);

    const [voor] = await rpc<{ bedrag: number; methode: Betaalmethode; omschrijving: string; verlengd_tot: number | null }[]>('betaling_voor', {
      p_boeking: body.boekingId,
      p_eigenaar: ik.id,
      p_soort: soort,
      p_fooi: soort === 'fooi' && Number.isInteger(body.fooi) ? body.fooi : null,
    });
    const betaling = await maakBetaling({
      centen: voor.bedrag,
      omschrijving: voor.omschrijving,
      methode: MOLLIE_METHODE[voor.methode],
      terug,
      webhook: `${omgeving('SUPABASE_URL')}/functions/v1/mollie-webhook`,
      metadata: { boeking: body.boekingId, soort },
    });
    await rpc('registreer_betaling', {
      p_id: betaling.id,
      p_boeking: body.boekingId,
      p_soort: soort,
      p_bedrag: voor.bedrag,
      p_methode: voor.methode,
      p_verlengd_tot: voor.verlengd_tot,
    });
    const url = betaling._links.checkout?.href;
    if (!url) throw new Error(`Geen betaalpagina bij ${betaling.id}`);
    return json({ betaling: betaling.id, url });
  } catch (e) {
    if (e instanceof DbFout) return fout(e.message);
    console.error('betaling-starten', e);
    return fout('Betalen lukt nu niet. Probeer het zo nog eens.', 502);
  }
});
