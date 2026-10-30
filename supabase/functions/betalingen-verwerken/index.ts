import { rpc } from '../_shared/db.ts';
import { fout, json, omgeving } from '../_shared/http.ts';
import { maakOverboeking, maakRoute, onboarding, terugbetalen, vernieuwToken } from '../_shared/mollie.ts';
import { koppelstatus } from '../_shared/regels.ts';

/**
 * Het vaste werk met Mollie, elke paar minuten aangeroepen door Supabase Cron (README) met de kop x-woober-geheim:
 * 1. terugbetalen bij annuleren, weigeren of dubbel betalen;
 * 2. automatisch uitbetalen voordat geld 80 dagen wacht (Mollie zet ongerouteerd geld na 90 dagen naar Woober);
 * 3. uitbetalingen routeren naar uitlaters die bij Mollie zijn aangesloten;
 * 4. bijhouden hoe ver uitlaters zijn met aansluiten.
 * Alles is veilig om te herhalen: Mollie krijgt per actie een vaste Idempotency-Key.
 */
Deno.serve(async (req) => {
  if (req.headers.get('x-woober-geheim') !== omgeving('WOOBER_GEHEIM')) return fout('Niet toegestaan', 401);
  const verslag = { terugbetaald: 0, automatisch: 0, routes: 0, overboekingen: 0, koppelingen: 0, fouten: [] as string[] };
  const noteer = (wat: string, e: unknown) => verslag.fouten.push(`${wat}: ${e instanceof Error ? e.message : String(e)}`);

  for (const t of await rpc<{ betaling_id: string; bedrag: number }[]>('terug_te_betalen')) {
    try {
      await terugbetalen(t.betaling_id, t.bedrag, `terug-${t.betaling_id}-${t.bedrag}`);
      await rpc('boek_terugbetaling', { p_id: t.betaling_id, p_bedrag: t.bedrag });
      verslag.terugbetaald++;
    } catch (e) {
      noteer(`terugbetalen ${t.betaling_id}`, e);
    }
  }

  try {
    verslag.automatisch = await rpc<number>('maak_automatische_uitbetalingen');
  } catch (e) {
    noteer('automatisch uitbetalen', e);
  }

  for (const u of await rpc<{ uitbetaling_id: string; organisatie_id: string }[]>('uitbetalingen_klaar')) {
    try {
      const plan = await rpc<{ route_id: number; soort: 'route' | 'overboeking'; betaling_id: string | null; bedrag: number }[]>('plan_routes', {
        p_uitbetaling: u.uitbetaling_id,
      });
      for (const r of plan) {
        try {
          const gedaan =
            r.soort === 'route' && r.betaling_id
              ? await maakRoute(r.betaling_id, r.bedrag, u.organisatie_id, `route-${r.route_id}`)
              : await maakOverboeking(r.bedrag, u.organisatie_id, `overboeking-${r.route_id}`);
          await rpc('route_verwerkt', { p_route: r.route_id, p_extern_id: gedaan.id });
          if (r.soort === 'route') verslag.routes++;
          else verslag.overboekingen++;
        } catch (e) {
          // Mislukt: de volgende ronde plant hetzelfde bedrag opnieuw
          await rpc('route_verwerkt', { p_route: r.route_id, p_extern_id: null });
          noteer(`${r.soort} ${r.route_id}`, e);
        }
      }
    } catch (e) {
      noteer(`uitbetaling ${u.uitbetaling_id}`, e);
    }
  }

  for (const k of await rpc<{ uitlater_id: string; organisatie_id: string | null; refresh_token: string }[]>('te_controleren_koppelingen')) {
    try {
      const tokens = await vernieuwToken(k.refresh_token);
      if (tokens.refresh_token && tokens.refresh_token !== k.refresh_token && k.organisatie_id) {
        await rpc('bewaar_koppeling', { p_uitlater: k.uitlater_id, p_organisatie: k.organisatie_id, p_refresh_token: tokens.refresh_token });
      }
      await rpc('zet_koppelstatus', { p_uitlater: k.uitlater_id, p_status: koppelstatus(await onboarding(tokens.access_token)) });
      verslag.koppelingen++;
    } catch (e) {
      noteer(`koppeling ${k.uitlater_id}`, e);
    }
  }

  if (verslag.fouten.length) console.error('betalingen-verwerken', verslag.fouten);
  return json(verslag);
});
