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

**Extra (na Fase 1), stap 2: wekelijkse adaptatieplanner.** De laag die het
schema automatisch laat meegroeien: na elke volledige cyclus door het
programma evalueert de planner volume-opbouw, herstel/deload en
therapietrouw, en de gebruiker bevestigt (of past selectief toe) de
voorgestelde aanpassingen in een nieuw week-overzichtscherm. Zie de aparte
aannames-sectie verderop; het belangrijkste open punt is dat `distributeSessions`
(interference-vrije weekindeling) wel volledig gebouwd en getest is, maar nog
niet aan een echt weekdag-veld gekoppeld kan worden — dat veld bestaat nog
niet in het schema (zie ook het cardio-in-generator open punt hierboven).

**Extra (na Fase 1), stap 3: uitleg bij elk advies.** Geen nieuwe
trainingslogica — de kracht-, cardio- en planner-engines gaven al overal een
reden-string terug. Deze stap maakt dat consistent (één veldnaam,
`explanation`, in plaats van een mix van `explanation` en `reason`), voegt
een "Waarom?"-uitklap toe op de adviesschermen, en bouwt een nieuw
uitleg-geschiedenisscherm dat rechtstreeks uit `program_adjustments` leest.

**Extra (na Fase 1), stap 4: offline-ondersteuning.** Schrijven was al
volledig offline-veilig (de wachtrij uit stap 4 van Fase 1), maar lezen niet:
het workout-scherm, de historie en "Vandaag" deden allemaal een live
Supabase-call zónder cache-fallback, dus zonder bereik faalde zelfs het
*openen* van een training. Deze stap voegt een network-first-met-cache-
fallback laag toe aan alle reads die de workout-flow nodig heeft (dagschema,
sessiegeschiedenis voor advies, actief programma), plus een subtiele
sync-status-indicator. Zie de aparte aannames-sectie voor de details en een
belangrijke kanttekening bij hoe dit in dit sandbox-environment geverifieerd
kon worden (geen live backend, geen echt toestel).

**Extra (na Fase 1), stap 5: moderne app-uitstraling + streeffysiek-onboarding.**
Twee samenhangende UI/UX-verbeteringen, geen wijziging aan de
progressie-/generator-/planner-engines zelf. (1) Een consistent
designsysteem (spacing/radii/typografie-tokens, herbruikbare Card/Button/
SelectableCard/StatTile/ProgressDots-componenten, een zelfgebouwde SVG-
icoonset) toegepast op vier hoofdtabs — Vandaag, Schema (nieuw: dagen/
oefeningen bekijken én aanpassen), Progressie (nieuw: kerncijfers-dashboard +
per-oefening grafieken + aanpassingstijdlijn) en Profiel (nieuw: alles
bewerkbaar + lichaamsmetingen over tijd). (2) Een uitgebreide onboarding die
eerst een streeffysiek laat kiezen (mapt 1:1 op het bestaande
`Goal`-domeintype) en daarna basismetingen (gewicht, lengte, vetpercentage,
geslacht, geboortejaar, streefgewicht, live BMI) vastlegt als tijdreeks. Zie
de aannames-sectie verderop voor de details en open punten (placeholder-
silhouetten, de gekozen streak-definitie, de scope van schema-bewerken).

**Extra (na Fase 1), stap 6: game-achtige stats bij streeffysiek-keuze.**
Klein, presentatie-only add-on op de streeffysiek-picker uit stap 5: elke
kaart toont vijf geanimeerde stat-balken (Kracht, Spiermassa, Uithouding,
Snelheid, Lenigheid, schaal 1-5) die het trainingsprofiel van dat doel
tonen — een "character select"-gevoel, geen belofte over het eindresultaat.
De waarden staan als losse configuratie in `src/lib/physiqueStats.ts`,
volledig los van de generator/engines/planner. `SelectableCard` kreeg een
optionele `children`-slot (backwards-compatibel) om de nieuwe
`StatBars`-component (`src/components/StatBars.tsx`) onder elke kaart te
tonen; de balken vullen zich met een korte, gestaggerde animatie en tonen
altijd ook het numerieke label (1-5), niet alleen kleur/lengte.

**Extra (na Fase 1), stap 7: schema wisselen via streeffysiek, historie
blijft.** Vanaf de Schema-tab (en het profielscherm) kan de gebruiker op elk
moment een ander streeffysiek kiezen — hetzelfde keuzescherm als de
onboarding, nu uitgepakt naar een gedeelde `PhysiquePicker`-component — en
zo overstappen naar een nieuw doel/schema. Geen datamodelwijziging nodig:
`programs.status` ('active'/'archived') en de vrije-tekst
`program_adjustments.adjustment_type`-kolom ondersteunden dit al sinds
migratie 0001; deze stap voegt alleen een nieuwe waarde toe aan het
TypeScript-vocabulaire (`goal_changed`) en de bijbehorende orkestratielogica
(`src/lib/switchGoal.ts`). Cruciaal: gewichtshistorie per oefening wordt nu
gematcht op **oefeningsnaam over al iemands programma's heen** (oud +
nieuw) in plaats van op een los `day_exercise_id`, zodat de kracht-engine na
een wissel gewoon doorpakt op oefeningen die in beide schema's voorkomen —
zie de aannames-sectie voor de details en de reden waarom dit géén
databasemigratie nodig had.

**Extra (na Fase 1), stap 8: bugfixes — schemawissel-foutmelding en
navbar-clipping.**

*Bug 1 — "Kon niet wisselen van schema".* Deze sessie had geen MCP-toegang
tot het echte Supabase-project van de app (alleen twee niet-gerelateerde
projecten waren gekoppeld), dus kon niet rechtstreeks in de live logs
gekeken worden. Wel grondig uitgesloten via codeonderzoek: geen
unique-constraint blokkeert een tweede programma, de RLS-policies volgen
exact hetzelfde patroon als de al werkende onboarding-flow, en een nieuwe
gemockte test (`src/lib/switchGoal.test.ts`) bewijst dat de
volgorde-logica zelf klopt (nieuw programma altijd eerst, oud programma
wordt nooit aangeraakt als het aanmaken faalt). **Belangrijkste bevinding:
er bestaat in deze repo geen enkele CI/CD-pipeline die migraties op de
live database toepast** (geen GitHub Action, geen Vercel-hook, geen
`supabase/config.toml`) — migraties `0002` en `0003` zijn in eerdere
sessies alleen als bestand toegevoegd. Als die niet handmatig (`supabase
db push` of via de SQL-editor) zijn uitgevoerd, mist `profiles` de kolom
`target_physique` die `switchGoal` via `updateProfile` nodig heeft, en
faalt de wissel gegarandeerd. **Bevestigd en opgelost** nadat de gebruiker
het echte Supabase-project (`Fitness`, project-ref `xafjhpztfbyhozyruarh`)
aan deze sessie koppelde: `list_tables` liet inderdaad zien dat migratie
0001 en (deels) 0002 handmatig waren toegepast, maar 0003 niet —
`profiles.target_physique` en `body_measurements` bestonden niet.
`0003_physique_and_measurements.sql` is via `apply_migration` alsnog
toegepast; het schema komt nu exact overeen met de repo. Neveneffect van
de bug zichtbaar in de data: omdat `switchGoal` faalt ná het archiveren
van het oude programma maar vóór het bijwerken van `profiles`, stonden er
2 wees-archiefprogramma's (van mislukte pogingen) en een verouderd
`profiles.goal = 'mixed'` terwijl het echt actieve programma al
`hypertrophy` was — hersteld met een gerichte `update profiles set goal =
'hypertrophy', target_physique = 'muscular_athletic'` voor die ene
gebruiker (afgeleid uit het reeds actieve programma, niet gegokt: de
streeffysiek→doel-mapping is een bijectie). De archiefprogramma's zelf
zijn niet verwijderd — dat past bij het "nooit verwijderen, alleen
archiveren"-ontwerp en ze zijn onschuldig zichtbaar in "Eerdere schema's".
`get_advisors` toont daarna geen nieuwe security-issues (enige advisory:
"leaked password protection" staat uit — bestond al, losstaand van deze
bug, niet aangepast zonder expliciete vraag). Wel opgelost, los van de
migratie: de foutmelding was niet nutteloos generiek
door een bug (`PostgrestError extends Error` in de geïnstalleerde
supabase-js-versie, dus `err.message` kwam wél door), maar was wél te
mager — `hint`/`code` (waar Postgres vaak de letterlijke fix in zet, bv.
bij een RLS-fout) gingen verloren. Nieuwe `src/lib/describeError.ts` logt
het volledige foutobject en toont voortaan message + hint + code in de UI.
`switchGoal.ts` labelt daarnaast elke stap (nieuw programma aanmaken /
oud archiveren / profiel bijwerken / aanpassing loggen), zodat een fout
meteen zegt wélke stap brak.

*Bug 2 — navbar-labels afgesneden.* Root cause: `app/(tabs)/_layout.tsx`
had een vaste `tabBarStyle.height` (64) en vaste `paddingBottom` (10),
zonder rekening te houden met de onderste safe-area-inset (de
home-indicator/gesture-balk). Op een toestel zonder die balk paste de
inhoud er nog net in; op een toestel mét (die ~34px opeist) werd het label
dus letterlijk achter de systeembalk geschoven. Fix: `useSafeAreaInsets()`
(al beschikbaar — `expo-router`'s `ExpoRoot` wrapt de app al in een
`SafeAreaProvider`, dus geen extra provider nodig) telt `insets.bottom` nu
op bij zowel de hoogte als de padding-onder, zodat het label altijd boven
de systeembalk blijft — op elk toestel, met of zonder gesture-balk.

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
- **Nieuw package `@fitness/adaptation-planner`**: derde pure-functiepackage,
  zelfde opzet als de andere twee. Vier functies:
  - `shouldDeload(recentWeeks, cycleLengthWeeks?)` — weken sinds de laatste
    deload, of twee weken op rij herstelsignalen (zelfde "twee-strikes"-
    principe als de kracht-engine's deload-beslissing, i.p.v. op één
    slechte week reageren).
  - `evaluateWeek(weekLogs, program, goal)` — checkt eerst therapietrouw: bij
    ≥50% gemiste sessies is `reduce_days` de enige aanpassing die dat pass
    voorstelt (volume-adviezen worden expliciet overgeslagen — meer volume
    voorstellen terwijl het bestaande schema niet eens gehaald wordt, is
    slechte coaching). Zonder dat adherence-probleem: per spiergroep
    `volume_decrease` als reps onder de streef-range vielen, anders (alleen
    bij `goal === 'hypertrophy'`) `volume_increase` als alle sets de
    bovenkant van de range op de streef-RIR haalden. Roept daarna
    `shouldDeload` aan, onafhankelijk van de adherence-aanpassing (herstel en
    therapietrouw zijn losse assen).
  - `applyAdjustments(program, adjustments)` — muteert het programma
    mechanisch. Cruciaal: "dagen verkleinen" verwijdert nooit
    `day_exercises` (dat cascadeert naar `set_logs`/`cardio_logs` en zou
    trainingsgeschiedenis vernietigen) — het programma-object laat alleen de
    hoogste `dayOrder`-dagen weg, en de datalaag persisteert dat als
    `program_days.is_active = false`, niet als een delete. `deload` muteert
    ook geen sets: het is een vlag (`isDeloadWeek`) zodat een deload
    tijdelijk is en het schema er volgende week weer normaal bij staat.
  - `distributeSessions(strengthDays, cardioSessions, goal)` — legt
    krachtdagen op een vast, gelijkmatig gespreid weekdagpatroon (zelfde
    geest als de dag-archetypes van de generator), en plaatst cardio in de
    resterende dagen. Intensieve cardio mijdt zowel de zware beendag zelf als
    de dag ervóór; voor cardio-centrische doelen (endurance/fat_loss/mixed)
    geldt die bescherming ook voor rustige zone2-cardio, voor
    kracht-centrische doelen (strength/hypertrophy) alleen voor intervallen.
- **`src/lib/weekReview.ts`**: databrug tussen Supabase en de pure planner.
  `fetchWeekReview` bepaalt of er een nieuwe volledige cyclus door de actieve
  dagen is afgerond sinds de laatst geëvalueerde week
  (`completedCycles = floor(totalWorkouts / daysPerWeek)` vergeleken met
  `programs.current_week_number`) en bouwt zo ja de `WeekLog`/
  `CurrentProgramState` op uit `workouts`/`set_logs`/`day_exercises`, plus de
  week-geschiedenis (`RecentWeekSummary[]`) gereconstrueerd uit
  `program_adjustments` (geen aparte weken-tabel nodig: `wasDeload` = een
  `is_deload`-rij die week, `hasRecoverySignal` = een `volume_decrease`-rij
  die week). `applyWeekReview` persisteert een (eventueel door de gebruiker
  gedeeltelijk afgevinkte) subset van de voorgestelde aanpassingen: UPDATE op
  `day_exercises.sets`, UPDATE `program_days.is_active`, INSERT
  `program_adjustments`-rijen, en telt `programs.current_week_number` op.
- **RLS-aanname uit stap 1 bijgesteld**: `program_adjustments` had bewust
  alléén een select-policy, met als aanname dat een server-side proces (edge
  function) de tabel zou vullen. De planner draait client-side op expliciete
  bevestiging van de gebruiker, dus is er alsnog een insert-policy
  toegevoegd (migratie 0002) — dit is een bewuste correctie op de eerdere
  aanname, geen achteloze verzwakking van de RLS.
- **Week-overzichtscherm (`app/week-review.tsx`) + banner op "Vandaag"**: de
  banner verschijnt zodra `fetchWeekReview` een niet-nul resultaat geeft. Het
  scherm toont elke voorgestelde aanpassing als een aan-/uitvinkbare kaart
  (standaard allemaal aan) met reden en oude→nieuwe waarde, en een
  "Bevestigen"-knop — nooit stilletjes toegepast. Bij nul aanpassingen toont
  het scherm een geruststellende "ga zo door"-melding i.p.v. een lege lijst.
- **`explanation` als één veldnaam over alle drie de engines**: `StrengthAdvice`,
  `CardioTypeAdvice`, `Zone2Advice` en `IntervalAdvice` gebruikten dit al;
  `DeloadDecision.reason` en `Adjustment.reason` (beide in
  `@fitness/adaptation-planner`) zijn hernoemd naar `.explanation` zodat elke
  advies-dragende waarde in de hele codebase hetzelfde veld gebruikt. Puur een
  hernoeming (geen gedragswijziging); de `program_adjustments.reason`
  kolomnaam in de database is bewust ongemoeid gelaten — de datalaag
  (`weekReview.ts`, `adjustmentHistory.ts`) doet toch al de snake_case-naar-
  camelCase-vertaling voor elk veld.
- **"Waarom?"-uitklap toont al-berekende data, geen nieuwe berekening**: het
  kracht-adviesscherm toont op uitklap de laatst vergeleken sessie (datum +
  gelogde sets), het cardio-adviesscherm toont de weekverdeling in cijfers
  (minuten laag/hoog, %intensief). Beide komen uit state die al in de
  component aanwezig was voor de uitleg-zin zelf; er wordt niets extra's
  opgevraagd of berekend.
- **`app/adjustment-history.tsx`**: leest alle `program_adjustments` van het
  actieve programma (nieuwste eerst, gegroepeerd per weeknummer), elk met
  type, oude→nieuwe waarde en de reden-tekst. Gebruikt dezelfde
  `adjustmentTitle`-labels als het week-overzicht (nu gedeeld via
  `src/lib/adjustmentLabels.ts` i.p.v. gedupliceerd). Bereikbaar via een
  vaste link op "Vandaag" én vanuit het week-overzichtscherm — dus ook
  zichtbaar in weken zonder pending review.
- **`formatShortDate` samengevoegd**: stond drie keer bijna identiek
  gedupliceerd (workout-, historie- en nu ook het geschiedenisscherm);
  verhuisd naar `src/lib/dates.ts`.
- **`src/lib/offlineCache.ts` — network-first met cache-fallback**: één
  generieke `fetchWithCache(key, fetcher)` probeert eerst het netwerk,
  cachet het resultaat in AsyncStorage bij succes, en valt bij een
  netwerkfout terug op de laatst gecachte waarde voor die sleutel. Gooit
  alleen nog een fout als er *niets* te tonen valt (nooit eerder geladen én
  geen netwerk). Bewust eenrichtingsverkeer: de cache wordt alléén
  beschreven vanuit een geslaagde netwerk-read, nooit vanuit lokale invoer —
  dat loopt via de bestaande, losstaande sync-wachtrij (`offlineQueue.ts`).
  Dat scheiden is wat garandeert dat lokale invoer nooit stilletjes
  overschreven wordt door oudere serverdata: schrijven en lezen delen geen
  opslag.
- **Toegepast op `fetchActiveProgram`, `fetchProgramDayWithExercises`,
  `fetchExerciseHistory`, `fetchCardioHistory`**: precies de reads die de
  workout-flow nodig heeft om te *starten* zonder bereik (dagschema) en om
  het gewichtsadvies te *berekenen* zonder bereik (sessiegeschiedenis — de
  progressie-engines zijn al pure functies, dus zodra de historie er is,
  werkt het advies vanzelf offline mee). `fetchWeekReview` is bewust **niet**
  gecached: die heeft juist een verse workout-telling nodig om te bepalen of
  er een nieuwe week klaarstaat, en een verouderd gecached antwoord zou een
  allang-toegepaste of nog-niet-klare week-review kunnen tonen. Het
  week-overzicht blijft dus online-only — een bewuste, incidentele actie,
  geen "in de sportschool"-scenario.
- **Observeerbare wachtrijstatus i.p.v. handmatig pollen**: `offlineQueue.ts`
  kreeg een minimale pub/sub (`subscribeToQueue`) die na elke `enqueue` en
  elke geslaagde/mislukte sync-stap de nieuwe wachtrijlengte doorgeeft. De
  nieuwe hook `useSyncStatus` (combineert dit met `NetInfo.useNetInfo()`)
  vervangt de eerdere handmatige `getPendingCount()`-aanroepen na elke
  set/sessie — die `onLogged`-callback-doorgeefketen kon daardoor
  verdwijnen uit `StrengthLogger`/`CardioLogger` in plaats van ernaast te
  blijven bestaan.
- **`SyncStatusBadge`** (`src/components/`, eerste losstaande component —
  voorheen stond alle UI inline per scherm): toont "Offline" (rood) als
  `NetInfo` geen verbinding meldt, anders "N niet gesynchroniseerd" (neutraal)
  zolang de wachtrij niet leeg is, anders een rustige "Gesynchroniseerd"
  (groen). Zichtbaar op zowel het workout-scherm als "Vandaag".
- **Testscenario's niet end-to-end uitvoerbaar in deze omgeving**: er is geen
  live Supabase-project gekoppeld en geen echt toestel beschikbaar, dus de
  drie scenario's uit de opdracht (vliegtuigstand + volledige training
  invoeren, bereik verliezen/terugkrijgen halverwege, volledig offline
  openen) zijn geverifieerd via codereview en een browseromgeving
  (Playwright `context.set_offline`) i.p.v. een echte device-test. Dat laat
  zien dat de app niet crasht en bruikbaar blijft zodra de verbinding
  wegvalt (het scenario dat er in de praktijk toe doet — de JS draait al,
  alleen netwerkcalls beginnen te falen), maar bevestigt niet dat er
  daadwerkelijk data in Supabase terechtkomt na reconnect. Dat laatste stuk
  (de sync-wachtrij zelf) was al in een eerdere sessie gebouwd en
  gedocumenteerd; deze sessie voegt de leeskant toe die er nog aan ontbrak.

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

Toegevoegd bij de wekelijkse adaptatieplanner (`packages/adaptation-planner/`,
`src/lib/weekReview.ts`, `app/week-review.tsx`):
- **Therapietrouw-grens: ≥50% gemiste sessies**: dit is de eerder open vraag
  "hoe wordt therapietrouw precies gemeten" — nu concreet ingevuld als een
  drempel van de helft van de geplande sessies in één trainingsweek
  (2 van 4, 3 van 6, etc.). Bij het halen daarvan wordt het schema met één
  dag verkleind (nooit onder de 2 dagen/week uit de intake-check) en worden
  volume-aanpassingen dat pass overgeslagen.
- **Eén trainingsweek = één cyclus door de actieve dagen, geen kalenderweek**:
  `fetchWeekReview` telt hoeveel workouts er in totaal tegen de actieve
  `program_days` zijn gelogd, deelt door `daysPerWeek`, en vergelijkt dat met
  `programs.current_week_number`. Dit betekent dat een trainingsweek langer
  of korter dan 7 kalenderdagen kan duren als iemand niet op een vast ritme
  traint — een bewuste keuze, consistent met hoe "Vandaag" de eerstvolgende
  dag nu al bepaalt (workout-telling, niet kalenderdatums).
  - **Alleen kracht telt mee in de volume-evaluatie**: `evaluateWeek`
    filtert op `day_exercises.kind === 'strength'` voor de spiergroep-
    volume-logica; cardio-sessies tellen wel mee voor de "is deze dag
    gedaan"-check (therapietrouw), maar niet voor volume+/-. Cardio heeft
    immers geen setsvolume-concept — de eigen 80/20-verdeling regelt dat al.
- **Week-geschiedenis gereconstrueerd, geen aparte weken-tabel**: in plaats
  van een `program_weeks`-tabel bij te houden, leidt `fetchWeekReview`
  `RecentWeekSummary[]` af uit `program_adjustments` (gegroepeerd op
  `week_number`). Een week zonder enige aanpassing telt impliciet als
  "geen deload, geen herstelsignaal" — er hoeft dus geen rij te bestaan voor
  een rustige week.
- **`applyAdjustments` verwijdert nooit `day_exercises`**: een
  `reduce_days`-aanpassing laat historische oefeningen en hun `set_logs`
  intact; de datalaag zet alleen `program_days.is_active = false`. Dit was
  een harde eis, geen smaakkeuze — de foreign keys in het schema cascaderen
  bij een delete en zouden trainingsgeschiedenis vernietigen.
- **Bevestiging is selectief, niet alles-of-niets**: het week-overzicht laat
  elke voorgestelde aanpassing losstaand aan-/uitvinken (standaard allemaal
  aan) voordat "Bevestigen" ze toepast; `applyWeekReview` accepteert een
  subset van `evaluateWeek`'s output, dus de gebruiker kan bijvoorbeeld een
  deload overnemen zonder de volume-verhoging, of andersom.

Nog open voor Fase 2:
- **Bodyweight-progressie**: de kracht-progressie-engine werkt op gewicht;
  voor pure bodyweight-oefeningen (waar gewicht vaak 0 kg is) geeft dat geen
  zinvolle progressie. Nog te ontwerpen: repetitie-gebaseerde progressie of
  toegevoegd-gewicht-tracking voor die categorie.
- **Cardio-oefeningen komen nog niet uit de generator**: de cardio-invoer,
  het advies en de historie zijn nu volledig gebouwd en getest, maar
  `@fitness/program-generator` zet nog geen cardio-`day_exercises` in
  gegenereerde programma's. Dat betekent dat een gebruiker die via de
  normale intake een programma laat genereren, in de praktijk nooit een
  cardio-slot in "Vandaag" ziet. Om deze functionaliteit te kunnen proberen
  is voorlopig een handmatig aangemaakte `day_exercises`-rij met
  `kind = 'cardio_duration'` of `'cardio_interval'` nodig.
- **`distributeSessions` is gebouwd en getest, maar nergens live aangeroepen**:
  de functie legt kracht- en cardiosessies op weekdagen (1-7) met
  interference-vrije plaatsing, maar `program_days` heeft geen weekdag-veld
  om die uitkomst in op te slaan — er bestaat nu domweg geen kalender-concept
  in het schema. Dit hoort logisch bij dezelfde stap als "cardio-oefeningen
  komen nog niet uit de generator": zodra de generator ook cardio inplant,
  heeft `program_days` een weekdag-kolom nodig en kan `distributeSessions`
  daadwerkelijk de indeling bepalen in plaats van alleen getest te zijn.
- **`program_adjustments` wordt nu client-side gevuld, niet door een
  scheduled job**: de oorspronkelijke aanname uit stap 1 (server-side/edge
  function) is losgelaten omdat de opdracht voor de planner expliciet om
  bevestiging door de gebruiker vroeg — zie de RLS-aanname hierboven. Een
  toekomstige server-side variant (bijv. een wekelijkse cron die
  `evaluateWeek` alvast klaarzet) zou dezelfde pure functies kunnen
  hergebruiken; alleen de databrug zou dan verhuizen.
- **Geen speciale UI voor een lopende deload-week**: `isDeloadWeek` wordt wel
  correct berekend en gepersisteerd (impliciet via `program_adjustments.is_deload`),
  maar het workout-scherm leest die vlag nog niet uit om bijvoorbeeld het
  kracht-advies automatisch te dempen tijdens een deload-week — dat advies
  komt nu alleen uit `getStrengthAdvice`'s eigen sessie-op-sessie logica.
- **Offline-scenario's verdienen een echte device-test**: deze sessie heeft
  de leescache gebouwd en met codereview + browser-simulatie geverifieerd,
  maar niet met een echte Supabase-backend en een echt toestel in
  vliegtuigstand. Vóór een release zou iemand de drie scenario's uit de
  opdracht letterlijk moeten doorlopen (vliegtuigstand aan → training
  invoeren → verbinding terug → data staat in Supabase; halverwege bereik
  verliezen/terugkrijgen → geen dubbele/verloren sets; volledig offline
  openen → vorige waarden en advies zichtbaar).
- **Onboarding en week-review blijven online-only**: `saveGeneratedProgram`
  (intake) en `applyWeekReview` (aanpassingen bevestigen) gaan niet door de
  offline-wachtrij. Bewuste afbakening — dit zijn incidentele acties die
  typisch niet midden in een trainingssessie in de sportschool gebeuren,
  in tegenstelling tot het loggen van sets/cardio.

### Aannames bij stap 5 (moderne uitstraling + streeffysiek-onboarding)

- **Streeffysiek→doel-mapping op één plek**: `src/lib/physique.ts` is de
  enige plek waar een streeffysiek-optie aan een `Goal` gekoppeld wordt
  (`PHYSIQUE_OPTIONS` + `goalForPhysique`). Onboarding én het profiel-
  bewerkscherm lezen allebei uit deze lijst, zodat fysiek en doel nooit uit
  elkaar kunnen lopen. Wijzigt een gebruiker later zijn streeffysiek in het
  Profiel-tabblad, dan wordt `profiles.goal` meteen mee-geüpdatet — dat
  beïnvloedt alleen toekomstige generatie/advies, een bestaand programma
  wordt niet met terugwerkende kracht herschreven.
- **Placeholder-illustraties, bewust gemarkeerd**: de streeffysiek-picker
  gebruikt een zelfgebouwde, abstracte SVG-silhouet (`PhysiqueSilhouette` in
  `src/components/icons.tsx`) — geen foto's van echte mensen, conform de
  opdracht. Dit zijn expliciet placeholders; vervang `PhysiqueSilhouette`
  door de definitieve illustraties zodra die er zijn (één component, dus één
  plek om te vervangen).
- **Geen nieuwe icoon-dependency**: `@expo/vector-icons` bleek niet
  geïnstalleerd (niet in `package.json`, niet in `node_modules`). In plaats
  van een nieuwe dependency toe te voegen is er een klein, dependency-vrij
  SVG-icoonsetje gebouwd (`src/components/icons.tsx`, alleen
  `react-native-svg`, dat al gebruikt werd voor de historiegrafiek) — zelfde
  aanpak als de bestaande lijngrafiek.
- **Lichaamsmetingen als tijdreeks, niet als profielveld**: `body_measurements`
  is een aparte tabel (migratie 0003) met één rij per meting; `profiles`
  bevat geen `weight_kg`-kolom. BMI wordt altijd berekend
  (`src/lib/bmi.ts`), nooit opgeslagen.
- **Schema-tab: bewerken, geen vrije schema-builder-from-scratch**: de
  Schema-tab laat sets/reps/RIR aanpassen, een oefening vervangen (beperkt
  tot dezelfde spiergroep + het beschikbare materiaal, via de nieuwe pure
  `candidateExercisesForMuscleGroup`-functie in `@fitness/program-generator`)
  en de volgorde wisselen (omhoog/omlaag-knoppen — geen drag-and-drop, om
  geen nieuwe dependency te hoeven toevoegen). Een dag verwijderen deactiveert
  hem (`program_days.is_active = false`), exact hetzelfde mechanisme als de
  wekelijkse adaptatieplanner al gebruikte, zodat trainingshistorie nooit
  verloren gaat en de planner op de rest blijft werken. Een dag toevoegen
  heractiveert bij voorkeur een eerder verwijderde dag; is die er niet, dan
  wordt een nieuwe dag aangemaakt als kopie van een bestaande dag (zelfde
  oefeningen, daarna zelf aan te passen). Dit is dus geen "van nul een
  programma samenstellen"-builder — dat blijft de intake-flow.
- **Schema- en profiel-bewerkingen zijn online-only**: net als
  onboarding/week-review gaan deze mutaties niet door de offline-wachtrij
  (bewuste afbakening, zelfde redenering als eerder gedocumenteerd — dit zijn
  incidentele acties, geen sportschool-in-het-moment-logging). De Schema-tab
  haalt zijn data daarom ook niet via `fetchWithCache` op: bewerken moet
  altijd van de meest recente stand uitgaan.
- **"Langste streak"-definitie**: gedefinieerd als het langste aantal
  opeenvolgende 7-dagen-blokken (vanaf Unix-epoch geteld, niet per se
  kalenderweek-Maandag-gebonden) met minstens één workout, in
  `src/lib/progressStats.ts`. Gekozen omdat dit aansluit bij hoe de rest van
  de app al in "trainingsweken" denkt (`current_week_number`), in plaats van
  een dagelijkse streak die voor een 3×/week-schema vrijwel nooit lang zou
  standhouden.
- **"Volume deze week"**: som van `gewicht_kg × reps` over alle sets in de
  laatste 7 dagen — een rollend venster, geen kalenderweek.
- **Kon niet end-to-end getest worden**: zoals bij eerdere stappen was er in
  deze sandbox geen live Supabase-project en geen echt toestel beschikbaar.
  Geverifieerd: `npm run typecheck` (schoon), `npm run test` (75 tests,
  alle packages), een productie-`expo export --platform web`-bundle, en een
  headless Playwright-smoketest op de ingelogde bundel (geen console-errors).
  Niet geverifieerd: de daadwerkelijke onboarding- en schema-bewerkflows
  tegen een echte database.

### Aannames bij stap 7 (schema wisselen via streeffysiek)

- **Geen migratie nodig**: `programs.status` heeft sinds migratie 0001 al
  de waarden `active`/`completed`/`archived`, en
  `program_adjustments.adjustment_type` is een vrije-tekstkolom (geen
  DB-enum). Beide waren dus al voldoende voor "meerdere programma's per
  gebruiker, één actief" en voor een nieuw soort aanpassing
  (`goal_changed`) — deze stap voegt alleen een nieuwe waarde toe aan het
  TypeScript-vocabulaire in `@fitness/adaptation-planner`, niet aan het
  datamodel.
- **Bewust géén unique-index op "één actief programma per gebruiker"**:
  overwogen, maar losgelaten omdat die zou botsen met de gekozen,
  veiligere volgorde hieronder. `fetchActiveProgram`'s
  "nieuwste `started_at` eerst"-selectie geeft in de praktijk al hetzelfde
  resultaat.
- **Volgorde: eerst het nieuwe programma invoegen, dán het oude
  archiveren** (`src/lib/switchGoal.ts`) — nooit andersom. De client heeft
  geen databasetransactie tot zijn beschikking; met deze volgorde blijft
  een gebruiker bij een fout halverwege altijd met een werkend actief
  programma zitten, in plaats van tijdelijk zonder.
- **Historie matchen op oefeningsnaam, niet op `day_exercise_id`**:
  `fetchExerciseHistory` (in `src/lib/history.ts`) zoekt nu over alle
  programma's van de gebruiker heen (actief + gearchiveerd) naar
  `day_exercise`-rijen met dezelfde `exercise_name`, en voegt hun
  `set_logs` samen tot één chronologische geschiedenis. Dit is een
  bewuste aanname: twee oefeningen met exact dezelfde naam worden als
  "dezelfde oefening" behandeld — consistent met hoe "vervang oefening" in
  de Schema-tab al werkt. De groepeerlogica zelf is uitgepakt naar een
  pure, geteste functie (`src/lib/exerciseHistoryMerge.ts`) juist om dit
  zonder Supabase te kunnen verifiëren.
- **Nieuwe root-vitest-scope voor pure app-laag-code**: tot nu toe hadden
  alleen de `packages/*` een testrunner; `src/lib` was ongetest
  Supabase-lijmcode. `groupSetLogsIntoSessions` is de eerste écht pure
  functie in `src/lib`, dus is er een schaalbare `vitest.config.ts` op de
  root toegevoegd (scope: `src/**/*.test.ts`), zonder de bestaande
  package-tests te raken. `npm run test` draait nu 79 tests in totaal.
- **`saveGeneratedProgram` hergebruikt nu `insertProgramStructure`**: de
  program/dagen/oefeningen-insertlogica stond alleen in de onboarding-flow;
  die is uitgepakt zodat `switchGoal` hem kan hergebruiken in plaats van
  hem te dupliceren.
- **Profiel-tab bewerkt geen streeffysiek meer inline**: dat veld stond
  eerst ook los bewerkbaar in het profielformulier, maar sloeg dan alleen
  `profiles.target_physique`/`goal` op zonder ook echt een nieuw schema te
  genereren — een verborgen inconsistentie. Nu wijst het profielscherm
  (en de Schema-tab) naar hetzelfde `switch-goal`-scherm, zodat er nog
  maar één pad is dat het doel daadwerkelijk kan wijzigen.
- **"Eerdere schema's" (optioneel) toegevoegd aan Profiel**: een simpele
  lijst via `fetchProgramHistory`, alleen zichtbaar zodra er meer dan één
  programma is; faalt stil (geen foutmelding aan de gebruiker) zodat een
  probleem hiermee nooit de rest van het profielscherm blokkeert.
- **Dagen/ervaring/materiaal wijzigen in Profiel regenereert het schema
  niet**: dat was al zo vóór deze stap en blijft buiten scope — alleen
  streeffysiek/doel-wijzigingen lopen nu via de nieuwe, correcte
  switch-flow.

### Aannames bij stap 8 (bugfixes)

- **Root cause van bug 1 bevestigd na koppeling van het echte
  Supabase-project**: `profiles.target_physique` en `body_measurements`
  bestonden niet — migratie 0003 was nooit toegepast (0001 en 0002 wel,
  maar handmatig, niet via de CLI-migratietracking: `list_migrations` gaf
  een lege lijst terwijl het schema wel grotendeels overeenkwam). Opgelost
  met `apply_migration`; zie de stap-8-samenvatting hierboven voor de
  volledige diagnose en de datareparatie die daarna nodig was.
- **Geen geautomatiseerde migratie-pipeline toegevoegd**: dit bugfix-verzoek
  vroeg om de bug te fixen, niet om een CI/CD-migratiestap te bouwen. Zonder
  zo'n pipeline kan hetzelfde weer gebeuren bij een volgende migratie — het
  is de gebruiker aangeraden dit als aparte, expliciete vervolgstap te
  overwegen (bv. een GitHub Action die `supabase db push` draait bij een
  merge naar `main`).
- **`describeError` is bewust alleen toegepast op het schemawissel-pad**,
  niet als repo-brede refactor van elk catch-blok. Andere schermen gebruiken
  nog het oudere `err instanceof Error ? err.message : '...'`-patroon; dat
  werkt (PostgrestError extendt Error in de geïnstalleerde versie), maar
  toont geen `hint`/`code`. Een vervolgstap zou `describeError` overal
  kunnen hergebruiken.
- **Eerste gemockte Supabase-test in dit project**
  (`src/lib/switchGoal.test.ts`): een kleine, met de hand geschreven fluent
  mock van de query-builder (geen library), omdat er nog geen
  Supabase-testinfrastructuur bestond. Bewust beperkt tot wat nodig was om
  de volgorde/argumenten van `switchGoal`'s schrijfacties te verifiëren —
  geen poging om echte RLS/constraint-gedrag te simuleren (dat kán alleen
  tegen een echte Postgres-instantie, zie hierboven).
- **Navbar-hoogte is nu toestelafhankelijk** (`BASE_TAB_BAR_HEIGHT +
  insets.bottom`), in plaats van een vaste waarde — bewust, want dat was
  precies de bug. Getest via bundle-export + Playwright-smoketest (web,
  dus `insets.bottom = 0`); niet getest op een fysiek toestel met
  gesture-balk in deze sandbox.

## Niet gebouwd (bewust, voor latere fases)

Wearables, voeding, social features, AI-chat, een vrije van-nul-af-aan
schema-builder (zie hierboven — bewerken van een bestaand gegenereerd
schema is er wel), meertaligheid — zoals in de opdracht vermeld, hier niet
aangeraakt.

## Projectstructuur

```
app/                        Expo Router routes
  _layout.tsx                Root layout: Auth-/ProfileProvider + 3-weg Stack.Protected gate
  (auth)/
    index.tsx                 Login/registreren (e-mail + wachtwoord, één scherm met toggle)
  (onboarding)/
    index.tsx                  Intake-wizard: streeffysiek, basismetingen (+BMI), voorkeuren, samenvatting
  (tabs)/
    _layout.tsx                Tab navigator: Vandaag / Schema / Progressie / Profiel
    index.tsx                   "Vandaag": eerstvolgend dagschema + "Start workout"
    schema.tsx                  "Schema": dagen/oefeningen bekijken, bewerken, vervangen, herordenen, toevoegen/verwijderen
    progress.tsx                 "Progressie": kerncijfers, per-oefening links, aanpassingstijdlijn-preview
    profile.tsx                  "Profiel": profielgegevens + lichaamsmetingen bewerken, uitloggen
  workout/
    [dayId].tsx                 Workout-invoer: StrengthLogger + CardioLogger, offline-first
  history/
    [dayExerciseId].tsx         Historie per oefening (kracht of cardio): lijngrafiek(en) + lijst per sessie
  week-review.tsx               Week-overzicht: voorgestelde aanpassingen aan-/uitvinken en bevestigen
  adjustment-history.tsx        Uitleg-geschiedenis: alle program_adjustments, per week gegroepeerd
  switch-goal.tsx                Ander streeffysiek/doel kiezen: PhysiquePicker + bevestiging, archiveert oud programma
src/
  components/
    SyncStatusBadge.tsx        Offline / N niet gesynchroniseerd / Gesynchroniseerd — workout + Vandaag
    Card.tsx / Button.tsx / SelectableCard.tsx / EmptyState.tsx / ProgressDots.tsx / StatTile.tsx
                                 Designsysteem-componenten, gedeeld door alle vier de tabs + onboarding
    LineChart.tsx                Herbruikbare SVG-lijngrafiek (uit historiescherm getrokken; ook gebruikt in Profiel)
    StatBars.tsx                  Geanimeerde stat-balken voor de streeffysiek-kaarten
    PhysiquePicker.tsx            Het ene streeffysiek-keuzescherm — onboarding, profiel-edit én switch-goal delen dit
    icons.tsx                    Dependency-vrije SVG-icoonset (tab-iconen + PhysiqueSilhouette-placeholder)
  lib/
    supabase.ts               Supabase client (AsyncStorage op native)
    auth.tsx                   AuthProvider + useAuth hook
    profile.tsx                ProfileProvider + useProfile hook + updateProfile() (profiles-rij van huidige user)
    physique.ts                 PHYSIQUE_OPTIONS + goalForPhysique() + GOAL_LABELS — enige plek voor streeffysiek→doel
    physiqueStats.ts             PHYSIQUE_STATS — presentatie-only trainingsprofiel-stats per streeffysiek
    bmi.ts                       calculateBmi() / bmiCategory() — pure berekening, nooit opgeslagen
    measurements.ts              saveMeasurement() / fetchMeasurementHistory() — body_measurements-tijdreeks
    programs.ts                saveGeneratedProgram / insertProgramStructure / fetchActiveProgram / fetchProgramDayWithExercises / fetchProgramHistory
    switchGoal.ts                 switchGoal() — nieuw programma invoegen, oude archiveren, profiel + adjustment-log bijwerken
    schemaEditor.ts              fetchSchemaProgram + updateExerciseSets/replaceExercise/swapExerciseOrder/addDay/removeDay
    progressStats.ts             fetchWeeklyVolume / fetchMonthlyWorkoutCount / fetchLongestStreak
    offlineQueue.ts             FIFO sync-wachtrij (AsyncStorage), idempotente upserts, subscribeToQueue
    offlineCache.ts              fetchWithCache() — network-first leescache, fallback bij netwerkfout
    useSyncStatus.ts             Hook: wachtrijlengte (live) + NetInfo online/offline
    id.ts                       generateId() — client-side UUID's voor offline-veilige writes
    history.ts                  fetchExerciseHistory() (per oefeningsnaam, over alle programma's) + fetchCardioHistory()
    exerciseHistoryMerge.ts       groupSetLogsIntoSessions() — pure, geteste groepeerlogica achter fetchExerciseHistory
    describeError.ts              Zet een Postgrest/Error-object om in message + hint + code, i.p.v. een generieke fallback
    exerciseHistoryMerge.test.ts  Bewijst: logs overleven een schemawissel + de kracht-engine pakt ze op
    weekReview.ts                fetchWeekReview() / applyWeekReview() — databrug naar @fitness/adaptation-planner
    adjustmentHistory.ts         fetchAdjustmentHistory() — alle program_adjustments van het actieve programma
    adjustmentLabels.ts          Gedeelde Nederlandse labels per AdjustmentType (week-review + geschiedenis)
    dates.ts                     formatShortDate() — gedeeld door workout-, historie- en geschiedenisscherm
  theme/
    colors.ts                  Donker kleurenpalet (uitgebreid met surfaceElevated/warning/muted-varianten)
    spacing.ts / radii.ts / typography.ts
                                 Gedeelde spacing-, radius- en typografieschaal
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
      exercises.ts               Movement slots × equipment-varianten + candidateExercisesForMuscleGroup()
      repSchemes.ts               Sets/reps/RIR per doel + ervaring
      templates.ts                Dag-archetypes + templatekeuze (full body / upper-lower)
      generate.ts                 generateProgram(intake) -> GeneratedProgram
    tests/
      generate.test.ts
      exercises.test.ts
  adaptation-planner/         Pure, framework-onafhankelijke wekelijkse adaptatieplanner
    src/
      types.ts
      deload.ts                  shouldDeload(recentWeeks)
      evaluate.ts                 evaluateWeek(weekLogs, program, goal)
      apply.ts                    applyAdjustments(program, adjustments)
      distribute.ts                distributeSessions(strengthDays, cardioSessions, goal)
    tests/
      deload.test.ts
      evaluate.test.ts
      apply.test.ts
      distribute.test.ts
supabase/
  migrations/
    0001_init.sql              Volledig Fase 1-datamodel + RLS
    0002_adaptation_planner.sql  Weekteller, is_active op program_days, week_number/is_deload + insert-policy
    0003_physique_and_measurements.sql
                                 target_physique/gender/birth_year/target_weight_kg op profiles + body_measurements-tabel
vitest.config.ts               Root-scope testrunner voor pure src/lib-modules (src/**/*.test.ts), naast de package-tests
```

## Hoe te draaien

```bash
npm install
cp .env.example .env   # vul EXPO_PUBLIC_SUPABASE_URL en _ANON_KEY in
npm run test           # unit tests, alle packages + root src/lib samen (81 tests)
npm run typecheck      # TypeScript over het hele project
npm run web            # of: npm start, dan a/i/w voor android/ios/web
```

Zonder een geldig Supabase-project in `.env` start de auth-flow niet (de
Supabase-client gooit bewust een duidelijke foutmelding bij het opstarten in
plaats van stil te falen).
