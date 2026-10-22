# Woober

Zusje van Woofer: hondeneigenaren boeken in Uber-stijl een uitlater uit de buurt en volgen de wandeling live. Lancering in Nederland via App Store, Google Play en web. Het plan staat in @PLAN.md.

Zie @AGENTS.md voor de Expo-regels (Expo SDK 58, Expo Router, routes in `src/app/`).

## Werkwijze
- Alle teksten in de app in het Nederlands. Gebruik nooit gedachtestreepjes (het lange streepje) in teksten of documentatie.
- Draai na elke reeks wijzigingen `npm run typecheck` en `npx expo lint` en los fouten op. Na een wijziging in `supabase/` ook `npm run test:db`.
- Installeer pakketten met `npx expo install <pakket>`. Krijgt die geen verbinding met de Expo-servers, gebruik dan `EXPO_OFFLINE=1 npx expo install <pakket>`.
- Commit na elke werkende stap met een duidelijke Nederlandse omschrijving.
- Zelfde huisstijl als Woofer: `src/theme.ts` en `src/components/ui.tsx` zijn overgenomen uit Woofer. Pas de gedeelde basis alleen samen met Woofer aan; Woober-aanvullingen staan apart.

## Belangrijke plekken
- Prijzen, servicekosten, commissie en annuleren: `src/lib/prijs.ts` (dezelfde regels in `vraag_wandeling_aan()` in de migratie).
- Gedeelde staat (nu nepdata in het geheugen) en de simulatie van de andere kant: `src/state/AppContext.tsx` en `src/lib/simulatie.ts`.
- Kaart: `src/components/Kaart.tsx` met de demowijk in `src/data/stad.ts`. Later vervangen door een echte kaart met dezelfde props.
- Databaseschema met RLS (concept): `supabase/migrations/`, getest met `supabase/tests/rls.test.mjs`.

## Afspraken
- Marktplaats, geen centrale (Wet platformwerk): de uitlater kiest zelf tarief, werkgebied en tijden; de eigenaar kiest de uitlater; weigeren en afzeggen hebben geen gevolgen en worden niet geteld. Voeg geen automatische toewijzing, vaste prijzen, acceptatiegraad of automatische schorsing toe zonder dat Kjell erom vraagt.
- Meldingen en schorsingen beoordeelt altijd een mens.
- Toon andere gebruikers nooit e-mail of adres. Het adres van een eigenaar ziet een uitlater pas na een geaccepteerde boeking.
- Locatie van de uitlater alleen tijdens een wandeling, alleen voor de eigenaar van die wandeling, en niet gebruiken om uitlaters te beoordelen.
- Reviews alleen na een betaalde wandeling.
- Supabase: eigen project in regio Frankfurt (`eu-central-1`), los van Woofer. De `service_role`-sleutel komt nooit in de app.
