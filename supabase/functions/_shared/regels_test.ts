import { euroWaarde, koppelstatus, maakStaat, naarCenten, onzeStatus, terugUitStaat, veiligTerugAdres } from './regels.ts';

function gelijk(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} is niet ${JSON.stringify(b)}`);
}

Deno.test('bedragen naar Mollie en terug', () => {
  gelijk(euroWaarde(1250), { currency: 'EUR', value: '12.50' });
  gelijk(euroWaarde(5), { currency: 'EUR', value: '0.05' });
  gelijk(euroWaarde(100000), { currency: 'EUR', value: '1000.00' });
  gelijk(naarCenten('12.50'), 1250);
  gelijk(naarCenten('0.5'), 50);
  gelijk(naarCenten('7'), 700);
  gelijk(naarCenten(undefined), 0);
  let fout = false;
  try {
    euroWaarde(12.5);
  } catch {
    fout = true;
  }
  gelijk(fout, true);
});

Deno.test('status van Mollie', () => {
  gelijk(onzeStatus('paid'), 'betaald');
  gelijk(onzeStatus('expired'), 'mislukt');
  gelijk(onzeStatus('canceled'), 'mislukt');
  gelijk(onzeStatus('failed'), 'mislukt');
  gelijk(onzeStatus('open'), 'open');
  gelijk(onzeStatus('pending'), 'open');
  gelijk(koppelstatus({ status: 'completed', canReceiveSettlements: true }), 'klaar');
  gelijk(koppelstatus({ status: 'completed', canReceiveSettlements: false }), 'in controle');
  gelijk(koppelstatus({ status: 'in-review' }), 'in controle');
  gelijk(koppelstatus({ status: 'needs-data' }), 'gegevens nodig');
});

Deno.test('alleen terug naar de eigen app', () => {
  const app = 'https://woober.nl';
  const std = 'https://woober.nl/betaald';
  gelijk(veiligTerugAdres('https://woober.nl/betaald?boeking=1', app, std), 'https://woober.nl/betaald?boeking=1');
  gelijk(veiligTerugAdres('woober://betaald?boeking=1', app, std), 'woober://betaald?boeking=1');
  gelijk(veiligTerugAdres('https://woober.nl.boef.nl/x', app, std), std);
  gelijk(veiligTerugAdres('https://boef.nl/?https://woober.nl/', app, std), std);
  gelijk(veiligTerugAdres(42, app, std), std);
});

Deno.test('state met terugadres', () => {
  const staat = maakStaat('abc123', 'woober://verificatie?mollie=1');
  gelijk(terugUitStaat(staat), 'woober://verificatie?mollie=1');
  gelijk(terugUitStaat('zonderpunt'), null);
});
