# Adaptieve Fitness App — Plan van aanpak Fase 1

## Doel van Fase 1

Een werkend fundament neerzetten waarin de kernbelofte van de app — adaptief en
uitlegbaar advies — al aantoonbaar en getest is, vóórdat er tijd in UI-polish
gaat. Daarom is de bouwvolgorde bewust: eerst de progressie-engines (het
"kroonjuweel"), dan pas de schermen eromheen.

## Stappen en status

1. **Projectsetup: Expo + TypeScript + Supabase, auth (e-mail + magic link)** — ✅ gebouwd
2. **Progressie-engines als pure functies met uitgebreide unit tests** — ✅ gebouwd
3. **Intake-flow + generator met 2 templates (full body 3×, upper/lower 4×)** — ✅ gebouwd
4. **Workout-invoerscherm (sportschool-geoptimaliseerd, offline queue)** — ✅ gebouwd in deze sessie
5. Advies-weergave per oefening met uitleg-regel — nog niet gebouwd
6. Simpele historie per oefening (lijst + lijngrafiek) — nog niet gebouwd

Dit document beschrijft de aanpak voor alle 6 stappen zodat de architectuur
consistent blijft. Stap 1 en 2 kwamen uit een eerdere sessie, stap 3 uit de
sessie daarna (de vorige poging tot stap 3 liep tegen een fout aan voordat er
iets gecommit was, en is toen opnieuw opgebouwd). Deze sessie voegde stap 4
toe.

## Architectuurkeuzes gemaakt in deze sessie

- **Monorepo met npm workspaces**: `packages/progression-engine` is een losstaand,
  platform-onafhankelijk TypeScript-package (geen React Native-, Expo- of
  Supabase-imports). De Expo-app hangt eraan via `@fitness/progression-engine`.
  Dit dwingt af dat de adviesfunctie puur en los getest blijft, en maakt hem
  herbruikbaar voor bijvoorbeeld een toekomstige Supabase Edge Function die
  wekelijks alle programma's evalueert.
- **Expo Router (v6) met `Stack.Protected`** voor de auth-gate: `(auth)` en
  `(tabs)` zijn route-groepen, en de root layout schakelt puur op basis van
  `session` uit `AuthProvider`. Geen handmatige navigatie-redirects nodig.
- **Supabase Auth via magic link (`signInWithOtp`)**: geen wachtwoorden.
  Deep-linking terug naar de app via `expo-linking` (`adaptivefitness://auth/callback`),
  met een globale listener die zowel het PKCE `code`-flow (web) als het
  impliciete token-fragment (native) afhandelt.
- **Donker thema als default** (`userInterfaceStyle: dark`, `src/theme/colors.ts`),
  conform de eis dat dit een sportschool-app is.
- **Supabase migrations**: `supabase/migrations/0001_init.sql` bevat het volledige
  datamodel uit de opdracht (`profiles`, `programs`, `program_days`,
  `day_exercises`, `workouts`, `set_logs`, `cardio_logs`,
  `program_adjustments`) met RLS op iedere tabel. `program_adjustments` heeft
  bewust alléén een select-policy voor gebruikers: die tabel wordt gevuld door
  de adaptatieplanner (server-side/edge function), niet door de gebruiker zelf.
- **Nieuw package `@fitness/program-generator`** (stap 3): zelfde opzet als
  `progression-engine` — puur, geen I/O, los getest. `generateProgram(intake)`
  neemt goal/experience/equipment/daysPerWeek en levert een volledig
  `GeneratedProgram` (dagen + oefeningen + sets/reps/RIR) terug; de app-laag
  serialiseert dat 1-op-1 naar `programs`/`program_days`/`day_exercises`
  (`src/lib/programs.ts`). Templatekeuze is puur op `daysPerWeek` gebaseerd:
  ≤3 dagen → full body, ≥4 → upper/lower. Elke template heeft 2 (full body)
  of 4 (upper/lower) dag-archetypes die met een modulo-cyclus over
  `daysPerWeek` dagen worden uitgerold, dus een 5-daagse upper/lower-week is
  Upper A / Lower A / Upper B / Lower B / Upper A.
- **Derde route-groep `(onboarding)`**: de root layout gate is uitgebreid van
  `session ? tabs : auth` naar een 3-weg gate op basis van zowel `session`
  (via `AuthProvider`) als het bestaan van een `profiles`-rij (via de nieuwe
  `ProfileProvider`/`useProfile`, `src/lib/profile.tsx`). Ingelogd zonder
  profiel → `(onboarding)` (de intake-wizard); ingelogd mét profiel →
  `(tabs)`. Na het opslaan van de intake ververst de wizard de profile-context,
  waarna de gate vanzelf naar `(tabs)` omslaat — geen handmatige navigatie.
- **"Vandaag" toont het eerstvolgende dagschema**: `fetchActiveProgram` telt
  hoeveel `workouts` al aan de dagen van het actieve programma hangen en
  bepaalt daarmee `nextDayOrder = workoutCount % aantalDagen`. Met stap 4
  (workout-invoer) klopt dat nu ook echt, want er ontstaan `workouts`-rijen.
- **Offline-first workout-invoer** (stap 4, `src/lib/offlineQueue.ts`): elke
  actie (workout aanmaken, set loggen, cardio loggen) krijgt een
  client-gegenereerd UUID (`expo-crypto`) en wordt eerst in een FIFO-wachtrij
  in AsyncStorage gezet, met een `upsert` (niet `insert`) als eventuele
  Supabase-call. Dat maakt retries idempotent: een halve sync die opnieuw
  geprobeerd wordt, overschrijft dezelfde rij in plaats van een duplicaat te
  maken. De wachtrij verwerkt strikt in volgorde en stopt bij de eerste
  mislukking — dat garandeert dat een `log_set`-actie nooit vóór de
  `create_workout` waar hij van afhangt wordt geprobeerd (foreign key naar
  `workouts.id`), zonder dat er expliciete dependency-tracking nodig is.
  Sync-triggers: direct na elke `enqueue`, bij een `NetInfo`-reconnect-event,
  en elke 20s zolang de wachtrij niet leeg is (voor het geval een
  reconnect-event niet feilloos vuurt op flakey sportschool-wifi).
- **`app/workout/[dayId].tsx`** als modal-scherm binnen dezelfde
  `Stack.Protected`-groep als `(tabs)`: bereikbaar via "Start workout" op
  "Vandaag", niet als eigen tab. Per oefening: een gewicht-/reps-stepper met
  grote knoppen (geen toetsenbord nodig) en een RIR-kiezer 0-4, met "Set
  loggen" die direct naar de wachtrij schrijft en de invoer voor de volgende
  set alvast vult met het laatst gelogde gewicht. Cardio-oefeningen
  (`kind !== 'strength'`) tonen nu een placeholder — de generator produceert
  in stap 3/4 nog geen cardio-oefeningen, dus dit pad is nog niet in de
  praktijk bereikbaar; zie open punt hieronder.

## Aannames die zijn gemaakt (graag bevestigen of bijsturen)

De opdracht liet een aantal parameters open voor eigen interpretatie. Gekozen
waarden staan als benoemde constanten in `packages/progression-engine/src/*.ts`
zodat ze makkelijk terug te vinden en aan te passen zijn:

- **Kracht — "onder de onderkant van de range"**: geïnterpreteerd als *minstens
  één set* onder `repRangeMin`. Twee sessies op rij met zo'n set → -10% gewicht.
- **Kracht — gewicht afronden**: naar het dichtstbijzijnde veelvoud van 1.25 kg
  (standaard schijfgewicht), instelbaar per oefening via `weightIncrementKg`.
- **Cardio — zone 2 stapgrootte**: 7.5% (het midden van de gevraagde 5–10%-marge)
  per week, mits RPE en hartslag normaal blijven.
- **Cardio — deload**: elke 4e week (`weekInCycle >= cycleLengthWeeks`, default
  cyclus van 4 = 3 weken opbouw + 1 week terug) gaat de zone 2-duur 20% omlaag.
  De opdracht noemt geen exact deload-percentage; 20% is gekozen als
  conservatieve default.
- **Cardio — 80/20 verdeling**: de functie neemt aan dat de aanroeper al een
  venster van 7–14 dagen aan logs doorgeeft; de functie zelf filtert niet op
  datum (blijft zo een pure functie zonder kloktijd-afhankelijkheid).
- **Interval-progressie**: rondes gaan eerst omhoog tot een ingestelde
  `maxRoundsBeforeTempoIncrease`, daarna pas het tempo-niveau. Er is geen reset
  van rondes bij tempo-verhoging verondersteld (opdracht specificeert dit niet).

Toegevoegd in stap 3 (`packages/program-generator/src/repSchemes.ts`,
`templates.ts`, `exercises.ts`):
- **Sets/reps/RIR per doel**: vaste tabel per `goal` × compound/isolation
  (bv. strength = 5×3-6 RIR2 op compounds, hypertrophy = 4×8-12 RIR1).
  Ervaring schuift de RIR: beginner +1 (meer marge), advanced -1 (dichter bij
  falen), intermediate ongewijzigd.
- **Gewichtstoename-stap per oefening**: 2.5 kg voor gym-compound-oefeningen
  (barbell laadt in schijfparen), 1.25 kg voor al het overige — inclusief
  bodyweight-oefeningen, ook al is "gewicht" daar minder betekenisvol; zie
  open punt hieronder.
- **Dag-archetypes A/B i.p.v. willekeurige variatie**: elke template-dag
  heeft een vaste, deterministische oefeningkeuze per equipment. Geen
  randomisatie, zodat de generator voorspelbaar en makkelijk te testen blijft.

Toegevoegd in stap 4 (`src/lib/offlineQueue.ts`, `app/workout/[dayId].tsx`):
- **Wachtrij-conflictstrategie**: altijd `upsert` op een client-gegenereerd
  id, nooit `insert`. Dat is bewust gekozen boven "check eerst of het al
  bestaat" — een extra read voor elke retry zou zelf ook kunnen falen zonder
  netwerk, en is overbodig zodra de write toch idempotent is.
  Verlies-scenario dat *niet* is opgevangen: als de app wordt geïnstalleerd
  op een nieuw toestel of de lokale opslag wordt gewist terwijl er nog een
  niet-gesynchte wachtrij stond, gaan die sets verloren. Voor Fase 1
  geaccepteerd; een serverside "laatst bekende sync"-check zou dit later
  kunnen dichten.
- **Setnummering is client-side sessiestatus**: `setOrder` telt simpelweg
  hoeveel sets er deze workout-sessie al voor die oefening zijn gelogd
  (begint bij 1, in lokale React state). Geen server-roundtrip nodig om het
  volgende setnummer te bepalen, wat offline-first noodzakelijk is.

Nog open voor stap 5 e.v. (niet blokkerend voor nu, maar wel relevant bij het
ontwerpen van de advies-weergave en verdere adaptatie):
- **Bodyweight-progressie**: de kracht-progressie-engine werkt op gewicht;
  voor pure bodyweight-oefeningen (waar gewicht vaak 0 kg is) geeft dat geen
  zinvolle progressie. Nog te ontwerpen: repetitie-gebaseerde progressie of
  toegevoegd-gewicht-tracking voor die categorie.
- **Cardio-invoer in het workout-scherm**: de UI heeft al een tak voor
  `kind !== 'strength'`, maar toont nu alleen een placeholder-tekst in plaats
  van een duur-/RPE-/hartslag-invoer. Niet blokkerend zolang de generator nog
  geen cardio-oefeningen in programma's zet (zie volgende punt).
- Hoe therapietrouw ("sessies overgeslagen") precies wordt gemeten (aantal
  gemiste sessies per periode?) voordat het schema wordt verkleind.
- Hoe de interference-check (cardio niet vlak vóór zware krachtdag) precies
  wordt ingebouwd in de weekplanner-output — de generator bouwt nog geen
  cardio-dagen/blokken in programma's; dat volgt zodra de interference-regel
  is uitgewerkt.

## Niet gebouwd (bewust, voor latere fases)

Wearables, voeding, social features, AI-chat, eigen-schema-builder,
meertaligheid — zoals in de opdracht vermeld, hier niet aangeraakt.

## Projectstructuur

```
app/                        Expo Router routes
  _layout.tsx                Root layout: Auth-/ProfileProvider + 3-weg Stack.Protected gate
  (auth)/
    index.tsx                 Login (e-mail + magic link)
    callback.tsx               Landing spot voor de magic-link redirect
  (onboarding)/
    index.tsx                  Intake-wizard: doel, ervaring, dagen/week, materiaal, review
  (tabs)/
    _layout.tsx                Tab navigator
    index.tsx                   "Vandaag": eerstvolgend dagschema + "Start workout"
  workout/
    [dayId].tsx                 Workout-invoer: stepper-UI per oefening, offline-first
src/
  lib/
    supabase.ts               Supabase client (AsyncStorage op native)
    auth.tsx                   AuthProvider + useAuth hook
    profile.tsx                ProfileProvider + useProfile hook (profiles-rij van huidige user)
    programs.ts                saveGeneratedProgram / fetchActiveProgram / fetchProgramDayWithExercises
    offlineQueue.ts             FIFO sync-wachtrij (AsyncStorage) met idempotente upserts
    id.ts                       generateId() — client-side UUID's voor offline-veilige writes
  theme/
    colors.ts                  Donker kleurenpalet
packages/
  progression-engine/         Pure, framework-onafhankelijke progressielogica
    src/
      types.ts
      strength.ts               Double progression met RIR
      cardio.ts                 Polarized 80/20 + zone2/interval progressie
    tests/
      strength.test.ts
      cardio.test.ts
  program-generator/          Pure, framework-onafhankelijke programma-generator
    src/
      types.ts
      exercises.ts               Movement slots × equipment-varianten
      repSchemes.ts               Sets/reps/RIR per doel + ervaring
      templates.ts                Dag-archetypes + templatekeuze (full body / upper-lower)
      generate.ts                 generateProgram(intake) -> GeneratedProgram
    tests/
      generate.test.ts
supabase/
  migrations/
    0001_init.sql              Volledig Fase 1-datamodel + RLS
```

## Hoe te draaien

```bash
npm install
cp .env.example .env   # vul EXPO_PUBLIC_SUPABASE_URL en _ANON_KEY in
npm run test           # unit tests progressie-engine + program-generator (38 tests)
npm run typecheck      # TypeScript over het hele project
npm run web            # of: npm start, dan a/i/w voor android/ios/web
```

Zonder een geldig Supabase-project in `.env` start de auth-flow niet (de
Supabase-client gooit bewust een duidelijke foutmelding bij het opstarten in
plaats van stil te falen).
