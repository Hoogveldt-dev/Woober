# Woober

Klikbare demo van Woober, het zusje van Woofer: hondeneigenaren boeken een uitlater of een oppas uit de buurt zoals je bij Uber een rit boekt, en volgen het live. Bovenin kies je **Uitlaten** of **Oppas**, de rest werkt hetzelfde. Het plan staat in [PLAN.md](PLAN.md).

Gebouwd met Expo (SDK 58) en Expo Router, in de huisstijl van Woofer. Dezelfde code draait als iOS-app, Android-app en web app.

Er zijn twee manieren om de app te gebruiken:

- **Echt account**: inloggen met Apple, Google of een code per e-mail. Account, adres, honden, uitlaatprofiel, plekken, reviews en de wachtlijst staan in Supabase (Frankfurt), op een echte kaart van PDOK. Boeken, chat en betalen zijn er voor echte accounts nog niet; het startscherm biedt dan de wachtlijst aan.
- **Demo**: rechtsonder op het welkomscherm **Demo bekijken**, dan als eigenaar of als uitlater. Zo kun je rondkijken voordat je een account maakt. Alles is verzonnen en wordt niet opgeslagen; na herladen begin je opnieuw.

## Starten

```bash
npm install
npx expo start        # druk op w (web), i (iOS-simulator) of a (Android)
```

Op je telefoon: installeer Expo Go en scan de QR-code uit `npx expo start`.

Op het welkomscherm tik je rechtsonder op **Demo bekijken** en kies je **Als eigenaar** of **Als uitlater**. Je kunt later wisselen via Account.

Controles: `npm run typecheck`, `npx expo lint` en `npm run test:db` (databaseschema en RLS).

## Web (woober.nl)

Netlify bouwt de web-app bij elke push naar `main` (`netlify.toml`). woober.nl is het hoofddomein; extra domeinen komen in Netlify als domeinalias en sturen door naar woober.nl (voorbeeld in `netlify.toml`).

- `public/index.html` is het sjabloon van de pagina (Nederlands, past zich aan de adresbalk en het toetsenbord van mobiele browsers aan). Zolang het een demo is, staat er `noindex` in, zodat zoekmachines hem niet opnemen; haal dat weg bij de echte lancering.
- Met `public/manifest.webmanifest` en de iconen in `public/` kun je Woober op het beginscherm van je telefoon zetten.
- Privacy- en cookieverklaring: `src/app/privacy.tsx`, ook zonder account bereikbaar via `/privacy`. Pas deze aan zodra de app echte gegevens opslaat.

## Inloggen met Apple en Google instellen

De code staat klaar (`src/lib/account.ts`, `src/app/aanmelden.tsx`). Wat nog moet gebeuren buiten de code, in deze volgorde:

**1. Supabase** (dashboard, project Woober, Authentication)

- URL Configuration: Site URL `https://woober.nl`. Redirect URLs: `https://woober.nl/aanmelden`, `http://localhost:8081/aanmelden`, `woober://auth` en tijdens het ontwikkelen met Expo Go `exp://**`.
- Emails, template **Magic Link**: zet `{{ .Token }}` in de tekst, bijvoorbeeld `Je inlogcode voor Woober is {{ .Token }}`. De app vraagt om die code van 6 cijfers.
- Emails, SMTP Settings: koppel een eigen mailprovider (bijvoorbeeld Postmark of Resend) met afzender `noreply@woober.nl`. Zonder eigen SMTP stuurt Supabase maar een paar mails per uur.

**2. Google** ([Google Cloud Console](https://console.cloud.google.com))

- Maak een project Woober, vul het OAuth-toestemmingsscherm in (naam Woober, logo, link naar `https://woober.nl/privacy`) en publiceer het.
- Credentials, OAuth client ID, type **Web application**. Authorized redirect URI: `https://hnvafpbxhkxpvwwsgoba.supabase.co/auth/v1/callback`.
- Zet Client ID en Client Secret in Supabase bij Authentication, Sign In / Providers, Google, en zet Google aan.

**3. Apple** ([Apple Developer](https://developer.apple.com/account), lidmaatschap nodig)

- Identifiers, App ID `nl.woober.app` met **Sign in with Apple** aan.
- Identifiers, Services ID, bijvoorbeeld `nl.woober.web`, voor het web en Android. Bij Sign in with Apple: domein `hnvafpbxhkxpvwwsgoba.supabase.co`, return URL `https://hnvafpbxhkxpvwwsgoba.supabase.co/auth/v1/callback`.
- Keys, nieuwe sleutel met Sign in with Apple. Bewaar het `.p8`-bestand veilig, niet in deze repository.
- Supabase, provider Apple: Client IDs `nl.woober.app,nl.woober.web` (voor testen in Expo Go ook `host.exp.Exponent`), en het geheime sleutelwoord dat je met Team ID, Key ID en het `.p8`-bestand maakt (Supabase heeft daar een hulpmiddel voor op de pagina van de provider). Dit geheim verloopt na 6 maanden; zet een herinnering.

Op iPhone gebruikt de app het eigen inlogvenster van Apple; op Android en het web gaat Apple via de browser. Apple eist in de App Store dat je je account in de app kunt verwijderen; dat kan onder Account.

Testen: `npx expo start`, dan **Inloggen of account maken**. Op het web werken Google en e-mail meteen na stap 1 en 2. Voor het eigen Apple-venster op iPhone is een development build het betrouwbaarst (`npx eas-cli@latest build --profile development --platform ios`).

## Zo werkt de demo

- **De andere kant speelt de app zelf.** Boek je als eigenaar, dan accepteert de uitlater na een paar seconden, fietst naar je toe en stuurt onderweg foto's. Ben je uitlater en ga je online, dan komen er vanzelf verzoeken binnen.
- **De tijd loopt 30 keer sneller**, dus een wandeling van 30 minuten duurt een minuut. Oppas loopt 120 keer sneller: 3 uur duurt anderhalve minuut. Met **Sneller (demo)** spring je 5 minuten vooruit, bij oppas een half uur. Instelbaar in `src/lib/simulatie.ts`.
- **De kaart is een verzonnen wijk** aan de Waal, getekend met SVG. Zo werkt alles zonder kaartsleutels, ook op het web. Routes lopen over de straten; wandelingen gaan rond de vijver in het Stadspark.
- **De ophaalcode** zie je als eigenaar in de app; als uitlater staat de code in de demo onder het invulveld.
- **Verdienmodel**: de demo start in de fase Lancering, zonder servicekosten en commissie. Gebruikers zien het verdienmodel niet; alleen beheerders (zie hieronder). Actiecodes WOOBER5 en BUURT10 geven tegoed.

## Beheer

Een beheerder ziet onder Account het menu **Beheer**. Demo-gebruikers en gewone accounts zien dit nooit; de database controleert het ook zelf.

- **Cijfers**: accounts, eigenaren, uitlaters, honden, plekken en de wachtlijst.
- **Plekken en meldingen**: nieuwe plekken goedkeuren of verbergen, gemelde plekken en reviews afhandelen met een besluit, elke plek aanpassen of op de kaart verschuiven, en de onderzochte plekken in Nijmegen inladen (`supabase/plekken/nijmegen.json`; de coördinaten zoekt de app bij OpenStreetMap).
- **Uitlaters verifiëren**: per uitlater identiteit, verzekering, rekening en eventueel VOG aanzetten, met het e-mailadres om stukken op te vragen. Pas met de eerste drie is een uitlater zichtbaar.
- **Wachtlijst**: wie het wil weten zodra Woober in de buurt start, per postcodegebied.
- **Teksten in de app**: de bewerkmodus en een lijst met alle teksten, zie hieronder.
- **Verdienmodel**: het actieve model, een nieuw model inplannen (de database weigert terugwerkende kracht en een hogere commissie binnen 15 dagen) en de fases doorrekenen.

Beheerder word je alleen via de database, nooit vanuit de app. Log eerst één keer in met je account en voer dan in de SQL-editor van Supabase uit:

```sql
insert into public.beheerders (gebruiker_id) select id from auth.users where email = 'jouw@adres.nl';
```

Daarna opnieuw inloggen. Een beheerder weghalen: `delete from public.beheerders where gebruiker_id = ...`.

Onder Beheer, **Teksten in de app** pas je zonder nieuwe versie teksten aan: een mededeling voor iedereen, het welkomscherm, het inlogscherm, de teksten en de wachtlijstknop op het startscherm, verificatie, het noodnummer, het contactadres, de uitleg in Woober Fit en de gegevens in de privacyverklaring en de gebruiksvoorwaarden. Iedereen ziet de nieuwe tekst zodra de app opent, ook op woober.nl.

- **Bewerkmodus**: zet hem aan en ga gewoon door de app. Bij elke aanpasbare tekst of knop staat een rood hamertje met een stippellijn eromheen; tik erop om hem aan te passen of de standaard terug te zetten. Lege teksten, zoals een mededeling die uit staat, verschijnen als vak zodat je ze kunt invullen. Met **Klaar** linksonder zet je de modus uit.
- **Welkomscherm en inlogscherm bekijken**: die zie je normaal niet als je bent ingelogd. Hier krijg je ze met hamers; de knoppen doen niets.
- **Alle teksten in een lijst**: voor teksten die je in de app moeilijk tegenkomt.

Een tekst aanpasbaar maken: voeg hem toe in `src/lib/teksten.ts`, gebruik `useTekst()` in het scherm en zet `<Bewerkbaar sleutels="...">` (`src/components/Bewerkbaar.tsx`) om wat hem toont.

## Wat zit erin

| Eigenaar | Uitlater |
| --- | --- |
| Kaart met uitlaters in de buurt en hun reistijd | Online gaan met één knop |
| Uitlater kiezen op afstand, beoordeling of prijs | Verzoek met hond, afstand, moment en wat je verdient |
| Nu, later of elke week boeken, 30 tot 60 minuten | Accepteren of weigeren, zonder gevolgen |
| Oppas bij jou of bij de oppas thuis, 2 tot 5 uur, verlengen of eerder thuis; afspraken over je huis | Uitlaten, oppas of allebei aanbieden, met eigen uurtarief; honden ook thuis ontvangen |
| Eerst kennismaken bij een nieuwe uitlater | Navigeren naar de eigenaar, ophaalcode controleren |
| Live volgen met ophaalcode, route en foto's | Foto, plas, poep, water en notitie tijdens de wandeling |
| Wandelrapport met fooi en beoordeling | Saldo onder Account: verdiensten, uitbetalen wanneer je wilt, betalen als eigenaar |
| Chat, melden, blokkeren en noodknop | Eigen tarief, werkgebied, rooster en verificatie |
| Tegoed, actiecodes en Woober Plus | Commissie en drukte-bonus per fase zichtbaar |
| | Woober Fit: stappen per dag, week en maand |

Een overzicht van schermen en bestanden staat in [PLAN.md](PLAN.md#wat-de-demo-laat-zien).

## De kaart

Echte accounts zien een echte kaart: Leaflet met de achtergrondkaart van PDOK (Kadaster), gratis en zonder sleutel. Op het web draait die in een afgeschermde iframe, in de app in een WebView (`react-native-webview`, zit in Expo Go). Leaflet zit als tekst in de app (`src/lib/leaflet.gen.ts`, opnieuw maken met `npm run kaart:leaflet`), zodat er niets van een CDN komt. De demo houdt de getekende wijk.

## Woober Fit

Uitlaters hebben de tab Fit, met bovenaan Woober Fit; hun verdiensten staan onder Account. In de demo zijn de stappen verzonnen (elke dag steeds dezelfde). Met een echt account telt de iPhone ze met de bewegingssensor (`expo-sensors`, zit in Expo Go): de telefoon kent de laatste 7 dagen, en Woober bewaart de dagtotalen op het toestel zodat week en maand gevuld blijven. Er gaat niets naar Supabase. Op Android en het web kan het nog niet; daarvoor is Health Connect nodig. Daarom staat het recht op bewegingsgegevens op Android uit in `app.json` (`blockedPermissions`). Koppelingen met Apple Gezondheid, Health Connect, Strava en Garmin staan op slot; zie [ACTIES.md](ACTIES.md).

## Betalen met Mollie

Eigenaren betalen per boeking via Mollie (iDEAL | Wero, Apple Pay of kaart). Mollie houdt het geld vast; het saldo van een uitlater is wat nog niet naar zijn eigen Mollie-account is gerouteerd. Uitbetalen routeert het, en Mollie maakt het over naar zijn bank volgens het schema dat hij in Mollie kiest. De keuzes staan in [PLAN.md](PLAN.md#hoe-anderen-het-doen-en-de-strategie-onderzocht-30-oktober-2026).

**Wat er staat**
- Database: `supabase/migrations/20261031000000_mollie.sql` met de tabellen `betalingen`, `mollie_koppelingen` en `mollie_routes`, en de functies die uitrekenen wat er terug moet en wat er gerouteerd wordt (oudste betalingen eerst). Getest met `npm run test:db`.
- Edge Functions in `supabase/functions/` (Deno), gecontroleerd met `npm run check:functions`:
  - `betaling-starten`: betaalpagina voor een boeking, een extra uur oppas of een fooi van de ingelogde eigenaar. Een extra uur gaat pas in als het betaald is.
  - `mollie-webhook`: Mollie meldt een wijziging; de functie haalt de stand zelf op en verwerkt die, ook terugbetalingen en terugboekingen.
  - `mollie-aansluiten` en `mollie-oauth`: een uitlater koppelt zijn Mollie-account (OAuth). Klaar bij Mollie maakt zijn rekening geverifieerd.
  - `betalingen-verwerken`: elke paar minuten terugbetalen, automatisch uitbetalen na 80 dagen, routes en overboekingen naar uitlaters, en de stand van het aansluiten.
- App: `src/lib/betalen.ts`, koppelen onder Verificatie, het Saldo-scherm voor echte accounts, `/betaald` na de betaalpagina, en Beheer, Terugboekingen.

**Regels**
- Boeken kan hooguit 60 dagen vooruit (de database weigert verder), zodat betaald geld ruim binnen de 90 dagen van Mollie bij de uitlater kan zijn.
- Routes nemen de oudste betalingen eerst en slaan betalingen ouder dan 88 dagen over. Automatisch uitbetalen gebeurt als geld 80 dagen op een saldo staat, of als het geld van uitlaters niet meer in de betalingen van de laatste 80 dagen past. Het aandeel van Woober (servicekosten, commissie) blijft over en gaat na 90 dagen vanzelf naar Woober.
- Terugboekingen via de bank (creditcard, Apple Pay; bij iDEAL bestaan ze niet) draagt Woober. Wat nog niet gerouteerd was, legt Woober bij via een overboeking. Bij een volledige terugboeking haalt Mollie wat al naar uitlaters ging bij hen terug; Woober vult dat automatisch aan (een uitbetaling met reden `aanvulling`, niet van het saldo). Een medewerker beoordeelt de eigenaar in Beheer, Terugboekingen.

**Nog niet**: de echte boekflow (die roept `startBetaling()` aan, ook met soort `verlenging` vanaf het oppasscherm; komt met Echt boeken).

**Instellen** (eenmalig; ACTIES.md, stap 3):
1. Mollie-account op naam van de onderneming; zet Mollie Connect for Marketplaces aan en vraag Mollie om vertraagde routing (bruto-afrekening) en Balance Transfers.
2. Mollie, Developers, Apps: een OAuth-app met redirect URI `https://hnvafpbxhkxpvwwsgoba.supabase.co/functions/v1/mollie-oauth`.
3. Mollie, Developers: een organisatietoken met rechten voor Balance Transfers, en het organisatie-ID (`org_...`) van Woober.
4. Supabase, Edge Functions, Secrets: `MOLLIE_API_KEY` (eerst de `test_`-sleutel), `MOLLIE_CLIENT_ID`, `MOLLIE_CLIENT_SECRET`, `MOLLIE_ORG_TOKEN`, `MOLLIE_ORG_ID`, `APP_URL` (`https://woober.nl`) en `WOOBER_GEHEIM` (een lange willekeurige tekst). `SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` zet Supabase zelf.
5. Functies uitrollen (of laat Claude het doen via de Supabase-koppeling). De webhook, de OAuth-terugkeer en de worker zonder JWT-controle, want Mollie en de cron sturen geen inlogsleutel mee:

```bash
npx supabase functions deploy betaling-starten --project-ref hnvafpbxhkxpvwwsgoba
```
```bash
npx supabase functions deploy mollie-aansluiten --project-ref hnvafpbxhkxpvwwsgoba
```
```bash
npx supabase functions deploy mollie-webhook --no-verify-jwt --project-ref hnvafpbxhkxpvwwsgoba
```
```bash
npx supabase functions deploy mollie-oauth --no-verify-jwt --project-ref hnvafpbxhkxpvwwsgoba
```
```bash
npx supabase functions deploy betalingen-verwerken --no-verify-jwt --project-ref hnvafpbxhkxpvwwsgoba
```

6. De worker elke 5 minuten laten draaien: zet onder Database, Extensions `pg_cron` en `pg_net` aan en voer in de SQL-editor uit (met je eigen `WOOBER_GEHEIM`):

```sql
select cron.schedule('betalingen-verwerken', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://hnvafpbxhkxpvwwsgoba.supabase.co/functions/v1/betalingen-verwerken',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-woober-geheim', 'JOUW_WOOBER_GEHEIM'),
    body := '{}'::jsonb
  );
$$);
```

7. Testen met de testsleutel van Mollie; daarna `MOLLIE_API_KEY` vervangen door de `live_`-sleutel.

Aanroepen naar Mollie staan op één plek, `supabase/functions/_shared/mollie.ts`. Die met "Controleren" (routes achteraf, Balance Transfers en het veld `amountChargedBack`) moet je bij het instellen naast de documentatie van Mollie leggen (Delayed routing, Balance transfers en de Payments API): die was tijdens het bouwen niet bereikbaar. Wat Mollie doet bij terugboekingen is wel nagelezen (Connect for Marketplaces, Processing payments).

## Builds voor de stores

`eas.json` heeft een profiel `preview` (testversie om te delen, op Android een apk) en `production`. Eerst één keer `npx eas-cli@latest init` om het project aan je Expo-account te koppelen, daarna bijvoorbeeld `npx eas-cli@latest build --profile preview --platform all`. Zie [ACTIES.md](ACTIES.md).

## Nog niet in deze versie

Zie [ACTIES.md](ACTIES.md) voor wat nog moet gebeuren, en door wie.

- Echte boekingen, chat en statuswijzigingen via de databasefuncties en Realtime (schema klaar in `supabase/migrations/`); tot dan alleen in de demo
- Locatie tijdens de wandeling (`expo-location`)
- Betalen in de echte boekflow (de koppeling met Mollie staat klaar, zie Betalen met Mollie)
- Pushmeldingen en foto's uploaden
- Koppelingen van Woober Fit met Apple Gezondheid, Health Connect, Strava en Garmin
