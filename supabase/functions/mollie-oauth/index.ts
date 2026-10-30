import { rpc } from '../_shared/db.ts';
import { doorsturen, omgeving } from '../_shared/http.ts';
import { onboarding, organisatie, wisselCode } from '../_shared/mollie.ts';
import { koppelstatus, terugUitStaat, veiligTerugAdres } from '../_shared/regels.ts';

/**
 * Hier komt de uitlater terug van Mollie (redirect URI van de OAuth-app). We bewaren zijn organisatie en de stand van
 * het aansluiten en sturen hem terug naar de app met ?mollie=gekoppeld of ?mollie=afgebroken.
 * Zonder JWT-controle uitrollen (README); de state bewijst dat het verzoek bij een uitlater van Woober hoort.
 */
Deno.serve(async (req) => {
  const app = omgeving('APP_URL');
  const url = new URL(req.url);
  const staat = url.searchParams.get('state') ?? '';
  const terug = veiligTerugAdres(terugUitStaat(staat), app, `${app}/verificatie`);
  const naar = (uitkomst: string) => doorsturen(`${terug}${terug.includes('?') ? '&' : '?'}mollie=${uitkomst}`);

  const code = url.searchParams.get('code');
  if (!code || !staat || url.searchParams.get('error')) return naar('afgebroken');
  try {
    const uitlater = await rpc<string | null>('koppeling_van_staat', { p_staat: staat });
    if (!uitlater) return naar('afgebroken');
    const tokens = await wisselCode(code);
    const org = await organisatie(tokens.access_token);
    await rpc('bewaar_koppeling', { p_uitlater: uitlater, p_organisatie: org.id, p_refresh_token: tokens.refresh_token ?? null });
    await rpc('zet_koppelstatus', { p_uitlater: uitlater, p_status: koppelstatus(await onboarding(tokens.access_token)) });
    return naar('gekoppeld');
  } catch (e) {
    console.error('mollie-oauth', e);
    return naar('mislukt');
  }
});
