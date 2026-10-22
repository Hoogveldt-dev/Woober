# Woober, prototype 0.1

Klikbare demo van Woober, het zusje van Woofer: hondeneigenaren boeken een uitlater uit de buurt zoals je bij Uber een rit boekt, en volgen de wandeling live. Het plan staat in [PLAN.md](PLAN.md).

Gebouwd met Expo (SDK 58) en Expo Router, in de huisstijl van Woofer. Dezelfde code draait als iOS-app, Android-app en web app. Alle gegevens zijn nepdata en worden niet opgeslagen; na herladen begin je opnieuw.

## Starten

```bash
npm install
npx expo start        # druk op w (web), i (iOS-simulator) of a (Android)
```

Op je telefoon: installeer Expo Go en scan de QR-code uit `npx expo start`.

Op het welkomscherm kies je **Demo eigenaar** of **Demo uitlater**. Je kunt later wisselen via Account.

Controles: `npm run typecheck`, `npx expo lint` en `npm run test:db` (databaseschema en RLS).

## Zo werkt de demo

- **De andere kant speelt de app zelf.** Boek je als eigenaar, dan accepteert de uitlater na een paar seconden, fietst naar je toe en stuurt onderweg foto's. Ben je uitlater en ga je online, dan komen er vanzelf verzoeken binnen.
- **De tijd loopt 30 keer sneller**, dus een wandeling van 30 minuten duurt een minuut. Met **Sneller (demo)** spring je 5 minuten vooruit. Instelbaar in `src/lib/simulatie.ts`.
- **De kaart is een verzonnen wijk** aan de Waal, getekend met SVG. Zo werkt alles zonder kaartsleutels, ook op het web. Routes lopen over de straten; wandelingen gaan rond de vijver in het Stadspark.
- **De ophaalcode** zie je als eigenaar in de app; als uitlater staat de code in de demo onder het invulveld.

## Wat zit erin

| Eigenaar | Uitlater |
| --- | --- |
| Kaart met uitlaters in de buurt en hun reistijd | Online gaan met één knop |
| Uitlater kiezen op afstand, beoordeling of prijs | Verzoek met hond, afstand, moment en wat je verdient |
| Nu, later of elke week boeken, 30 tot 60 minuten | Accepteren of weigeren, zonder gevolgen |
| Eerst kennismaken bij een nieuwe uitlater | Navigeren naar de eigenaar, ophaalcode controleren |
| Live volgen met ophaalcode, route en foto's | Foto, plas, poep, water en notitie tijdens de wandeling |
| Wandelrapport met fooi en beoordeling | Verdiensten per dag en per week |
| Chat, melden, blokkeren en noodknop | Eigen tarief, werkgebied, rooster en verificatie |

Een overzicht van schermen en bestanden staat in [PLAN.md](PLAN.md#wat-de-demo-laat-zien).

## Nog niet in deze versie

- Echte accounts en database (schema klaar in `supabase/migrations/`, Supabase in eu-central-1)
- Echte kaart en locatie (`react-native-maps` en `expo-location`)
- Betalen via Stripe Connect en iDEAL
- Pushmeldingen, foto's uploaden, moderatiescherm
