# Woober

Klikbare demo van Woober, het zusje van Woofer: hondeneigenaren boeken een uitlater of een oppas aan huis uit de buurt zoals je bij Uber een rit boekt, en volgen het live. Bovenin kies je **Uitlaten** of **Oppas**, de rest werkt hetzelfde. Het plan staat in [PLAN.md](PLAN.md).

Gebouwd met Expo (SDK 58) en Expo Router, in de huisstijl van Woofer. Dezelfde code draait als iOS-app, Android-app en web app.

Er zijn twee manieren om de app te gebruiken:

- **Echt account**: inloggen met Apple, Google of een code per e-mail. Account, adres, honden en uitlaatprofiel staan in Supabase (Frankfurt). Boeken, chat, kaart en betalen werken nog met de voorbeelden uit de demo; de app zegt dat er ook bij.
- **Demo**: op het welkomscherm **Demo eigenaar** of **Demo uitlater**. Alles is verzonnen en wordt niet opgeslagen; na herladen begin je opnieuw.

## Starten

```bash
npm install
npx expo start        # druk op w (web), i (iOS-simulator) of a (Android)
```

Op je telefoon: installeer Expo Go en scan de QR-code uit `npx expo start`.

Op het welkomscherm kies je **Demo eigenaar** of **Demo uitlater**. Je kunt later wisselen via Account.

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
- **Verdienmodel**: de demo start in de fase Lancering, zonder servicekosten en commissie. Onder Account, Verdienmodel (demo) wissel je naar Groei of het Uber-model, boots je drukte na en zie je wat eigenaar, uitlater en Woober krijgen. Actiecodes WOOBER5 en BUURT10 geven tegoed.

## Wat zit erin

| Eigenaar | Uitlater |
| --- | --- |
| Kaart met uitlaters in de buurt en hun reistijd | Online gaan met één knop |
| Uitlater kiezen op afstand, beoordeling of prijs | Verzoek met hond, afstand, moment en wat je verdient |
| Nu, later of elke week boeken, 30 tot 60 minuten | Accepteren of weigeren, zonder gevolgen |
| Oppas aan huis, 2 tot 5 uur, verlengen of eerder thuis | Uitlaten, oppas of allebei aanbieden, met eigen uurtarief |
| Eerst kennismaken bij een nieuwe uitlater | Navigeren naar de eigenaar, ophaalcode controleren |
| Live volgen met ophaalcode, route en foto's | Foto, plas, poep, water en notitie tijdens de wandeling |
| Wandelrapport met fooi en beoordeling | Verdiensten per dag en per week |
| Chat, melden, blokkeren en noodknop | Eigen tarief, werkgebied, rooster en verificatie |
| Tegoed, actiecodes en Woober Plus | Commissie en drukte-bonus per fase zichtbaar |

Een overzicht van schermen en bestanden staat in [PLAN.md](PLAN.md#wat-de-demo-laat-zien).

## Nog niet in deze versie

- Echte boekingen, chat en statuswijzigingen via de databasefuncties en Realtime (schema klaar in `supabase/migrations/`)
- Echte kaart en locatie (`react-native-maps` en `expo-location`)
- Betalen via Stripe Connect en iDEAL
- Pushmeldingen, foto's uploaden, moderatiescherm
