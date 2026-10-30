import { rpc } from '../_shared/db.ts';
import { haalBetaling } from '../_shared/mollie.ts';
import { naarCenten, onzeStatus } from '../_shared/regels.ts';

/**
 * Mollie meldt hier dat een betaling (of een terugbetaling ervan) is veranderd. Mollie stuurt alleen het kenmerk;
 * de stand halen we zelf op met onze eigen sleutel, zodat niemand een nep-melding kan sturen.
 * Zonder JWT-controle uitrollen (README). Een fout geeft 500, dan probeert Mollie het later opnieuw.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const form = await req.formData().catch(() => null);
  const id = form?.get('id');
  // Onbekend of geen betaling: niets te doen, maar wel 200 zodat Mollie niet blijft proberen
  if (typeof id !== 'string' || !/^tr_[A-Za-z0-9]+$/.test(id)) return new Response(null, { status: 200 });
  try {
    const b = await haalBetaling(id);
    await rpc('verwerk_betaling', { p_id: id, p_status: onzeStatus(b.status), p_terugbetaald: naarCenten(b.amountRefunded?.value) });
    return new Response(null, { status: 200 });
  } catch (e) {
    console.error('mollie-webhook', id, e);
    return new Response(null, { status: 500 });
  }
});
