# Woober: plan voor het eerste concept

Oktober 2026 · versie 0.1 · hoort bij de klikbare demo in deze repository

## In het kort

Woober is het zusje van Woofer. Woofer brengt fokkers bij elkaar; Woober brengt hondeneigenaren en hondenmensen uit de buurt bij elkaar, op de manier waarop Uber en Lyft een rit regelen: je opent de app, ziet wie er in de buurt is, boekt, volgt het live en betaalt en beoordeelt in de app.

Woober heeft twee diensten, zoals Uber verschillende ritsoorten heeft. Zelfde app, zelfde systeem, andere selectie:

- **Uitlaten**: een wandeling van 30, 45 of 60 minuten, met live route.
- **Oppas aan huis**: iemand komt bij je thuis op je hond passen, 2 tot 5 uur, te verlengen. Spontaan een avondje weg? Eén tik en de oppas is onderweg.

Zelfde huisstijl als Woofer (kleuren, verloop, knoppen, lettertype, toon), maar een eigen merk, een eigen repository en straks een eigen database.

**De belangrijkste ontwerpkeuze**: het voelt als Uber, maar onder de motorkap is het een marktplaats. De uitlater bepaalt zelf tarief, werkgebied en werktijden en zegt vrij ja of nee; de eigenaar kiest zelf de uitlater. Woober wijst niets toe, stelt geen prijzen vast en straft niemand voor weigeren. Dat is nodig vanwege de Wet platformwerk (zie [Juridische keuzes in de code](#juridische-keuzes-in-de-code)). Het Uber-gevoel komt uit de vormgeving en de snelheid, niet uit de sturing.

## Hoe Uber-elementen in Woober terugkomen

| Uber of Lyft | Woober | Waarom zo |
| --- | --- | --- |
| Kaart met auto's in de buurt | Kaart met uitlaters die online zijn, met reistijd | Direct zien dat er iemand beschikbaar is |
| Rit, Eten, Pakketje bovenin | **Uitlaten** of **Oppas** bovenin het startscherm | Eén app, de selectie past zich aan |
| "Waar wil je heen?" | "Wie laat Luna uit?" of "Wie past op Luna?" met snelkeuzes (nu, vanavond, elke week) | Boeken in twee tikken |
| Kies UberX, Comfort, XL | Kies een uitlater of oppas uit een lijst, met eigen prijs, beoordeling en reistijd | Eigenaar kiest; geen automatische toewijzing |
| Rit verlengen of tussenstop | Oppas met een uur verlengen | Later thuis zonder gedoe |
| Prijs vooraf | Prijs vooraf, maar het tarief komt van de uitlater | Platform bepaalt de vergoeding niet |
| Chauffeur is onderweg, live op de kaart | Uitlater is onderweg, met aftellende minuten | Zelfde gevoel van zekerheid |
| Pincode bij instappen | Ophaalcode van 4 cijfers bij de deur | Hond gaat alleen mee met de juiste persoon |
| Live rit volgen | Live wandeling volgen met route, foto's, plas en poep | Kern van het vertrouwen |
| Betalen in de app, fooi, sterren | Idem, fooi gaat volledig naar de uitlater | Geen contant geld, geen gedoe |
| Chauffeursapp: online gaan, verzoek accepteren | Uitlatermodus: online gaan, verzoek accepteren of weigeren | Weigeren heeft geen gevolgen |
| Acceptatiegraad, deactivatie door algoritme | **Bewust niet** | Raakt twee criteria van de Wet platformwerk |
| Service fee en booking fee | Servicekosten en boekingskosten voor de eigenaar, commissie bij de uitlater | Tijdens de lancering alles gratis |
| Surge pricing | Drukte-toeslag, standaard uit; het grootste deel gaat naar de uitlater | Zie [Prijs en verdienmodel](#prijs-en-verdienmodel) |
| Uber One | Woober Plus: vast bedrag per maand, geen servicekosten | Binding van vaste klanten |
| Promo's en uitnodigen | Tegoed, actiecodes en een uitnodigingscode | Woober betaalt, de uitlater krijgt het volle bedrag |

## Positionering

De markt is niet leeg: Pawshake doet dit landelijk en er zijn veel lokale uitlaatservices. Woober onderscheidt zich op drie punten:

1. **Nu uitlaten**: binnen een kwartier iemand aan de deur, zoals een taxi. Pawshake werkt met aanvragen vooraf.
2. **Live meekijken**: route, foto's en een wandelrapport na afloop, standaard bij elke wandeling.
3. **Vaste wekelijkse wandeling**: één keer instellen, daarna loopt het vanzelf, met dezelfde uitlater.
4. **Oppas op afroep**: geen pension of logeeradres, maar iemand bij jou thuis, binnen een kwartier, met foto's en een plasrondje dat je live ziet. Ook vast in te plannen, bijvoorbeeld elke vrijdagavond.

Start in één stad (voorstel: Nijmegen, gelijk aan de Woofer-pilot). Eerst uitlaters werven, dan eigenaren.

## Rollen en kernflows

Eén account kan beide rollen hebben, zoals iemand die zelf een hond heeft en ook bijverdient. Wisselen gaat via Account.

### Eigenaar

1. Aanmelden: voornaam, e-mail, ophaaladres, 18 jaar of ouder, akkoord met voorwaarden.
2. Hondenprofiel: naam, ras of kruising, geboortedatum, grootte, energie, aanlijnen, omgang met andere honden, karakter, bijzonderheden, dierenarts. Meer honden mogelijk.
3. Startscherm: kaart met uitlaters in de buurt en de vraag "Wie laat je hond uit?".
4. Uitlater kiezen: welke honden, wanneer (nu, later, elke week), hoe lang (30, 45 of 60 minuten), sorteren op afstand, beoordeling of prijs.
5. Nieuwe uitlater? Eerst een gratis kennismaking van een kwartier. Bekende uitlater? Direct boeken.
6. Bevestigen: sleutelafspraak, bericht, betaalmethode (iDEAL, Apple Pay, kaart), prijsopbouw, annuleringsregels.
7. Live: aanvraag verstuurd, uitlater onderweg met aftellende minuten, ophaalcode, wandeling live met route en foto's, noodknop.
8. Wandelrapport: route, duur, afstand, plas en poep, foto's, notitie van de uitlater, betaling, fooi en beoordeling. Daarna opnieuw boeken of er een vaste wandeling van maken.

### Eigenaar die een oppas boekt

Zelfde stappen als uitlaten, met deze verschillen:

1. Op het startscherm tik je **Oppas**. Kaart, lijst en snelkeuzes laten dan alleen mensen zien die oppas aanbieden ("Nu, 3 uur", "Vanavond", "Elke vrijdag").
2. Je kiest 2, 3, 4 of 5 uur; de app toont tot hoe laat dat is. Standaard gaan al je honden mee.
3. De prijs is het uurtarief van de oppas maal het aantal uren, plus toeslag per extra hond en, afhankelijk van de fase, servicekosten.
4. Bij bevestigen meld je of er camera's in huis hangen, en schrijf je instructies (eten, plasrondje, bench).
5. Bij de deur noem je de code; daarna zie je live: foto's, eten, spelen, slapen, en het plasrondje om het blok op de kaart.
6. Later thuis? **Verlengen** met een uur. Eerder thuis? **Ik ben thuis** rondt af; de geboekte tijd wordt betaald.
7. Oppasrapport met notitie, betaling, fooi en beoordeling.

### Uitlater of oppas

1. Aanmelden en profiel invullen: welke diensten (uitlaten, oppas of allebei), over jou, ervaring, particulier of bedrijf met KvK, vervoer, **eigen tarief** per wandelduur en **eigen uurtarief** voor oppas, toeslag extra hond, maximaal aantal honden (nooit meer dan 8), werkgebied en weekrooster.
2. Verificatie: identiteit, aansprakelijkheidsverzekering en uitbetaalrekening verplicht; VOG optioneel. Pas daarna online.
3. Online gaan met de grote knop op de kaart. Verzoeken uit de buurt verschijnen als kaart onderin, met hond, afstand, moment, duur en wat je ontvangt.
4. Accepteren of weigeren. Weigeren heeft geen gevolgen en wordt niet geteld.
5. Onderweg naar de eigenaar, "Ik ben er", ophaalcode invullen, wandeling starten.
6. Tijdens de wandeling: foto, plas, poep, water en notitie met één tik; noodknop; beëindigen. Tijdens oppas: foto, eten, plas, slapen en notitie; afronden met "Eigenaar is thuis".
7. Afronden: verdiensten zien en de eigenaar beoordelen. Overzicht per week onder Verdiensten.

### Status van een boeking

```mermaid
stateDiagram-v2
    [*] --> aangevraagd: eigenaar boekt
    aangevraagd --> gepland: uitlater accepteert (later of wekelijks)
    aangevraagd --> onderweg: uitlater accepteert (nu)
    aangevraagd --> geweigerd: uitlater weigert, zonder gevolgen
    gepland --> onderweg: tijd om te vertrekken
    onderweg --> aangekomen: "Ik ben er"
    aangekomen --> bezig: juiste ophaalcode
    bezig --> afgerond: uitlater beëindigt, of eigenaar is thuis (oppas)
    gepland --> afgerond: kennismaking gehad
    aangevraagd --> geannuleerd
    gepland --> geannuleerd
    onderweg --> geannuleerd: kosten 50% van tarief
    aangekomen --> geannuleerd: kosten 50% van tarief
```

## Wat de demo laat zien

De demo draait als iOS-app, Android-app en web app. Alle gegevens zijn nepdata in het geheugen; de andere kant (uitlater of eigenaar) wordt nagespeeld en de tijd loopt 30 keer sneller. Starten: zie [README.md](README.md).

| Onderdeel | Bestand |
| --- | --- |
| Welkom met snelle demo als eigenaar of uitlater | `src/app/welkom.tsx` |
| Aanmelden met rolkeuze | `src/app/aanmelden.tsx` |
| Hondenprofiel | `src/components/HondFormulier.tsx`, `src/app/hond-aanmaken.tsx`, `src/app/hond/[id].tsx` |
| Startscherm eigenaar met kaart en keuze Uitlaten of Oppas | `src/app/(tabs)/index.tsx` |
| Uitlater of oppas kiezen (de "Kies je rit"-stap) | `src/app/boeken.tsx`, `src/lib/zoeken.ts` |
| Profiel van een uitlater | `src/app/uitlater/[id].tsx` |
| Kennismaking aanvragen | `src/app/kennismaking.tsx` |
| Bevestigen en betalen | `src/app/bevestigen.tsx` |
| Live volgen, ophaalcode, noodknop; bij oppas ook verlengen en "Ik ben thuis" | `src/app/wandeling/[id].tsx`, `src/components/IncidentBlad.tsx` |
| Wandel- of oppasrapport, fooi, beoordeling | `src/app/rapport/[id].tsx` |
| Activiteit en vaste wandelingen | `src/app/(tabs)/activiteit.tsx` |
| Chat met signalering van betalen buiten de app | `src/app/chat/[id].tsx` |
| Melden en blokkeren | `src/components/MeldenBlad.tsx` |
| Uitlater: online gaan en verzoeken | `src/app/werk/index.tsx` |
| Uitlater: opdracht uitvoeren | `src/app/opdracht/[id].tsx` |
| Uitlater: verdiensten, opdrachten, profiel, verificatie | `src/app/werk/*`, `src/components/UitlaterFormulier.tsx`, `src/app/verificatie.tsx` |
| Veiligheid en hulp | `src/app/veiligheid.tsx` |
| Plekken: kaart met losloopgebieden, hondvriendelijke stranden en horeca, met reviews | `src/app/(tabs)/plekken.tsx`, `src/app/plek/[id].tsx`, `src/data/plekken.ts`, `src/lib/plekken.ts` |
| Kaart van de demowijk met routes | `src/components/Kaart.tsx`, `src/data/stad.ts`, `src/lib/route.ts` |
| Prijzen, servicekosten, commissie, annuleren | `src/lib/prijs.ts`, `src/components/PrijsRegels.tsx` |
| Verdienmodel: fases, drukte, Woober Plus, tegoed | `src/lib/verdienmodel.ts`, demoscherm `src/app/verdienmodel.tsx` (Account, Verdienmodel) |
| Simulatie van de andere kant | `src/lib/simulatie.ts`, `src/state/AppContext.tsx` |
| Databaseschema met RLS (concept) | `supabase/migrations/`, test: `npm run test:db` |

## Prijs en verdienmodel

We beginnen zonder winst om gebruikers binnen te halen. Het Uber-achtige verdienmodel staat al volledig klaar, in de app en in de database, en gaat aan door een ander model in te plannen. Er hoeft dan niets meer gebouwd te worden.

### Wat altijd geldt

- De uitlater kiest een tarief per 30, 45 en 60 minuten en een toeslag per extra hond. Voor oppas kiest de oppas een **uurtarief**; de prijs is uurtarief maal aantal uren. Verlengen gaat per uur; eerder klaar betekent de geboekte tijd betalen.
- De eigenaar ziet vóór het boeken de volledige prijs, met alle kosten.
- Fooi gaat volledig naar de uitlater.
- Annuleren is gratis tot 2 uur van tevoren, of zolang de uitlater nog niet onderweg is. Daarna krijgt de uitlater 50% van het tarief. Gebruikt tegoed komt altijd terug.
- Elke boeking bewaart het model en de volledige prijsopbouw. Een nieuw model werkt nooit terug; verlengen rekent met de opbouw van de boeking. Een vaste wandeling krijgt elke keer de prijs van het moment waarop die keer wordt ingepland.

### De knoppen en drie fases

Alle knoppen staan op één plek: `src/lib/verdienmodel.ts` in de app, de tabel `verdienmodellen` in de database. In de demo wissel je onder Account, Verdienmodel (demo).

| Knop | Bij Uber | Lancering | Groei | Uber-model |
| --- | --- | --- | --- | --- |
| Servicekosten eigenaar, als deel van tarief en drukte | Service fee | Geen | 5%, min. €0,49 | 10%, min. €0,99, max. €5 |
| Boekingskosten per boeking | Booking fee | Geen | Geen | €0,49 |
| Commissie op de uitbetaling | Service fee chauffeur | Geen | 10% | 20% |
| Drukte-toeslag | Surge | Uit | Uit | Tot 1,5x, 75% naar de uitlater |
| Woober Plus, geen servicekosten | Uber One | Uit | €4,99 per maand | €4,99 per maand |
| Welkomsttegoed | Korting eerste rit | Geen | €5 | Geen |
| Uitnodigingstegoed, voor allebei | Referral | Geen | €5 | €5 |
| Actiecodes | Promo codes | Kan altijd | Kan altijd | Kan altijd |

Voorbeelden met Sanne (€12 voor 30 minuten, €11 per uur oppas), één hond. Per fase: wat de eigenaar betaalt, wat Sanne ontvangt en wat Woober houdt vóór de kosten van de betaalprovider.

| | Lancering | Groei | Uber-model | Uber-model bij drukte 1,5x |
| --- | --- | --- | --- | --- |
| 30 minuten uitlaten | €12,00 / €12,00 / €0 | €12,60 / €10,80 / €1,80 | €13,69 / €9,60 / €4,09 | €20,29 / €13,20 / €7,09 |
| 3 uur oppas | €33,00 / €33,00 / €0 | €34,65 / €29,70 / €4,95 | €36,79 / €26,40 / €10,39 | €54,94 / €36,30 / €18,64 |

Met Woober Plus betaalt de eigenaar in het Uber-model €12,49 voor dezelfde wandeling; Plus loont dan vanaf 5 wandelingen per maand. Tijdens de lancering betaalt Woober de transactiekosten zelf en elk tegoed: dat is de prijs van gratis, en staat zichtbaar in het grootboek.

### Zo staat het klaar in de database

Migratie `supabase/migrations/20261022010000_verdienmodel.sql`:

- `verdienmodellen` en `verdienmodel_planning`: wisselen van fase is een regel inplannen met `geldig_vanaf`. Nooit met terugwerkende kracht; een ingepland model ligt vast. Een hogere commissie kan pas 15 dagen na aankondiging ingaan (zie hieronder); de database dwingt dat af. Gunstiger voor uitlaters kan direct.
- `bereken_prijs()`: de enige plek waar de database een prijs uitrekent, met dezelfde regels en afronding als `berekenPrijs()` in de app. De test vergelijkt 900 prijzen tussen app en database.
- Bij elke boeking: model, drukte-factor, drukte, deel voor de uitlater, servicekosten, Plus, boekingskosten, tegoed en commissie; `totaal` en `uitbetaling` rekent de database zelf uit.
- `druktefactoren`: per gebied (postcode van 4 cijfers), dienst en tijdvak. Een serverproces zet ze uit openstaande aanvragen en het aantal uitlaters dat online is met een werkgebied daar; nooit uit hun posities.
- `abonnementen` (Woober Plus, opzeggen loopt tot het einde van de maand), `tegoed_mutaties` (saldo is de som), `promocodes` (niet op te vragen, alleen te verzilveren) en `uitnodigingen` (beloning na de eerste afgeronde wandeling van de nieuwe gebruiker).
- `grootboek`: elke afgeronde boeking, annulering met kosten en fooi als regels voor eigenaar, uitlater en Woober (servicekosten, boekingskosten, commissie, drukte, tegoed) die samen op nul uitkomen. Alleen voor Woober; blijft bewaard als een account wordt verwijderd, zonder persoon.

### Betalen met Stripe Connect

- De eigenaar betaalt het totaal aan Woober; na afronden gaat `uitbetaling` naar het Connect-account van de uitlater. Gebruik losse betalingen en overboekingen (separate charges and transfers), geen destination charges: bij tegoed legt Woober bij, en dan is de platformvergoeding negatief.
- Kaart en Apple Pay kunnen een bedrag reserveren en pas na de wandeling afschrijven. iDEAL kan dat niet; daar betaalt de eigenaar bij het boeken en volgt bij tijdig annuleren een terugbetaling. De demo laat dat verschil al zien.
- Woober Plus via Stripe Billing; de webhook maakt de regel in `abonnementen`.
- Het grootboek is de basis voor de afstemming met Stripe en voor de boekhouding.

### Een fase wisselen

1. Kies een bestaand model of maak een nieuw model aan in `verdienmodellen`.
2. Kondig het aan bij uitlaters (in de app en per e-mail) en plan het in, bij een hogere commissie minstens 15 dagen vooruit.
3. Eigenaren zien de nieuwe prijs gewoon vooraf bij het boeken; wie een vaste wandeling heeft, krijgt vooraf een bericht.
4. Bestaande boekingen houden hun prijs.

## Juridische keuzes in de code

De Wet platformwerk (implementatie van Richtlijn (EU) 2024/2831, beoogd per 1 januari 2027) gaat uit van een arbeidsovereenkomst als twee van vijf criteria gelden. Zo houdt de demo daar rekening mee:

| Criterium | Hoe Woober het vermijdt | Waar in de code |
| --- | --- | --- |
| Platform bepaalt de vergoeding | Uitlater kiest het tarief; Woober rekent alleen servicekosten en commissie (tijdens de lancering niets) | `UitlaterFormulier.tsx`, `prijs.ts`, `bereken_prijs()` |
| Platform wijst werk toe | Eigenaar kiest de uitlater; sorteren alleen op de keuze van de eigenaar | `boeken.tsx`, `zoeken.ts` |
| Toezicht op het werk | Route alleen zichtbaar voor de eigenaar tijdens de wandeling; niet gebruikt voor beoordeling | `kaartLagen.ts`, `veiligheid.tsx` |
| Beperken van weigeren, ook via sancties | Weigeren en afzeggen zonder gevolgen; er wordt geen acceptatiegraad bijgehouden | `weiger()` in `AppContext.tsx`, `wijzig_status()` |
| Richtlijnen opleggen | Alleen veiligheid en wettelijke regels (ophaalcode, aanlijnen, opruimplicht, maximum aantal honden) | `veiligheid.tsx` |

Bij het verdienmodel:

- **Drukte-toeslag**: Woober bepaalt de hoogte van die toeslag, terwijl het tarief van de uitlater de basis blijft. Daarom staat drukte alleen aan in het Uber-model, gaat het grootste deel naar de uitlater en is het per model uit te zetten. Laat dit toetsen voordat het aangaat.
- **P2B-verordening (EU) 2019/1150**: uitlaters zijn zakelijke gebruikers. Een wijziging in de voorwaarden, zoals een hogere commissie, minstens 15 dagen vooraf aankondigen. Ook duidelijk maken waarop de lijst is gesorteerd (alleen op de keuze van de eigenaar) en wat Woober inhoudt (`verdiensten.tsx`).
- **Consumentenrecht**: de eigenaar ziet de totaalprijs met alle kosten vóór het boeken, inclusief drukte en boekingskosten (`PrijsRegels.tsx`).

Verder: meldingen en schorsingen beoordeelt altijd een mens, met uitleg en de mogelijkheid om te reageren. Reviews alleen na een betaalde wandeling. Adres pas zichtbaar na accepteren. Locatie alleen tijdens de wandeling, na 30 dagen weg.

Twee punten blijven voor een arbeidsrechtspecialist: of de "Nu"-knop met snelle reactie als sturing kan worden gezien, en of oppas aan huis (en mogelijk uitlaten) onder de Regeling dienstverlening aan huis valt, waarbij de eigenaar als particuliere opdrachtgever lichtere werkgeversplichten heeft.

### Extra bij oppas aan huis

- **Iemand in je huis**: daarom altijd eerst een kennismaking, de code bij de deur, en huisregels in het bericht.
- **Camera's**: de eigenaar meldt vooraf of er camera's hangen. Iemand filmen zonder dat die het weet mag niet; de oppas ziet het vóór de afspraak.
- **Verzekering**: de aansprakelijkheidsverzekering van de oppas moet ook schade in het huis dekken, niet alleen schade door de hond. Navragen bij verzekeraars; mogelijk een collectieve polis via Woober.
- **Locatie**: alleen tijdens het plasrondje om het blok; binnen is de positie gewoon het adres.

## Van demo naar MVP

De demo is zo opgezet dat elk nagespeeld onderdeel één plek heeft die later wordt vervangen.

| Nu in de demo | Straks in de MVP |
| --- | --- |
| Staat in het geheugen (`AppContext.tsx`) | Supabase in eu-central-1 met het schema in `supabase/migrations/`; Auth met e-mail, Apple en Google |
| Andere kant nagespeeld (`simulatie.ts`) | Echte gebruikers; statuswijzigingen via de databasefuncties (`wijzig_status`, `start_wandeling`) |
| Eigen SVG-kaart (`Kaart.tsx`) | `react-native-maps` of `expo-maps`; de props (markers, routes, focus) blijven gelijk, `Punt` wordt breedte- en lengtegraad |
| Positie berekend uit de tijd | `expo-location` met achtergrondtaak, alleen tijdens `bezig`; posities via Supabase Realtime naar de eigenaar |
| Betaling getoond | Stripe Connect: account per uitlater, losse betalingen en overboekingen, webhooks via een Supabase Edge Function (zie [Betalen met Stripe Connect](#betalen-met-stripe-connect)) |
| Verdienmodel in het geheugen, te wisselen in de demo | Tabel `verdienmodellen` met planning; alleen het team plant een fase in |
| Drukte nagebootst in `verdienmodel.ts` | Serverproces (Edge Function of `pg_cron`) vult `druktefactoren` |
| Verificatie afvinken | Stripe Identity voor ID, polis uploaden naar een privé-bucket, controle door een medewerker |
| Meldingen bovenin (`merk.tsx`) | Pushmeldingen via `expo-notifications`, aangestuurd door wijzigingen in de database |
| Verlengen gaat direct (`verleng_oppas()`) | De oppas bevestigt eerst in de app; bij kaart en Apple Pay wordt de reservering opgehoogd, bij iDEAL volgt een tweede betaling |
| Foto's als kleurvlakken | Foto's uploaden naar Supabase Storage, alleen zichtbaar voor de deelnemers |
| Plekken als nepdata (`src/data/plekken.ts`) | Tabel `plekken`, gevuld door het team (eerst handmatig in de pilotstad, later uit open data van gemeenten); reviews in `plek_reviews` |
| Melden en blokkeren lokaal | Moderatiescherm voor het team (eerst Supabase Studio, later een eigen beheerpagina) |

Het schema in `supabase/migrations/` is getest in een lokale Postgres (`npm run test:db`, 103 controles). Belangrijkste regels:

- Prijzen berekent de database uit het tarief van de uitlater (`tarief_voor()`) en het verdienmodel dat geldt (`bereken_prijs()`); de app stuurt nooit een bedrag mee. App en database rekenen tot op de cent hetzelfde.
- Een hogere commissie gaat pas 15 dagen na aankondiging in; een ingepland model ligt vast.
- Tegoed, actiecodes, Plus en grootboek veranderen alleen via databasefuncties of door Woober; het grootboek komt per boeking op nul uit.
- Een dienst boeken kan alleen bij iemand die die dienst aanbiedt; oppas alleen in hele uren.
- Verlengen kan alleen de eigenaar, en alleen bij oppas.
- Adres, ophaalcode en Stripe-gegevens staan in aparte tabellen, omdat RLS rijen afschermt en geen kolommen.
- Verificatievelden kan alleen Woober zetten (kolomrechten).
- Een eerste wandeling kan pas na een afgeronde kennismaking; boeken bij een geblokkeerde gebruiker kan niet.
- Plekken voegt alleen Woober toe. Iedere gebruiker schrijft één review per plek, past alleen de eigen review aan en ziet geen reviews van gebruikers die geblokkeerd zijn; een gemelde review beoordeelt een medewerker.
- Locatie toevoegen kan alleen tijdens een lopende wandeling, door de uitlater van die wandeling.

### Volgorde van bouwen

1. Supabase-project aanmaken (los van Woofer), migratie draaien, Auth instellen.
2. Accounts, honden en uitlaatprofielen echt opslaan; demo-modus behouden voor presentaties.
3. Boeken en statusovergangen via de databasefuncties, met Realtime.
4. Echte kaart en locatie tijdens de wandeling (development build nodig, Expo Go volstaat dan niet meer).
5. Stripe Connect en iDEAL; eerst in testmodus. Het grootboek afstemmen met de Stripe-uitbetalingen. Fase lancering actief.
6. Pushmeldingen.
7. Foto's, moderatie, account verwijderen inclusief data.
8. Besloten test met een handvol uitlaters en eigenaren in de pilotstad.

## Bewust nog niet in de demo

- Groepswandelingen met honden van verschillende eigenaren
- Logeeropvang bij de oppas thuis en overnachten (oppas tot in de nacht kan wel, tot 5 uur, te verlengen)
- Direct boeken zonder acceptatie
- Abonnement voor uitlaters
- Het serverproces dat drukte berekent (tabel en regels staan klaar)
- Koppeling met Woofer, zoals hetzelfde hondenprofiel
- Echte foto's, echte locatie, echte betalingen en pushmeldingen

## Open vragen

- [ ] Wanneer van Lancering naar Groei en naar het Uber-model? Voorstel: op een aantal wandelingen per week in de pilotstad, niet op een datum.
- [ ] Percentages in Groei en Uber-model: wat accepteren uitlaters en eigenaren? Bij oppas zijn de bedragen hoger; een maximum op de servicekosten staat klaar.
- [ ] Drukte-toeslag aanzetten, en welk deel naar de uitlater?
- [ ] Woober Plus via de eigen betaling (zoals Uber One) of via in-app aankoop van Apple en Google? Plus geeft korting op diensten buiten de app; laten bevestigen bij de review van de stores.
- [ ] Btw over servicekosten, boekingskosten, commissie en Plus, en hoe dat werkt voor uitlaters onder de kleineondernemersregeling.
- [ ] Misbruik van welkomst- en uitnodigingstegoed met meerdere accounts: controleren op betaalmiddel of telefoonnummer?
- [ ] Oppas: minimaal 2 uur? Nachtoppas (blijven slapen) toevoegen, en zo ja met een vast nachttarief?
- [ ] Verlengen: mag de oppas weigeren, en wat als de eigenaar dan niet op tijd thuis is?
- [ ] "Nu"-verzoeken: blijft de eigenaar één uitlater tegelijk kiezen, of mag een verzoek naar de drie dichtstbijzijnde tegelijk (eerste die accepteert)? Laten toetsen.
- [ ] Verzekering per uitlater of collectief via Woober?
- [ ] Alleen particuliere uitlaters, of ook bedrijven met KvK? De demo laat beide zien.
- [ ] Plekken: mogen gebruikers zelf nieuwe plekken voorstellen (met controle door het team)? En willen we horeca later laten betalen voor een uitgelichte plek, of blijft de kaart neutraal?
- [ ] Mag Woober een VOG vragen? In de demo optioneel.
- [ ] Pilotstad: Nijmegen?
- [ ] **Naam**: Woober lijkt in klank en schrijfwijze op Uber. Laat een merkenonderzoek doen (BOIP en EUIPO) voordat je investeert in het merk; grote merken treden vaak op tegen namen die op hun merk lijken.

Dit plan is geen juridisch advies; laat het juridisch kader toetsen voor de lancering.
