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
  6. `20261030000000_saldo.sql` (saldo van uitlaters: uitbetalen wanneer je wilt en betalen met je saldo)
  7. `20261031000000_mollie.sql` (betalen via Mollie; zonder sleutels van Mollie gebeurt er nog niets)
  8. `20261101000000_oppas_en_afgeven.sql` (oppas bij de oppas thuis, afspraken over het huis, afgeven op een ander punt)

  Twee manieren: zeg in een sessie met Claude dat je klaar staat en keur de vraag van Supabase direct goed (die liep steeds na 60 seconden af), of plak elk bestand zelf in de SQL-editor van Supabase (project Woober) en klik op Run. Daarna staan onder Database, Migrations de nieuwe namen.
- [ ] **Inloggen instellen in Supabase** (Authentication). Stappen staan in [README.md](README.md#inloggen-met-apple-en-google-instellen):
  - URL Configuration: Site URL `https://woober.nl`; Redirect URLs `https://woober.nl/aanmelden`, `http://localhost:8081/aanmelden`, `woober://auth` en `exp://**`.
  - E-mailtemplate Magic Link: zet `{{ .Token }}` in de tekst, anders krijgt niemand een inlogcode.
  - SMTP: een eigen mailprovider (bijvoorbeeld Postmark of Resend) met afzender op woober.nl. Zonder eigen SMTP stuurt Supabase maar een paar mails per uur.
- [ ] **Google**: OAuth-client in Google Cloud aanmaken en Client ID en Secret in Supabase zetten.
- [ ] **Apple**: lidmaatschap Apple Developer, App ID `nl.woober.app` met Sign in with Apple, een Services ID voor web en Android, een sleutel (`.p8`) en het geheim in Supabase. Dat geheim verloopt na 6 maanden: zet een herinnering. Tot dit klaar is, staat Doorgaan met Apple met een slotje op het inlogscherm; zeg het tegen Claude, dan gaat het slotje eraf (`APPLE_INLOGGEN_KLAAR` in `src/lib/account.ts`).
- [ ] **Jezelf beheerder maken**: log één keer in op de app en voer in de SQL-editor uit:
  `insert into public.beheerders (gebruiker_id) select id from auth.users where email = 'jouw@adres.nl';`
  Daarna uit- en weer inloggen; onder Account staat dan Beheer.

## 2. Direct daarna, in de app onder Beheer

- [ ] **Teksten**: vul bij Privacyverklaring het e-mailadres voor privacyvragen in, en bij Contact het e-mailadres voor hulp (in de app onder Beheer, Teksten). Naam, KvK-nummer (71670912) en adres staan erin.
- [ ] **Handelsnaam Woober inschrijven bij de KvK**: in het Handelsregister staat alleen Woofer Inc. Een naam die je gebruikt, moet ingeschreven zijn; een extra handelsnaam toevoegen kan online bij de KvK. Vraag daarbij ook na of "Inc." mag voor jouw rechtsvorm: een handelsnaam mag geen verkeerde indruk van de rechtsvorm geven.
- [ ] **Plekken, Inladen**: laad de 17 onderzochte plekken in Nijmegen in (bronnen in `supabase/plekken/nijmegen.json`). Je telefoon of browser zoekt de coördinaten op bij OpenStreetMap.
- [ ] **Plekken, Alle plekken**: open elke plek en schuif hem zo nodig op de juiste plek. Parken komen soms in het midden van een wijk uit. Controleer extra: Goffertpark, Stadspark Meijhorst, Strandje Spiegelwaal en Pimpelmees; daarvoor vond ik maar één bron, of een oude.
- [ ] **Mailboxen** aanmaken voor de adressen die je invult, zoals hulp@ en privacy@woober.nl.

## 3. Voor de echte lancering

- [ ] **Juridisch laten toetsen**: gebruiksvoorwaarden (`/voorwaarden`) en privacyverklaring (`/privacy`) zijn concepten. Haal daarna de conceptwaarschuwing weg onder Beheer, Teksten.
- [ ] **Verwerkersovereenkomsten** afsluiten of accepteren met Supabase en Netlify (AVG).
- [ ] **Offerte en antwoorden van Mollie voor Connect for Marketplaces** (de gekozen weg voor de lancering, zie PLAN.md, Hoe anderen het doen, en de strategie). Vraag hun salesteam, met Woober als marktplaats van uitlaters en oppassen, ook om een offerte met de kosten per aangesloten en per actieve uitlater, routering en uitbetalingen, en of de eerste uitbetalingen van een uitlater gratis zijn:
  1. Kunnen uitlaters zonder KvK-inschrijving (particulieren) een verbonden account krijgen voor Mollie Connect for Marketplaces?
  2. Kunnen we met vertraagde routing het geld van één betaling in delen en op verschillende momenten routeren, ook naar een andere uitlater (voor betalen met saldo)?
  3. Kan Woober het uitbetaalschema van een verbonden account bepalen of een uitbetaling starten, of kiest de uitlater dat zelf in zijn Mollie-dashboard?
  4. Wat kosten iDEAL | Wero, Apple Pay, kaart, routing en uitbetalingen per stuk, en kan Balance Transfers boven 1.000 euro per maand?
  5. Wanneer kunnen Nederlandse klanten via Mollie met Wero zelf betalen, en verandert er dan iets in de koppeling?
  6. Wanneer telt een uitlater als actief voor de maandkosten: bij een betaling, een route of een uitbetaling? En kunnen we een uitlater pas aansluiten bij zijn eerste uitbetaling, met zijn geld tot dan ongerouteerd?
  Is het antwoord van Mollie op vraag 1 nee, kies dan Stripe Connect: uitlaters zonder KvK moeten mee kunnen doen.
- [ ] **Mollie instellen** zodra de antwoorden hierboven goed zijn: de 7 stappen in [README.md](README.md#betalen-met-mollie) (account en Connect for Marketplaces, OAuth-app, organisatietoken, Secrets in Supabase, functies uitrollen, de worker elke 5 minuten, eerst testen met de testsleutel). Vraag Mollie ook om vertraagde routing en Balance Transfers aan te zetten. Sla daarbij de pagina's Delayed routing en Balance transfers van docs.mollie.com op (zoals Processing payments), dan loopt Claude de aanroepen met "Controleren" ermee na, of laat docs.mollie.com toe in de netwerkinstellingen van Claude Code. Uitlaters kunnen daarna onder Verificatie hun Mollie-account koppelen; dat werkt al voordat boeken echt kan.
- [ ] **Later, als eigenaren willen storten**: een offerte van Mangopay (wallet-partner met e-geldvergunning). Vraag naar een maandelijks minimum, opstartkosten en kosten per identiteitscontrole; die kunnen voor een start zonder omzet te hoog zijn.
- [ ] **Storten in een Woober Wallet door eigenaren: kies A, B of C** (PLAN.md, Eisen voor betalen en de wallet). Storten en 1:1 terugkrijgen is elektronisch geld, ook als het credits heet. Laat een jurist met kennis van de Wft en DNB-regels kiezen tussen storten bij de betaalpartner (B) en eigen tegoed onder een uitzondering (C). Tot die keuze betalen eigenaren per boeking (A); dat kan zonder vergunning.
- [ ] **Saldo laten toetsen**: uitlaters houden hun verdiensten op een saldo en kunnen ermee betalen als eigenaar. Het geld staat bij Mollie, niet bij Woober, zodat Woober geen vergunning van DNB nodig heeft als betaalinstelling. Laat een jurist met kennis van betaalregels (Wft, PSD2) bevestigen dat dit zo klopt, ook voor het betalen met saldo, en de alinea over het saldo in de voorwaarden nakijken.
- [ ] **Zoekmachines toelaten**: in `public/index.html` staat nog `noindex`. Laat Claude dat weghalen zodra de teksten definitief zijn.
- [ ] **Balk "Powered by Netlify"**: die ligt op telefoons over de tabbalk en komt niet uit onze code. Kijk in Netlify bij de site-instellingen of je die uit kunt zetten, of laat Claude ruimte maken.
- [ ] **Uit PLAN.md, nog open**: merkonderzoek naar de naam (BOIP en EUIPO), toets van de Wet platformwerk door een arbeidsrechtspecialist, en de verzekering voor uitlaters en oppassen.
- [ ] **No-show melden laten meenemen in die toets**: een eigenaar kan melden dat een uitlater niet kwam of laat afzegde; een medewerker beoordeelt dat en de eigenaar krijgt dan zijn geld terug (staat in de demo en in de concept-voorwaarden). Vraag de specialist ook wat een medewerker bij herhaling mag doen, en of de zin "Afzeggen heeft geen gevolgen voor je account" bij uitlaters dan nog klopt. Tot die toets is er niets van zichtbaar voor andere gebruikers.

## 4. App Store en Google Play

- [ ] Accounts bij Apple Developer (99 dollar per jaar) en Google Play Console (eenmalig 25 dollar).
- [ ] Expo-account en `npx eas-cli@latest init` in deze map, zodat `eas.json` aan je project hangt. Daarna kan Claude een testversie bouwen met `npx eas-cli@latest build --profile preview --platform all`.
- [ ] Storevermelding: naam, beschrijving, schermafbeeldingen, link naar `https://woober.nl/privacy`, de privacyvragen van beide stores en een testaccount voor de reviewers.
- [ ] **Inloggen met Apple aan vóór de eerste inzending bij Apple**: wie inloggen met Google aanbiedt, moet van Apple ook een inlogoptie bieden waarbij je je e-mailadres kunt afschermen. Doorgaan met Apple doet dat; zie stap 1.

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

1. **Echt boeken**: geverifieerde uitlaters op de kaart, boeken met `vraag_boeking_aan`, accepteren, onderweg en ophaalcode met `wijzig_status` en `start_wandeling`, live bijwerken met Realtime, chat via de tabel `berichten`, en personen melden en blokkeren. Ook de melding van een no-show of late afzegging (nu alleen in de demo, `src/components/AfspraakMelden.tsx`): naar de tabel `meldingen` met de boeking erbij, in Beheer met een besluit, de uitlater kan reageren, en bij gelijk het geld terug via Mollie (`terug_te_betalen`). Daarna gaat de wachtlijst over in "je kunt nu boeken".
2. **Pushmeldingen** met `expo-notifications`. Nodig van jou: het EAS-project uit stap 4 en de pushsleutel van Apple.
3. **Locatie en foto's tijdens de wandeling** met `expo-location` en Supabase Storage. Nodig: een testversie, want Expo Go volstaat dan niet meer.
4. **Betalen**: de koppeling met Mollie is gebouwd (README, Betalen met Mollie). Wat overblijft: in de echte boekflow `startBetaling()` aanroepen, en betalen met saldo voor echte accounts. Nodig van jou: Mollie instellen (stap 3).
5. **Verificatie automatiseren**: Mollie controleert identiteit en rekening bij het aansluiten; de polis uploaden naar een privé-bucket. Tot dan doe je het met de hand in Beheer.
6. **Besloten test** met een handvol uitlaters en eigenaren in Nijmegen.

Los daarvan, zodra jij stap 5 hebt gedaan: de **koppelingen van Woober Fit**. Apple Gezondheid en Health Connect op de telefoon zelf (dan kan ook de stappenteller op Android, die staat nu uit); Strava en Garmin via Supabase Edge Functions.
