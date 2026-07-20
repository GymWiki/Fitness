# Adaptieve Fitness App — Plan van aanpak Fase 1

## Doel van Fase 1

Een werkend fundament neerzetten waarin de kernbelofte van de app — adaptief en
uitlegbaar advies — al aantoonbaar en getest is, vóórdat er tijd in UI-polish
gaat. Daarom is de bouwvolgorde bewust: eerst de progressie-engines (het
"kroonjuweel"), dan pas de schermen eromheen.

## Stappen en status

1. **Projectsetup: Expo + TypeScript + Supabase, auth (e-mail + wachtwoord)** — ✅ gebouwd
2. **Progressie-engines als pure functies met uitgebreide unit tests** — ✅ gebouwd
3. **Intake-flow + generator met 2 templates (full body 3×, upper/lower 4×)** — ✅ gebouwd
4. **Workout-invoerscherm (sportschool-geoptimaliseerd, offline queue)** — ✅ gebouwd
5. **Advies-weergave per oefening met uitleg-regel** — ✅ gebouwd in deze sessie
6. **Simpele historie per oefening (lijst + lijngrafiek)** — ✅ gebouwd in deze sessie

Fase 1 is hiermee compleet. Stap 1 en 2 kwamen uit een eerdere sessie, stap 3
uit de sessie daarna (de vorige poging tot stap 3 liep tegen een fout aan
voordat er iets gecommit was, en is toen opnieuw opgebouwd), stap 4 uit de
sessie erna, stap 5 en 6 uit de sessie daarna.

**Extra (na Fase 1): cardio-engine (80/20 polarized).** Los van de 6
genummerde stappen is de kracht-only aanpak van stap 4-6 uitgebreid naar
cardio: een eigen polarized-trainingsalgoritme (zie hieronder), cardio-invoer
in het workout-scherm, en cardio in het historiescherm. Zie de aparte
aannames-sectie verderop voor de details en het belangrijkste open punt (nog
niet bereikbaar via de normale intake-flow).

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
- **Supabase Auth via e-mail + wachtwoord** (`signInWithPassword` /
  `signUp`): oorspronkelijk gebouwd met magic links, later in Fase 1 omgezet
  naar wachtwoord-auth op verzoek. `app/(auth)/index.tsx` is nu één scherm met
  een login/registreren-toggle in plaats van een aparte "check je e-mail"-
  stap; er is geen deep-linking of redirect-callback meer nodig, dus
  `expo-linking` en `app/(auth)/callback.tsx` zijn verwijderd. **Vereist dat
  "Confirm email" uitstaat** in het Supabase-project (Authentication →
  Providers → Email) — anders geeft `signUp` geen sessie terug en blijft de
  gebruiker na registreren op het inlogscherm hangen zonder duidelijke
  foutmelding waarom.
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
- **`src/lib/history.ts`** (stap 5+6): één gedeelde `fetchExerciseHistory`
  haalt alle `set_logs` voor een `day_exercise_id` op en groepeert ze per
  `workout` (twee losse queries — `set_logs` en `workouts` — in plaats van een
  embedded join, omdat supabase-js zonder gegenereerde `Database`-types de
  cardinaliteit van een to-one embed niet correct kan typeren; dat patroon
  matcht ook al hoe `fetchActiveProgram` de workout-telling apart ophaalt).
  Die ene functie voedt zowel het advies (stap 5) als de historieschermen
  (stap 6), zodat de definitie van "een sessie" nergens dubbel staat.
- **Advies in het workout-scherm** (stap 5): zodra een oefening historie
  heeft, roept `app/workout/[dayId].tsx` `getStrengthAdvice` uit
  `@fitness/progression-engine` aan met het zwaarste gewicht uit de laatste
  sessie als uitgangspunt, en toont de kant-en-klare Nederlandse
  uitleg-string uit de engine plus een kleurgecodeerd Omhoog/Gelijk/Omlaag-
  label. Zonder historie toont de kaart een neutrale melding in plaats van de
  wat vreemde "start op 0 kg"-tekst die `getStrengthAdvice` zou geven als je
  het met een verzonnen gewicht aanroept — er is geen voorgeschreven
  startgewicht in het datamodel, dus de eerste keer kiest de gebruiker zelf.
  De gewicht-stepper wordt voorgevuld met het advies zolang er deze sessie
  nog geen sets voor die oefening gelogd zijn.
- **`app/history/[dayExerciseId].tsx`** (stap 6): een lijst van sessies
  (nieuwste eerst, elk met alle gelogde sets) plus een kleine zelfgebouwde
  lijngrafiek (`react-native-svg`, geen chart-library) van het zwaarste
  gewicht per sessie. Bereikbaar via een "Historie"-link naast de
  oefeningnaam in het workout-scherm; de oefeningnaam wordt als route-param
  meegegeven zodat de historieschermen geen extra query nodig hebben om de
  titel te tonen.
- **Cardio-engine herschreven** (`packages/progression-engine/src/cardio.ts`):
  drie functies i.p.v. de oude, samengevoegde `getCardioDistributionAdvice`/
  `getZone2Advice`/`getIntervalAdvice` (nergens buiten deze package gebruikt,
  dus veilig vervangen i.p.v. ernaast te houden):
  - `computeWeeklyDistribution(logs, windowDays, referenceDate)` — minuten
    laag/hoog + %intensief over een venster. `referenceDate` is een derde,
    optioneel argument (default `new Date()`): puur/testbaar blijven zonder
    de klok te lezen betekende dat het venster niet zomaar "nu - N dagen"
    kon zijn zonder een expliciete tijdreferentie; tests geven een vaste
    datum mee, de UI laat hem gewoon weg.
  - `adviseNextCardioType(distribution, goal)` — zone2 of interval, met een
    doel-afhankelijke streefverhouding (zie aannames).
  - `adviseCardioProgression(lastSessions, type, goal)` — dispatcht naar
    zone2- of intervalprogressie en leidt "huidige duur"/"huidige rondes"
    volledig af uit de sessiegeschiedenis (geen losse config-parameter meer
    nodig zoals de oude `Zone2ProgressionConfig`/`IntervalProgressionConfig`).
- **Cardio-invoer in het workout-scherm**: `app/workout/[dayId].tsx` is
  gesplitst in twee losstaande subcomponenten, `StrengthLogger` en
  `CardioLogger`, elk met eigen state/effects en gemount met `key={exercise.id}`
  zodat een wissel van oefening een schone remount geeft in plaats van een
  handmatige "reset bij exercise-wissel"-effect (was voorheen nodig, nu niet
  meer). `CardioLogger` haalt de cardio-historie op, berekent
  `computeWeeklyDistribution` + `adviseNextCardioType` (welk type vandaag)
  en vervolgens `adviseCardioProgression` voor dát type, en toont beide
  uitleg-strings plus het concrete voorstel (duur, of rondes + tempo-
  aanwijzing) in één advieskaart — precies zoals de opdracht het voorbeeld
  gaf ("Vandaag zone 2, 35 min — ..."). De invoervelden (duur/RPE/hartslag/
  afstand voor zone2; rondes/duur/RPE/hartslag voor interval) volgen het
  aanbevolen type; er is geen handmatige type-keuze.
- **`src/lib/history.ts` uitgebreid met `fetchCardioHistory`**: zelfde
  twee-staps-query-patroon als `fetchExerciseHistory` (cardio_logs heeft geen
  eigen datumkolom, leent `performed_at` van de bijbehorende workout). Het
  resultaat is getypeerd als `CardioLog[]` zodat het rechtstreeks de
  progressie-engine-functies in kan, zonder tussenlaag.
- **Historiescherm generiek gemaakt**: de vroegere `WeightChart` is
  omgedoopt tot een generieke `LineChart` (punten + eenheid-string) en wordt
  nu hergebruikt voor kracht (gewicht), cardio-duur, én — als er hartslagdata
  is — hartslag per sessie over tijd. Het scherm weet via een `kind`
  route-param (meegegeven vanuit het workout-scherm) welke databron en welke
  weergave het moet gebruiken.

## Aannames die zijn gemaakt (graag bevestigen of bijsturen)

De opdracht liet een aantal parameters open voor eigen interpretatie. Gekozen
waarden staan als benoemde constanten in `packages/progression-engine/src/*.ts`
zodat ze makkelijk terug te vinden en aan te passen zijn:

- **Kracht — "onder de onderkant van de range"**: geïnterpreteerd als *minstens
  één set* onder `repRangeMin`. Twee sessies op rij met zo'n set → -10% gewicht.
- **Kracht — gewicht afronden**: naar het dichtstbijzijnde veelvoud van 1.25 kg
  (standaard schijfgewicht), instelbaar per oefening via `weightIncrementKg`.
- **Cardio — deload**: elke 4e zone2-sessie (3 opbouwen + 1 terug) gaat de
  duur 20% omlaag, ongeacht RPE/hartslag. De opdracht noemt geen exact
  deload-percentage; 20% is gekozen als conservatieve default. (De volledige
  cardio-progressie is later in Fase 1 herzien — zie de aparte
  cardio-engine-sectie hieronder voor de huidige, uitgebreidere aannames.)

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

Toegevoegd in stap 5+6 (`src/lib/history.ts`, `app/workout/[dayId].tsx`,
`app/history/[dayExerciseId].tsx`):
- **"Zwaarste set van de sessie" als grafiekpunt en als advies-basis**: zowel
  de lijngrafiek als `currentWeightKg` voor `getStrengthAdvice` gebruiken
  `Math.max(...sets.map(weightKg))` van een sessie. Bij double progression
  met een vast werkgewicht per sessie maakt dit weinig uit, maar als iemand
  bewust aflopende sets (top set + back-off sets) gaat loggen, telt straks
  alleen de topset mee — dat is een bewuste keuze, geen artefact.
- **Geen server-side aggregatie**: de historie- en advies-queries halen ruwe
  `set_logs`/`workouts`-rijen op en groeperen client-side. Voor Fase 1
  (persoonlijk gebruik, beperkt aantal sessies) is dat prima; bij veel
  historie zou een database-view of RPC dat werk naar de server kunnen
  verplaatsen.

Toegevoegd bij de cardio-engine (`packages/progression-engine/src/cardio.ts`,
`app/workout/[dayId].tsx`, `app/history/[dayExerciseId].tsx`):
- **Doel-afhankelijke streefverhouding, stapgrootte en rondes-plafond**: 80/20
  is het fysiologische uitgangspunt, maar cardio speelt een andere rol per
  doel. Drie tabellen in `cardio.ts` maken dat concreet:
  - Streef-% zone2: 80% voor hypertrophy/endurance/mixed, 85% voor strength
    (behoudender, cardio mag herstel voor het tillen niet in de weg zitten),
    70% voor fat_loss (iets meer intensiteit toegestaan voor de extra
    calorieverbranding, zonder het polarized-principe los te laten).
  - Zone2-stapgrootte per sessie: 10% voor endurance (max van de gevraagde
    5–10%-marge), 8.5% fat_loss, 7.5% mixed, 5% hypertrophy/strength
    (voorzichtiger omdat cardio daar bijzaak is, niet de hoofdmoot).
  - Max. rondes vóór tempo-verhoging: 10 (endurance) tot 5 (strength).
  Dit zijn expliciete keuzes, geen instelbare velden — makkelijk terug te
  vinden en aan te passen in `cardio.ts` als de aannames niet kloppen.
- **Tempo-niveau wordt afgeleid, niet gelogd**: het datamodel heeft geen
  tempo/pace-kolom (de opdracht noemt die ook niet). `adviseCardioProgression`
  leidt het tempo-niveau af uit de rondes-geschiedenis: elke keer dat het
  aantal rondes vlak na het bereiken van het plafond weer terugvalt, wordt dat
  gelezen als "hier is een tempo-verhoging doorgevoerd" (rondes resetten naar
  de startwaarde om op het nieuwe tempo weer op te bouwen). De gebruiker voert
  het hogere tempo zelf uit op basis van de uitleg-tekst; er wordt geen aparte
  pace-waarde gelogd.
- **Venstervenster verankerd op een expliciete referentiedatum, niet de klok**:
  `computeWeeklyDistribution(logs, windowDays, referenceDate)` blijft een pure
  functie door `referenceDate` als (optioneel, default `new Date()`) argument
  te nemen in plaats van intern `Date.now()` te lezen — units geven een vaste
  datum mee, de UI laat het argument gewoon weg. Venstergrootte: 10 dagen
  (midden van de gevraagde 7–14 dagen-marge).
- **Eén cardio-"slot", dynamisch type per sessie**: `day_exercises.kind` kent
  zowel `cardio_duration` als `cardio_interval`, maar de UI behandelt elke
  cardio-oefening als één generieke cardio-slot: welk sessietype je die dag
  daadwerkelijk doet (zone2 of interval) wordt élke keer opnieuw door
  `adviseNextCardioType` bepaald op basis van de weekverdeling, niet
  vastgezet door de `kind`-waarde van de oefening. Die twee kind-waarden
  blijven in het schema staan voor een toekomstige weekplanner die mogelijk
  wél vaste cardio-typen per dag wil inplannen.
- **Eén sessie per cardio-oefening per workout**: in tegenstelling tot kracht
  (meerdere sets per oefening) log je cardio als één geheel (duur, RPE,
  eventueel hartslag/afstand/rondes). Na het loggen toont het scherm een
  samenvatting in plaats van een "volgende set"-knop.
  - **Geschatte totale duur bij intervallen**: er is geen apart invoerveld
    voor warm-up/cooldown, dus de duur-stepper wordt voorgevuld met
    `rondes × 7 minuten` (4 min hard + 3 min rustig per Noorse-4×4-ronde) als
    grove schatting; de gebruiker past het aan naar de werkelijke duur.

Nog open voor Fase 2 (Fase 1 is met stap 1 t/m 6 compleet; dit blijft relevant
zodra therapietrouw, cardio-programmering en verdere adaptatie aan bod komen):
- **Bodyweight-progressie**: de kracht-progressie-engine werkt op gewicht;
  voor pure bodyweight-oefeningen (waar gewicht vaak 0 kg is) geeft dat geen
  zinvolle progressie. Nog te ontwerpen: repetitie-gebaseerde progressie of
  toegevoegd-gewicht-tracking voor die categorie.
- **Cardio-oefeningen komen nog niet uit de generator**: de cardio-invoer,
  het advies en de historie zijn nu volledig gebouwd en getest, maar
  `@fitness/program-generator` zet nog geen cardio-`day_exercises` in
  gegenereerde programma's (bewust buiten scope gehouden — zie de
  weekplanner hieronder). Dat betekent dat een gebruiker die via de normale
  intake een programma laat genereren, in de praktijk nooit een cardio-slot
  in "Vandaag" ziet totdat de generator dat ook daadwerkelijk aanmaakt. Om
  deze functionaliteit te kunnen proberen is voorlopig een handmatig
  aangemaakte `day_exercises`-rij met `kind = 'cardio_duration'` of
  `'cardio_interval'` nodig.
- Hoe therapietrouw ("sessies overgeslagen") precies wordt gemeten (aantal
  gemiste sessies per periode?) voordat het schema wordt verkleind.
- Hoe de interference-check (cardio niet vlak vóór zware krachtdag) precies
  wordt ingebouwd in de weekplanner-output — de generator bouwt nog geen
  cardio-dagen/blokken in programma's; dat volgt zodra de interference-regel
  is uitgewerkt en cardio-oefeningen daadwerkelijk gegenereerd worden.
- `program_adjustments` (de tabel voor server-side adaptatiebeslissingen) is
  in het datamodel aanwezig sinds stap 1, maar er is nog geen scheduled
  job/edge function die hem vult — de progressie-engines (kracht én cardio)
  draaien nu alleen client-side, per keer dat de gebruiker het workout-scherm
  opent.

## Niet gebouwd (bewust, voor latere fases)

Wearables, voeding, social features, AI-chat, eigen-schema-builder,
meertaligheid — zoals in de opdracht vermeld, hier niet aangeraakt.

## Projectstructuur

```
app/                        Expo Router routes
  _layout.tsx                Root layout: Auth-/ProfileProvider + 3-weg Stack.Protected gate
  (auth)/
    index.tsx                 Login/registreren (e-mail + wachtwoord, één scherm met toggle)
  (onboarding)/
    index.tsx                  Intake-wizard: doel, ervaring, dagen/week, materiaal, review
  (tabs)/
    _layout.tsx                Tab navigator
    index.tsx                   "Vandaag": eerstvolgend dagschema + "Start workout"
  workout/
    [dayId].tsx                 Workout-invoer: StrengthLogger + CardioLogger, offline-first
  history/
    [dayExerciseId].tsx         Historie per oefening (kracht of cardio): lijngrafiek(en) + lijst per sessie
src/
  lib/
    supabase.ts               Supabase client (AsyncStorage op native)
    auth.tsx                   AuthProvider + useAuth hook
    profile.tsx                ProfileProvider + useProfile hook (profiles-rij van huidige user)
    programs.ts                saveGeneratedProgram / fetchActiveProgram / fetchProgramDayWithExercises
    offlineQueue.ts             FIFO sync-wachtrij (AsyncStorage) met idempotente upserts, incl. log_cardio
    id.ts                       generateId() — client-side UUID's voor offline-veilige writes
    history.ts                  fetchExerciseHistory() + fetchCardioHistory() — gedeeld door advies en historie
  theme/
    colors.ts                  Donker kleurenpalet
packages/
  progression-engine/         Pure, framework-onafhankelijke progressielogica
    src/
      types.ts
      strength.ts               Double progression met RIR
      cardio.ts                 Polarized 80/20: computeWeeklyDistribution / adviseNextCardioType / adviseCardioProgression
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
npm run test           # unit tests progressie-engine + program-generator (44 tests)
npm run typecheck      # TypeScript over het hele project
npm run web            # of: npm start, dan a/i/w voor android/ios/web
```

Zonder een geldig Supabase-project in `.env` start de auth-flow niet (de
Supabase-client gooit bewust een duidelijke foutmelding bij het opstarten in
plaats van stil te falen).
