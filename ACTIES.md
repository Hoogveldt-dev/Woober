# Woober: wat er nog moet gebeuren

Stand van 30 oktober 2026, bijgewerkt bij de PR met Woober Fit (stap 5). De vinkjes kun je zelf afvinken.

## 1. Voordat je de PR samenvoegt

Zonder deze stappen werkt aanmelden met een echt account niet zodra de PR op woober.nl staat.

- [ ] **Migraties op Supabase zetten**, in deze volgorde (map `supabase/migrations/`):
  1. `20261028000000_accounts.sql`
  2. `20261028010000_beheer.sql`
  3. `20261028030000_teksten.sql`
  4. `20261029000000_lancering.sql`
  5. `20261029010000_rechten.sql` (later toegevoegd: zet functies dicht voor wie niet is ingelogd)

  Twee manieren: zeg in een sessie met Claude dat je klaar staat en keur de vraag van Supabase direct goed (die liep steeds na 60 seconden af), of plak elk bestand zelf in de SQL-editor van Supabase (project Woober) en klik op Run. Daarna staan onder Database, Migrations de nieuwe namen.
- [ ] **Inloggen instellen in Supabase** (Authentication). Stappen staan in [README.md](README.md#inloggen-met-apple-en-google-instellen):
  - URL Configuration: Site URL `https://woober.nl`; Redirect URLs `https://woober.nl/aanmelden`, `http://localhost:8081/aanmelden`, `woober://auth` en `exp://**`.
  - E-mailtemplate Magic Link: zet `{{ .Token }}` in de tekst, anders krijgt niemand een inlogcode.
  - SMTP: een eigen mailprovider (bijvoorbeeld Postmark of Resend) met afzender op woober.nl. Zonder eigen SMTP stuurt Supabase maar een paar mails per uur.
- [ ] **Google**: OAuth-client in Google Cloud aanmaken en Client ID en Secret in Supabase zetten.
- [ ] **Apple**: lidmaatschap Apple Developer, App ID `nl.woober.app` met Sign in with Apple, een Services ID voor web en Android, een sleutel (`.p8`) en het geheim in Supabase. Dat geheim verloopt na 6 maanden: zet een herinnering.
- [ ] **Jezelf beheerder maken**: log één keer in op de app en voer in de SQL-editor uit:
  `insert into public.beheerders (gebruiker_id) select id from auth.users where email = 'jouw@adres.nl';`
  Daarna uit- en weer inloggen; onder Account staat dan Beheer.

## 2. Direct daarna, in de app onder Beheer

- [ ] **Teksten**: vul bij Privacyverklaring de naam van de onderneming, KvK-nummer, vestigingsadres en het e-mailadres voor privacyvragen in, en bij Contact het e-mailadres voor hulp. Nu staan daar nog `[KvK-nummer]` en dergelijke, ook in de gebruiksvoorwaarden.
- [ ] **Plekken, Inladen**: laad de 17 onderzochte plekken in Nijmegen in (bronnen in `supabase/plekken/nijmegen.json`). Je telefoon of browser zoekt de coördinaten op bij OpenStreetMap.
- [ ] **Plekken, Alle plekken**: open elke plek en schuif hem zo nodig op de juiste plek. Parken komen soms in het midden van een wijk uit. Controleer extra: Goffertpark, Stadspark Meijhorst, Strandje Spiegelwaal en Pimpelmees; daarvoor vond ik maar één bron, of een oude.
- [ ] **Mailboxen** aanmaken voor de adressen die je invult, zoals hulp@ en privacy@woober.nl.

## 3. Voor de echte lancering

- [ ] **Juridisch laten toetsen**: gebruiksvoorwaarden (`/voorwaarden`) en privacyverklaring (`/privacy`) zijn concepten. Haal daarna de conceptwaarschuwing weg onder Beheer, Teksten.
- [ ] **Verwerkersovereenkomsten** afsluiten of accepteren met Supabase en Netlify (AVG).
- [ ] **Zoekmachines toelaten**: in `public/index.html` staat nog `noindex`. Laat Claude dat weghalen zodra de teksten definitief zijn.
- [ ] **Balk "Powered by Netlify"**: die ligt op telefoons over de tabbalk en komt niet uit onze code. Kijk in Netlify bij de site-instellingen of je die uit kunt zetten, of laat Claude ruimte maken.
- [ ] **Uit PLAN.md, nog open**: merkonderzoek naar de naam (BOIP en EUIPO), toets van de Wet platformwerk door een arbeidsrechtspecialist, en de verzekering voor uitlaters en oppassen.

## 4. App Store en Google Play

- [ ] Accounts bij Apple Developer (99 dollar per jaar) en Google Play Console (eenmalig 25 dollar).
- [ ] Expo-account en `npx eas-cli@latest init` in deze map, zodat `eas.json` aan je project hangt. Daarna kan Claude een testversie bouwen met `npx eas-cli@latest build --profile preview --platform all`.
- [ ] Storevermelding: naam, beschrijving, schermafbeeldingen, link naar `https://woober.nl/privacy`, de privacyvragen van beide stores en een testaccount voor de reviewers.

## 5. Woober Fit: koppelingen instellen

In de tab Fit van uitlaters (Woober Fit) staan Apple Fitness, Google Fit, Strava en Garmin nu met een slotje. De stappenteller zelf werkt al: in de demo met verzonnen stappen, bij echte accounts op de iPhone met de bewegingssensor van de telefoon. Die stappen blijven op de telefoon. Per koppeling heb ik dit van jou nodig; daarna bouwt Claude hem (stap 7).

- [ ] **Volgorde kiezen.** Mijn advies: eerst Apple Gezondheid en Health Connect. Die lezen op de telefoon zelf, zonder server, en de stappen hoeven niet naar Woober. Daarna Strava, Garmin als laatste.
- [ ] **Apple Fitness, via Apple Gezondheid (HealthKit).** Apple Fitness heeft geen eigen koppeling; de gegevens staan in Apple Gezondheid.
  - Apple Developer-lidmaatschap (stap 4) en bij App ID `nl.woober.app` de capability **HealthKit** aanzetten.
  - In App Store Connect bij de privacyvragen aangeven dat de app gezondheids- en fitnessgegevens leest en dat die niet voor reclame worden gebruikt.
  - Testen kan alleen met een testversie (development build), niet in Expo Go.
- [ ] **Google Fit, via Health Connect.** Google stopt eind 2026 met de koppelingen van Google Fit; Health Connect is de opvolger op Android en leest ook wat Google Fit, Samsung Health en andere apps bijhouden.
  - Google Play Console-account (stap 4).
  - In de Play Console de verklaring voor Health Connect invullen: welke gegevens (stappen, afstand, activiteiten) en waarom. Google beoordeelt dat met de hand.
  - Testen met een testversie op een Android-telefoon met Health Connect.
- [ ] **Strava.**
  - Een app aanmaken op [strava.com/settings/api](https://www.strava.com/settings/api): naam Woober, website `https://woober.nl`, Authorization Callback Domain `woober.nl`. Volgens Strava heb je daarvoor een Strava-abonnement nodig.
  - Client ID en Client Secret als geheim in Supabase zetten (Edge Functions, Secrets) of in een sessie aan Claude geven om dat te doen. Nooit in de app.
  - De API Agreement van Strava lezen (laatst bijgewerkt op 1 juni 2026). Woober toont iemands Strava-gegevens alleen aan die persoon zelf.
  - Een nieuwe Strava-app kan maar een paar sporters koppelen (volgens de documentatie tot 10). Vraag daarna een review aan bij Strava.
- [ ] **Garmin.**
  - Aanvraag bij het Garmin Connect Developer Program ([developer.garmin.com](https://developer.garmin.com)), op naam van de onderneming (KvK), met het doel en hoe we met privacy omgaan. Garmin beoordeelt elke aanvraag zelf.
  - Let op: volgens berichten uit september 2026 neemt Garmin tijdelijk geen nieuwe aanvragen aan. Kijk op de site of het formulier weer open is.
  - Na goedkeuring de sleutels als geheim in Supabase.
- [ ] **Juridisch meenemen** (stap 3): stappen en activiteiten kunnen onder de AVG als gezondheidsgegevens gelden. Laat toetsen wat er nodig is voordat een koppeling echt wordt. Strava en Garmin lopen via een server, dus dan bewaart Woober wel gegevens in Supabase; Claude past daarvoor de privacyverklaring aan.

## 6. Wat ik in deze sessie niet kon doen, en waarom

| Wat | Waarom | Wat er nu staat |
| --- | --- | --- |
| Migraties op Supabase zetten | Supabase vraagt jouw goedkeuring; die vraag liep steeds af | Migraties en 178 databasetests in de repository (stap 1) |
| Echt inloggen en echte data testen | Deze omgeving kan Supabase niet bereiken | Getest in de browser met een nagebootste Supabase, plus de databasetests |
| Apple, Google en SMTP instellen | Dat vraagt jouw accounts en geheime sleutels | Code klaar, stappen in de README |
| Coördinaten van de plekken ophalen | OpenStreetMap en PDOK zijn hier geblokkeerd | Inladen via Beheer op jouw apparaat |
| Officiële losloopgebieden van de gemeente | data.overheid.nl en nijmegen.nl zijn hier geblokkeerd | Sta die domeinen toe bij Network access van de omgeving, dan haalt Claude de open data op |
| De app op een iPhone of Android testen | Geen simulator hier; de kaart in de app (WebView) en het Apple-inlogvenster werken alleen in de app zelf | Op het web getest; test op je telefoon met Expo Go of een testversie |
| Kaarttegels zien | PDOK is hier geblokkeerd, de kaart bleef grijs | Spelden, kiezen en verschuiven getest; op je telefoon laadt PDOK gewoon |
| Stappenteller op een iPhone testen (30 oktober) | Geen iPhone of simulator hier | Op het web getest met de demo. Open op je iPhone met een echt uitlateraccount de tab Fit en tik op Stappen tellen aanzetten |
| Documentatie van Expo lezen (30 oktober) | docs.expo.dev is hier geblokkeerd | Gebouwd op de uitleg in het pakket `expo-sensors` zelf (versie 58) |

## 7. Wat er daarna gebouwd moet worden (door Claude)

Op volgorde, zoals in [PLAN.md](PLAN.md#volgorde-van-bouwen):

1. **Echt boeken**: geverifieerde uitlaters op de kaart, boeken met `vraag_boeking_aan`, accepteren, onderweg en ophaalcode met `wijzig_status` en `start_wandeling`, live bijwerken met Realtime, chat via de tabel `berichten`, en personen melden en blokkeren. Daarna gaat de wachtlijst over in "je kunt nu boeken".
2. **Pushmeldingen** met `expo-notifications`. Nodig van jou: het EAS-project uit stap 4 en de pushsleutel van Apple.
3. **Locatie en foto's tijdens de wandeling** met `expo-location` en Supabase Storage. Nodig: een testversie, want Expo Go volstaat dan niet meer.
4. **Betalen** met Stripe Connect en iDEAL, eerst in testmodus. Nodig van jou: een Stripe-account op naam van de onderneming (met KvK).
5. **Verificatie automatiseren** met Stripe Identity en polis uploaden; tot dan doe je het met de hand in Beheer.
6. **Besloten test** met een handvol uitlaters en eigenaren in Nijmegen.

Los daarvan, zodra jij stap 5 hebt gedaan: de **koppelingen van Woober Fit**. Apple Gezondheid en Health Connect op de telefoon zelf (dan kan ook de stappenteller op Android, die staat nu uit); Strava en Garmin via Supabase Edge Functions.
