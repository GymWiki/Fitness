# Weekoverzicht-cards op Schema-pagina — design

## Probleem

De huidige "Komende 2 weken"-sectie bovenin de Schema-pagina
(`TwoWeekOverview` in `app/(tabs)/schema.tsx:42-61`) is een platte,
niet-tappable rij-voor-rij lijst. Alles ziet er visueel hetzelfde uit,
"vandaag" springt er niet uit, en er is geen onderscheid tussen deze week
en volgende week. Doel: een scanbare, tappable horizontale kaartenrij die
in één oogopslag laat zien welke dag het is, wat er gepland staat, en de
status (gedaan/gepland/gemist/rust).

## Scope

Uitsluitend de weergave en interactie van het weekoverzicht bovenin de
Schema-pagina. Geen wijziging aan `distributeSessions`, de generator, de
`ensureScheduledWindow`-schrijflogica, of enige trainings-/
cardio-berekening.

## 1. Data

Nieuwe component leest via de bestaande `fetchScheduledSessions(userId,
fromDate, toDate)` (`src/lib/schedule.ts:133-154`) — geen nieuwe
databronnen, geen wijziging aan die functie. `status` komt rechtstreeks uit
de DB-kolom (al inclusief `'missed'`, geschreven door
`ensureScheduledWindow`'s bestaande sweep-logica).

Om ook al-verstreken dagen van de huidige week te kunnen tonen (nodig voor
"gedaan"/"gemist"-status vóór vandaag), wordt het bevraagde bereik
verbreed naar "start van de huidige ISO-week" (maandag, zelfde conventie
als `startOfIsoWeek` in `src/lib/weekStrip.ts`) t/m "einde van volgende
ISO-week" — 14 dagen, week-uitgelijnd, in plaats van het huidige
"vandaag + 13 dagen"-bereik. Dit is puur een andere `fromDate`/`toDate` bij
dezelfde bestaande queryfunctie; `ensureScheduledWindow` (die rijen
aanmaakt en overdue `planned` naar `missed` zet) blijft ongewijzigd — rijen
voor eerdere dagen in de huidige week bestaan al doordat het rollende
venster ze in eerdere sessies al heeft aangemaakt.

`ScheduledSessionRow` (bestaand type, `src/lib/schedule.ts:11-19`) heeft al
`programDayName`/`programDayId`/`programDayOrder` — voldoende voor de
kaart-content, geen uitbreiding nodig.

## 2. Componenten

**`WeekCardRow`** (nieuw, `src/components/WeekCardRow.tsx`) — vervangt
`TwoWeekOverview` in `app/(tabs)/schema.tsx`. Props: `{ userId: string }`,
zelf-fetchend zoals `WeekOverview.tsx`. Rendert twee weken (huidige +
volgende) van `ScheduleDayCard`s in een horizontale, snap-scrollende
`ScrollView`, met "← vorige week / volgende week →"-pijltjes erboven om
tussen de twee te wisselen. Bij het openen scrollt de rij naar vandaag.

**`ScheduleDayCard`** (nieuw, `src/components/ScheduleDayCard.tsx`) — één
kaart per dag. Bovenin dag-afkorting + datum, midden een icoon per type
(halter voor kracht, hardloop-icoon voor cardio, maantje voor rust,
hergebruikt makend van de bestaande `icons.tsx`-stijl), daaronder de
korte naam. Statuskleuren hergebruiken dezelfde mapping als de
dot-indicators in `WeekOverview.tsx`: `colors.accent`/`accentMuted`
(gedaan), `colors.dangerMuted`+`danger` + kruisje (gemist, nooit
dezelfde marker als rust), `colors.border` (gepland). "Vandaag" krijgt
een dikkere rand (`colors.borderStrong`, 2px) bovenop de statuskleur,
ongeacht status. Gebouwd op het bestaande `Card`-component
(`src/components/Card.tsx`) en de bestaande spacing/radii/typography-
tokens — geen nieuwe stijl.

Scroll/snap: `ScrollView` met `snapToInterval`/`snapToAlignment="start"`.
Deze props hebben geen bestaand precedent in de codebase en zijn
historisch wisselend ondersteund op React Native Web. Ze worden gebouwd
en expliciet geverifieerd in de webbuild (via Playwright/webapp-testing);
als snap-scroll niet betrouwbaar werkt op web, valt de rij terug op
gewone momentum-scroll zonder snap (functioneel nog steeds correct,
minder strak uitgelijnd).

## 3. Detailweergave

Per eerder akkoord: een **volledig-scherm modal**, consistent met het
bestaande patroon in de app (`Stack.Screen` met `presentation: 'modal'`,
`ModalHeader` met "Sluiten"-knop — zie `app/_layout.tsx:56-64` en
`src/components/ModalHeader.tsx`), niet een nieuw bottom-sheet-component.

Nieuwe route **`app/schedule-day/[date].tsx`**, geopend vanuit
`ScheduleDayCard`'s `onPress` met de datum als route-param. Haalt de
scheduled-session-rij voor die datum op (uit dezelfde reeds-opgehaalde
data, doorgegeven of opnieuw opgevraagd) en toont een alleen-lezen
preview:

- **Krachtdag**: oefeningen + sets/reps/doel via het bestaande
  `fetchProgramDayWithExercises` (`src/lib/programs.ts:228-262`), met
  per-oefening gewichtsadvies via dezelfde `getStrengthAdvice`-aanroep
  die `app/workout/[dayId].tsx` al gebruikt (hergebruikt, niet
  gedupliceerd).
- **Cardiodag**: type/duur/uitleg via dezelfde
  `computeWeeklyDistribution`/`adviseNextCardioType`/
  `adviseCardioProgression`-aanroepen die het workout-scherm al gebruikt,
  per cardio-oefening op die dag.
- **Rustdag**: korte, positieve bevestigingstekst (nieuwe, simpele
  content — er bestaat nog geen rustdag-copy elders in de app om te
  hergebruiken), geen actieknop.

Primaire actieknop: **"Start training"** (dag is vandaag of in de
toekomst, dus status `planned`) of **"Bekijk resultaat"** (status
`done`) — beide navigeren naar het bestaande `app/workout/[dayId].tsx`.
Dat scherm heeft zelf al per-oefening links naar de geschiedenis
(`app/history/[dayExerciseId]`), dus "Bekijk resultaat" hergebruikt die
route volledig in plaats van een apart resultaatscherm te bouwen.

Omdat dit een eigen route is (geen overlay-state bovenop de Schema-
pagina), blijft de scrollpositie van de kaartenrij vanzelf behouden bij
"Sluiten" — het onderliggende Schema-scherm unmount niet tijdens een
modal-navigatie.

## 4. Tests

- `ScheduleDayCard`/statusmapping: een `ScheduledSessionRow` met elke
  status (`planned`/`done`/`missed`/`rest`) geeft de juiste visuele
  status-variant; "vandaag" is altijd te onderscheiden ongeacht status.
- Week-navigatie: de kaartenrij toont de juiste 7 kaarten voor de huidige
  week en, na doorschuiven, de juiste 7 voor volgende week.
- Detail-route: per sessietype (kracht/cardio/rust) toont de juiste
  content en de juiste primaire-knoptekst/navigatie (`planned` →
  "Start training", `done` → "Bekijk resultaat", rust → geen knop).

## Buiten scope

- Geen wijziging aan `distributeSessions`, de generator, of
  `ensureScheduledWindow`'s schrijflogica.
- Geen nieuw "resultaat"-scherm — "Bekijk resultaat" hergebruikt het
  bestaande workout-scherm.
- Geen wijziging aan `WeekOverview.tsx` (de dot-strip op de Vandaag-
  dashboard blijft ongewijzigd) — alleen de Schema-pagina's bovenste
  sectie wordt vervangen.
