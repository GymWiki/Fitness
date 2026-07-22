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

**Extra (na Fase 1), stap 9: supercompensatie-indicator + wetenschappelijke
FAQ.**

*Supercompensatie-indicator.* Nieuwe, pure `estimateRecoveryState()` in
`packages/progression-engine/src/recovery.ts` (additief — raakt
`strength.ts`/`cardio.ts` niet aan): schat per spiergroep of je nog
herstellende, in het optimale trainingsvenster, het venster aan het sluiten,
of er voorbij bent, op basis van tijd sinds de laatste sessie voor die
spiergroep, hoe zwaar die sessie was (sets × gemiddelde RIR × wel/geen
compound-oefening) en spiergroep-grootte (klein/middel/groot, met andere
basiswindows). Optioneel input voor spierpijn/slaap wordt door de functie
al ondersteund maar de app vraagt dit nog niet uit (bewuste afbakening, zie
aannames). App-laag (`src/lib/recovery.ts`) haalt de laatste sessie per
spiergroep op met dezelfde cross-programma-aanpak als de historie-merge uit
stap 7 — een goal-switch reset de herstelklok dus niet onterecht.
`RecoveryIndicator` toont een kleurenbolletje (rood/groen/amber/grijs) per
oefening op "Vandaag"; een prominente kaart verschijnt zodra minstens één
spiergroep het venster "hersteld" bereikt, met een link naar de
FAQ-uitleg.

*Wetenschappelijke FAQ.* Nieuw `/faq`-scherm (bereikbaar via Profiel en via
de herstel-kaart op Vandaag), met 8 vragen als gestructureerde data
(`src/lib/faqContent.ts`) — doorzoekbaar, per categorie (Kracht/Herstel/
Cardio) te filteren, per vraag inklapbaar, met minstens één klikbare bron
(titel + auteurs + jaar + link) per vraag en een disclaimer dat het
educatief is, geen medisch advies. **Elke bron is vóór het schrijven van de
content daadwerkelijk gecontroleerd** (WebSearch, want directe WebFetch
kreeg 403's van de meeste uitgevers) — en dat leverde twee correcties op
de aangeleverde bronnenlijst op:
- De opgegeven `PMC11679080`-link stond in de opdracht bij zowel de
  supercompensatie- als de deload-vraag, maar is in werkelijkheid Nøst,
  Aune & van den Tillaar (2024) over polarized cardiotraining — verplaatst
  naar de cardio-vraag, waar hij wél bij past.
- De opgegeven Pelland-bron combineerde twee verschillende papers onder
  één jaar/DOI. Gesplitst in de juiste twee: Robinson, Pelland, Remmert et
  al. (2024) over proximity-to-failure (gebruikt bij de RIR- en
  double-progression-vragen) en Pelland, Remmert, Robinson, Hinson &
  Zourdos (2025) over wekelijks volume/frequentie (gebruikt bij de
  volume-vraag).
- Voor supercompensatie en deload zelf, waar dus geen bruikbare bron
  overbleef, zijn twee nieuwe, wél gecontroleerde bronnen toegevoegd: Bompa
  & Buzzichelli's periodiseringstekstboek, en Bell et al. (2025) resp.
  Meeusen et al. (2013) voor deload/overtraining.

**Bugfix (na Fase 1): cardio ontbrak in élk schema, niet alleen bij "mix".**

*Diagnose.* De gerapporteerde klacht was dat doel "mix" geen cardio kreeg.
Grep door de hele repo op `cardio_duration`/`cardio_interval`/`cardio_config`
liet zien dat geen van die drie ooit werd geschreven vanuit
`packages/program-generator` — de generator bouwde uitsluitend
krachtdagen, voor élk doel. `day_exercises.kind` werd bij het aanmaken van
een nieuw programma altijd hardcoded op `'strength'`
(`src/lib/programs.ts`'s `insertProgramStructure`). De cardio-*engine*
(`packages/progression-engine/src/cardio.ts`, polarized 80/20-model) en de
interferentie-bescherming in `distributeSessions()`
(`packages/adaptation-planner/src/distribute.ts`, al goal-aware: houdt
cardio weg van/na zware onderlichaamsdagen voor endurance/fat_loss/mixed)
bestonden al en waren al correct — ze kregen alleen nooit cardio-sessies
aangeleverd om iets mee te doen. Conclusie: de bug zat uitsluitend in de
generator + persistentielaag, niet in een van beide engines.

*Fix A + B (samengevoegd — bleek in de praktijk één config-tabel).* Nieuwe
`packages/program-generator/src/cardioBaseline.ts` met
`CARDIO_BASELINE_BY_GOAL: Record<Goal, {sessionsPerWeek, minutesPerSession}>`
als enige bron van waarheid voor hoeveel cardio elk doel krijgt:
hypertrophy/strength 1×20 min (bewust laag, interferentie met krachtopbouw
beperken), mixed 2×30 min (substantieel, in balans met kracht — dit was de
gemelde bug), fat_loss/endurance 3×50 min (~150 min/week, WHO-richtlijn,
ongewijzigd t.o.v. voorheen: cardio was en blijft daar het hoofdbestanddeel).
`GeneratedDay` kreeg een nieuw, altijd-aanwezig `cardioSessions`-veld naast
`exercises`; cardio krijgt eigen, toegewijde dagen (dus geen
discriminated union nodig op `GeneratedExercise`, dat vooral
kracht-specifieke velden heeft). `generateProgram()` plakt deze
cardio-dagen na de kracht-dagen. `buildCardioSessionTypes()` zaait een
eenvoudige zone2/interval-verdeling (nooit een harde interval als eerste
sessie) — een startpunt, geen precisie-80/20; zodra er historie is neemt
`adviseNextCardioType`/`adviseCardioProgression` het over, zoals al het
geval was. Bewust géén cross-package import van
`progression-engine/cardio.ts`'s eigen per-doel-constanten — de drie
packages blijven onderling ontkoppeld, zoals in eerdere sessies vastgelegd.
`insertProgramStructure` (`src/lib/programs.ts`) mapt nu zowel
`day.exercises` als `day.cardioSessions` naar `day_exercises`-rijen, met de
juiste `kind` (`zone2` → `cardio_duration`, `interval` → `cardio_interval`)
en `cardio_config`; dit activeert voor het eerst de al langer bestaande
maar dode `CardioLogger`-tak in `app/workout/[dayId].tsx`. Onboarding-
samenvatting en de bevestigingskaart bij het wisselen van doel
(`switch-goal.tsx`) tonen nu ook de cardio-sessies, met een korte
doel-afhankelijke uitleg ("Je schema bevat ook N lichte cardiosessie(s)
per week voor je hart- en vaatgezondheid" resp. een cardio-nadruk-variant
voor fat_loss/endurance/mixed).
`distributeSessions()` zelf is niet aangeraakt — puur een bevestigende
test toegevoegd met generator-vormige cardio-input voor doel `mixed`, die
aantoont dat de al bestaande bescherming ook de nieuwe mix-cardio correct
weghoudt bij zware dagen.

*Tests.* 5 nieuwe tests in `generate.test.ts` (mixed krijgt 1-2 sessies;
hypertrophy/strength krijgen een kleine, niet-nul basis kleiner dan mixed;
fat_loss/endurance blijven domineren t.o.v. mixed en halen de volledige
baseline; elk doel heeft een positieve baseline; cardio- en krachtdagen
sluiten elkaar uit), plus een los bestand `cardioBaseline.test.ts` voor
`buildCardioSessionTypes()`'s randgevallen (0, 1, 2, 3, 5 sessies). 5
bestaande tests in `generate.test.ts` die impliciet "geen cardio" als
correct gedrag aannamen (exacte `days`-lijsten zonder cardio-dagen) zijn
herschreven met nieuwe `strengthDays()`/`cardioDays()`-filters — een
bewuste, beredeneerde uitzondering op "bestaande tests moeten blijven
slagen", omdat die tests precies de bug vastlegden die nu gefixed is. Eén
nieuwe test in `distribute.test.ts` bevestigt de interferentie-bescherming
voor mix-cardio zonder `distribute.ts` te wijzigen.

**Bugfix (na de cardio-fix hierboven): `null value in column
"progression_rule"` bij schemawissel.**

*Diagnose.* Exacte foutmelding: `Nieuw programma aanmaken: null value in
column "progression_rule" of relation "day_exercises" violates not-null
constraint (23502)` — dat prefix komt letterlijk uit `switchGoal.ts`'s
`withStage('Nieuw programma aanmaken', () => insertProgramStructure(...))`,
dus de fout zat gegarandeerd in `insertProgramStructure`. Root cause:
`day_exercises.progression_rule` is `NOT NULL` met
`default '{}'::jsonb`, maar `insertProgramStructure` bouwde vóór deze fix
één array met zowel kracht- als cardio-rijen en gaf alleen de kracht-rijen
een `progression_rule` mee (cardio-rijen kregen die sleutel helemaal niet
— logisch, want ze hadden in plaats daarvan `cardio_config`, en de
kolom heeft toch een default). Het probleem: bij een bulk-insert met een
array van objecten met **verschillende sleutels per rij** vult
PostgREST/Postgres (via `json_to_recordset`-achtige verwerking) de
ontbrekende sleutel voor de rijen die hem missen op met een expliciete
`NULL` — niet met de kolom-default. Een uniforme array (elke rij mist
dezelfde sleutel, zoals in `schemaEditor.ts`'s `addDay`, dat
`progression_rule` sowieso nooit meegaf) loopt hier niet tegenaan, omdat de
kolom dan gewoon buiten de gegenereerde INSERT valt en de default normaal
toepast. Dit verklaart ook waarom de fout er pas kwam nadat de vorige
cardio-fix cardio-rijen aan dezelfde insert-batch toevoegde: vóór die fix
was er geen mix van rij-vormen om het probleem te triggeren. Bevestigd via
statische code-analyse (2 insert-plekken in totaal in de hele repo:
`programs.ts` en `schemaEditor.ts`) en een test die de exacte
Postgres-foutcode simuleert.

*Fix.* Nieuwe, centrale `defaultProgressionRuleFor()` in `src/lib/programs.ts`
— de enige plek die een geldige `progression_rule` bouwt, voor zowel
kracht (`{ weightIncrementKg }`, ongewijzigde vorm) als cardio
(`{ type: 'polarized', sessionType }`, nieuw — een klein, betekenisvol
configuratie-object in plaats van een lege placeholder). Beide rij-soorten
in `insertProgramStructure` roepen deze nu aan, dus élke rij in de array
heeft altijd dezelfde sleutels. Extra verdedigingslaag:
`assertProgressionRules()` gooit vóór de insert een duidelijke, Nederlandse
fout ("Interne fout: oefening ... heeft geen progression_rule...") als een
rij hem toch mist — voorkomt dat een toekomstige regressie weer als een
rauwe Postgres-constraint-fout naar de gebruiker lekt. `schemaEditor.ts`'s
`addDay` (de andere, niet-bugged maar eveneens relevante insert-plek) is
voor consistentie ook expliciet gemaakt: zet nu letterlijk
`progression_rule: {}` (matcht de DB-default) in plaats van de sleutel
stilzwijgend weg te laten, en loopt door dezelfde `assertProgressionRules()`.
De NOT NULL-constraint zelf blijft ongewijzigd op de database — de fix zit
uitsluitend in de applicatiecode.

*Tests.* Nieuw `src/lib/programs.test.ts` (zelfde hand-rolled
Supabase-mock-patroon als `switchGoal.test.ts`), met een mock voor de
`day_exercises`-tabel die de echte NOT NULL-constraint nabootst (retourneert
een `23502`-fout als een rij `progression_rule` mist) — dus de tests
reproduceren daadwerkelijk het faalscenario in plaats van het alleen te
omzeilen. Voor elk doel (hypertrophy/strength/endurance/fat_loss/mixed):
`insertProgramStructure` slaagt en elke geïnserte rij (kracht én cardio)
heeft een gedefinieerde, niet-`null` `progression_rule`. Losse unit-tests
voor `defaultProgressionRuleFor()` (juiste vorm per type) en
`assertProgressionRules()` (gooit bij een ontbrekende rij, gooit niet als
alles compleet is). `switchGoal.test.ts` kreeg een nieuwe test die specifiek
wisselt naar `balanced_general` (doel `mixed`, dus zowel kracht- als
cardio-rijen in dezelfde batch — exact het scenario dat de bug
veroorzaakte) en bevestigt dat de wissel slaagt en alle rijen een
`progression_rule` hebben.

**Extra (na Fase 1), stap 10: voeding bijhouden (Open Food Facts) gekoppeld
aan trainingsdoel.**

Nieuwe, bewust losstaande feature — geen wijziging aan de kracht-/
cardio-engines of de adaptatieplanner, alleen nieuwe code ernaast met een
paar dunne, expliciete koppelpunten (uitleg-banner op Vandaag, sectie op
Progressie).

*Doelenberekening (`packages/nutrition-engine`, pure, 25 tests).* Nieuw,
vierde monorepo-package, zelfde conventie als de drie trainingsengines
(geen React Native-/Supabase-imports, eigen vitest-suite). `NutritionGoal`
is bewust een eigen, losse union die de waarden van `program-generator`'s
`Goal` spiegelt in plaats van hem te importeren — packages blijven
onderling ontkoppeld. `calculateNutritionTargets()`: BMR via Mifflin-St
Jeor (voor `gender: 'other'` het gemiddelde van de mannen-/vrouwenformule —
een expliciete, gedocumenteerde benadering, geen klinisch precieze waarde),
TDEE via een eenvoudige, aan trainingsdagen/week gekoppelde
activiteitsmultiplier (geen aparte "hoe actief ben je"-vraag nodig),
calorieaanpassing en eiwit-g/kg per doel in twee losse config-tabellen
(`CALORIE_ADJUSTMENT_BY_GOAL`, `PROTEIN_G_PER_KG_BY_GOAL` — één bron van
waarheid, instelbaar), vet standaard 25% van de calorieën, koolhydraten als
restpost. `detectProteinShortfall()` is een puur signaal: vuurt alleen als
de N (standaard 3) meest recente gelogde dagen allemaal onder het
eiwitdoel zaten — kijkt bewust alleen naar de staart van de reeks, niet
naar de volledige historie, zodat een oude, inmiddels rechtgezette
tekortkoming niet blijft afgaan. `scaleNutrients()` schaalt Open Food
Facts' per-100g-waarden naar een gelogde hoeveelheid — ook hier gekozen
voor een pure, geteste functie in plaats van losse rekenlogica in de UI.

*Open Food Facts-integratie.* `src/lib/openFoodFacts.ts`: `GET
.../api/v2/product/{barcode}.json` voor barcode-opzoeken (v2), `GET
.../cgi/search.pl` voor naam-zoeken (v1 — v2 heeft nog geen
full-text-search). Beschrijvende `User-Agent`-header meegestuurd zoals
gevraagd, met de kanttekening dat browser-`fetch` `User-Agent` als
"forbidden header" behandelt en 'm op web stilzwijgend laat vallen — dit
werkt dus alleen daadwerkelijk op native (iOS/Android). Een
`status: 0`-response (barcode onbekend) geeft `null` terug, geen fout — de
UI valt dan terug op handmatige invoer. Alle voedingswaarde-velden worden
defensief uitgelezen (`null` bij ontbrekende data), passend bij
community-ingevoerde, vaak onvolledige OFF-data. `src/lib/foodProducts.ts`
cachet elk opgezocht product in de nieuwe `food_products`-tabel en
raadpleegt die cache eerst, zodat herhaalde scans van dezelfde barcode
(over alle gebruikers heen — het is een gedeelde cache) nooit meer de OFF
rate limit (15 req/min voor opzoeken) raken. Zoeken (10 req/min) wordt
nergens per toetsaanslag aangeroepen: het zoekscherm zoekt alleen op
expliciete actie (indienen/knop), plus een pure, geteste
`canSearchNow()`-guard (`src/lib/searchThrottle.ts`) die een tweede trigger
binnen 500ms blokkeert (dubbeltik-bescherming) — dit is de testbare vorm
van de debounce-eis uit de opdracht, aangezien er in deze codebase geen
harnas voor React Native-componenttests bestaat (zelfde conventie als de
rest van de sessie: pure logica krijgt tests, UI niet).

*Datamodel (migratie `0004_nutrition.sql`).* `food_products`: gedeelde
cache van publiek, ODbL-gelicenseerd OFF-materiaal — bewust géén
`user_id`, RLS staat elke ingelogde gebruiker lezen/schrijven toe (het is
feitelijk een client-side HTTP-cache, geen persoonlijke data).
`food_logs`: user-owned (RLS zoals overal), `barcode` verwijst naar
`food_products` óf `custom_name` is gezet voor handmatige invoer (check
constraint, nooit beide null). `food_favorites`: snapshot van de
per-100g-macro's op opslagmoment (geen live join naar `food_products`), zo
blijft een favoriet werken ook als dat product ooit uit de cache valt.
Bewust géén losse `nutrition_targets`-tabel (was optioneel in de opdracht):
de doelen worden live berekend uit `profiles` + de laatste
`body_measurements`-rij — snel genoeg om niet te hoeven cachen, en zo kan
een doel nooit stale raken na een nieuwe meting.

*Loggen + koppeling met trainingsdata.* Nieuw vijfde tabblad "Voeding"
(naast Vandaag/Schema/Progressie/Profiel): dagoverzicht (calorieën/macro's
vs. doel via een nieuwe `NutrientProgressBar`), Scannen/Zoeken, "Recent
gelogd" (één tik: exact dezelfde eerder gelogde hoeveelheid opnieuw
loggen) en "Favorieten" (één tik: de opgeslagen per-100g-waarden bij 100g
loggen — voor een andere hoeveelheid gebruikt de gebruiker scannen/zoeken).
`app/food-scan.tsx` (cameraToegang via `expo-camera`'s `CameraView` +
`useCameraPermissions`, nieuwe permissie-plugin in `app.json`) en
`app/food-search.tsx` delen één `FoodLogForm`-component voor de
hoeveelheid/macro-preview/bevestig-stap, inclusief handmatige-invoermodus
voor een niet-gevonden barcode of een lege zoekopdracht — bewust géén
losse route hiervoor, om de kwantiteits-/preview-logica niet te
verdubbelen. Loggen gaat via een nieuwe `log_food`-actie in de bestaande
offline-wachtrij (`offlineQueue.ts`), zelfde patroon als `log_set`/
`log_cardio`: client-gegenereerde id + upsert, dus een offline gelogde
maaltijd synct zodra er weer verbinding is. Barcode-opzoeken zelf vereist
uiteraard wel verbinding — scan- en zoekscherm tonen een duidelijke
melding via de bestaande `useSyncStatus`-hook in plaats van de camera/het
zoekveld te tonen zonder dat er iets mee kan.

Het eiwit-tekort-signaal (`src/lib/proteinSignal.ts`) hangt aan dezelfde
uitleg-/inzicht-laag als de supercompensatie-banner op Vandaag: een nieuwe,
oranje `proteinBannerCard` verschijnt zodra `detectProteinShortfall` vuurt,
uitsluitend voor de doelen hypertrophy/strength (interpretatie van
"opbouwfase" uit de opdracht — bij fat_loss/endurance/mixed is eiwit al
elders geprioriteerd of niet de primaire hefboom, dus daar blijft het
signaal uit). Progressie kreeg een aparte "Voeding"-sectie (eiwit-trend
over de laatste 14 dagen via de bestaande `LineChart`, met het actuele
eiwitdoel als bijschrift) — expliciet naast, niet vermengd met, de
trainingsstatistieken erboven. Open Food Facts-attributie staat onderaan
Profiel, zoals de ODbL-licentie vereist.

*Tests.* 25 nieuwe tests in `packages/nutrition-engine` (doelenberekening
per doel/geslacht/lichaamsgewicht/trainingsfrequentie, override-parameters,
protein-shortfall-randgevallen inclusief "alleen de staart telt" en een
custom threshold, macro-schaling inclusief afronding). 6 nieuwe tests voor
`canSearchNow()` (eerste zoekopdracht toegestaan, dubbeltik geblokkeerd,
exact-op-de-grens, custom interval, en een simulatie van snel typen die
aantoont dat niet elke toetsaanslag een zoekopdracht triggert).

**Extra (na Fase 1), stap 11: lichaamsdiagram met herstelstatus per
spiergroep op Vandaag.**

Bouwt bovenop de al bestaande, al eerder gebouwde `estimateRecoveryState()`
(stap 9) — deze stap voegt uitsluitend een visuele laag toe, geen nieuwe
herstel-logica.

*Doorbraak-inzicht: geen nieuwe berekeningen nodig, alleen een kleur- en
regio-mapping.* `RecoveryEstimate` gaf al `status`, `hoursSinceSession`,
`windowStartHours`, `windowEndHours` en `explanation` — genoeg om een
vloeiende kleurovergang en een tik-uitleg te bouwen zonder de pure functie
zelf aan te raken. Twee nieuwe pure, geteste modules in `src/lib`:
- `recoveryColor.ts`: interpoleert tussen bestaande design-tokens
  (`colors.danger` → `colors.warning` → `colors.accent` → `colors.warning`
  → `colors.textTertiary`) op basis van hoe ver een spiergroep door zijn
  venster is — rood vlak na een sessie, oranje bij het naderen van het
  venster, groen op de piek (klaar), geleidelijk terug naar oranje bij het
  sluiten van het venster, grijs erna. Dit volgt de vorm van de
  supercompensatie-curve zelf (vermoeidheid → herstel → piek → afvlakking)
  in plaats van een simpel stoplicht met 5 vlakke kleuren, zoals gevraagd.
  Status blijft altijd ook als tekst zichtbaar (zie
  `STATUS_LABEL`/`STATUS_COLOR`, verplaatst naar het nieuwe, React
  Native-vrije `recoveryLabels.ts` zodat zowel `RecoveryIndicator.tsx` als
  pure `src/lib`-modules dezelfde bron gebruiken — een `.tsx`-component
  importeren vanuit `src/lib` bleek Vitest te breken, omdat dat
  react-native's ongetranspileerde Flow-syntax meetrekt).
- `bodyDiagramRegions.ts`: SVG-regiogeometrie (rects/circles op een
  `viewBox 0 0 200 420`) voor alle 10 spiergroepen, plus een pure
  `describeRegionTap()`-formatter voor de tik-kaart-inhoud. De
  voor-/achterkant-verdeling volgt letterlijk het voorbeeld uit de
  opdracht (borst/buik/quadriceps vooraan; rug/hamstrings/kuiten achteraan)
  en is getest tegen de nieuwe `ALL_MUSCLE_GROUPS`-export uit
  `@fitness/program-generator` (afgeleid van `MOVEMENT_SLOTS`, dus kan
  nooit stilzwijgend uit de pas lopen als er ooit een spiergroep bijkomt).
  Twee spiergroep-namen in het datamodel overlappen anatomisch
  (`Bilspieren/Hamstrings` van de hinge-beweging vs. losse `Hamstrings` van
  de isolatie-oefening) — bewust niet samengevoegd tot één regio (dat zou
  nieuwe logica vereisen om twee herstelstatussen tot één kleur te
  combineren), maar als twee aangrenzende, apart aantikbare vlakken op de
  achterkant.
- `BodyDiagram.tsx`: een generiek, sekseneutraal silhouet
  (react-native-svg, geen nieuwe dependency) met de 10 regio's erbovenop,
  voorkant-/achterkant-toggle, tekst-legenda (kleur is nooit de enige
  informatiedrager) en een tik-kaart met spiergroep, statuslabel,
  actuele uitleg-tekst en een link naar de FAQ — bewust een placeholder-
  kwaliteit illustratie (rects/circles, geen anatomisch gebeeldhouwde
  paths), net als de eerdere `PhysiqueSilhouette`, met ruimte voor een
  mooiere illustratie later.
- `fetchAllMuscleGroupRecoveryEstimates()` (nieuw in `src/lib/recovery.ts`)
  haalt een schatting op voor alle 10 spiergroepen (niet alleen die van
  vandaag's dag, zoals de bestaande `recoveryByMuscleGroup`-state al deed)
  — onafhankelijk, fail-soft opgehaald zodat een storing hier nooit de rest
  van Vandaag blokkeert, zelfde patroon als de andere "nice-to-have"-secties
  op dat scherm.

*Tests.* 20 nieuwe tests: `recoveryColor.test.ts` (elke status geeft de
juiste kleur, inclusief de vloeiende overgangen binnen 'recovering' en
'window_closing' — nooit dezelfde tint tweemaal bij een oplopende
tijdsduur), `bodyDiagramRegions.test.ts` (elke `ALL_MUSCLE_GROUPS`-waarde
heeft precies één regio, voor-/achterkant dekken samen alle spiergroepen
zonder overlap of gat, en `describeRegionTap()` geeft voor elke status het
juiste label + de actuele uitleg-tekst — dit dekt de "tikken toont de
juiste uitleg"-eis zonder een React Native-componenttest-harnas nodig te
hebben, consistent met hoe deze codebase pure logica test in plaats van
UI). Root `vitest.config.ts` kreeg een `@`-alias-resolutie (mirrorend
`tsconfig.json`'s `paths`) zodat `src/lib`-tests ook modules met een
`@/theme/...`-import kunnen laden.

**Verfijning: realistischer anatomisch lichaamsdiagram.**

*Licentie-afweging (gevraagd om eerst te doorlopen).* Geen bestaande
gelicenseerde asset in dit project om op te bouwen. Een vergelijkbare,
correct gelicenseerde vector-asset zoeken (stockbibliotheek/royalty-free
SVG-set) was in deze sandbox niet betrouwbaar te verifiëren — uitgaand
netwerkverkeer naar willekeurige externe hosts is hier beperkt tot een
toegestane lijst, dus een aankoop/download-bron kon niet met zekerheid op
licentie gecontroleerd worden. Om elk licentierisico volledig uit te
sluiten is gekozen voor **optie 3: een originele illustratie**, met de
hand geschreven als SVG-path-data (bezier-curves), niet nagetekend van een
bestaande stockafbeelding — dit is de enige van de drie geboden opties die
zonder enige externe afhankelijkheid of onzekerheid uitvoerbaar was.

*Wat er veranderde.* `bodyDiagramRegions.ts`: `RegionShape` ondersteunt nu
alleen nog `{type: 'path', d: string}` (rects/circles helemaal vervangen);
elk van de 10 spiergroep-vlakken is een eigen, getekende bezier-vorm
(deltoid-"petal"-vorm voor schouders, een pec-vorm met sternum-inkeping
voor borst, een getailleerd paneel voor core, tapse capsule-vormen voor
biceps/triceps/quadriceps/hamstrings/kuiten, een schildvorm voor de
bilspieren, een trapezius/lats-vorm voor de rug). `BodyDiagram.tsx`:
`BodyOutline` is een met de hand getekend lichaamssilhouet (hoofd, romp,
benen als één omtrek; elke arm apart, licht van de romp af — "armen licht
van het lichaam af" uit de opdracht — met simpele hand-vormen), gedeeld
tussen voor- en achterkant (dezelfde buitenomtrek, alleen de
spiervlakken erbovenop verschillen). Het canvas kreeg een eigen lichte
"poster"-achtergrond (`#F2EFEA`) met donkere contourlijnen (`#1C1C1E`) —
bewust *niet* afgeleid van `theme/colors.ts`'s donkere basispalet: een
spierschema leest het best op een eigen lichte achtergrond, zoals ook op
echte sportschoolposters, en de omringende dark-mode `Card` blijft daar
omheen gewoon donker. Elk spiervlak heeft nu een eigen zichtbare
contourlijn (voorheen `stroke: colors.background`, wat vlakken tegen de
donkere achtergrond liet wegvallen) — dit is precies de "duidelijk
afgebakende vlakken, geen vage kleurvlek"-eis uit de opdracht.

*Wat gelijk bleef (afbakening).* De herstelkleur-logica
(`recoveryColor()`), de spiergroep-naar-view-mapping, de
voorkant-/achterkant-toggle-interactie, de tik-kaart en de legenda zijn
allemaal ongewijzigd — alleen de illustratie eronder is vervangen. De 20
bestaande tests (`bodyDiagramRegions.test.ts`, `recoveryColor.test.ts`)
draaien ongewijzigd door, want ze toetsen de region-naar-spiergroep-
mapping en kleurlogica, niet de exacte coördinaten.

*Verificatie.* Coördinaten eerst uitgeprobeerd in een losse HTML/SVG-
prototype (Playwright-screenshot) buiten de repo, daarna 1-op-1
overgenomen in `bodyDiagramRegions.ts`/`BodyDiagram.tsx`. Om het
eindresultaat in de daadwerkelijke, gedraaide app te zien zonder in te
loggen (de auth-gate vereist een echte Supabase-sessie, en dit
sandbox-netwerk laat geen verbinding naar Supabase toe), is tijdelijk een
ongeauthenticeerde previewroute toegevoegd (`app/_diagram-preview.tsx` +
een extra `Stack.Screen` in `app/_layout.tsx`), de web-export gedraaid, en
via Playwright gescreenshot (voor- en achterkant, plus een tik-op-een-
spiergroep-test die bevestigde dat de tik-kaart nog steeds de juiste
spiergroep/status/uitleg toont) — geen consolefouten. Beide tijdelijke
bestanden/wijzigingen zijn na de verificatie weer volledig teruggedraaid;
alleen de illustratie-bestanden zelf zijn onderdeel van deze commit.

**Verfijning: voortgangsbalken bij voedingsdoelen.**

*Wat er veranderde.* Nieuwe pure `src/lib/nutrientProgress.ts`
(`describeNutrientProgress(current, target, unit)`) berekent geen nieuwe
voedingswaarden — puur een weergaveregel bovenop de al bestaande
`calculateNutritionTargets`/`summarizeDay`-uitkomst: het gevulde
percentage (capped op 100%), of het doel overschreden is, en een
concreet restant-label ("nog 800 kcal") of overschrijdings-label ("12g
boven doel") in plaats van alleen een percentage of een negatief getal.
`NutrientProgressBar.tsx` is herbouwd op deze functie: toont het restant
altijd als tekst (nooit alleen balklengte — de toegankelijkheidseis uit de
opdracht), en kreeg een `size="large"`-variant voor de calorieënbalk zodat
die prominenter is dan de drie macrobalken eronder (groter lettertype,
dikkere balk). `app/(tabs)/nutrition.tsx` groepeert de drie macrobalken nu
visueel onder de grotere calorieënbalk.

*Kleurkeuze.* Nieuwe `colors.progress` (neutraal blauw) in
`theme/colors.ts` voor de normale vulling — bewust niet
`colors.accent`/`warning` (groen/oranje), want die kleuren betekenen al
iets anders elders in de app (de hersteltoestand-kleuren van het
lichaamsdiagram: herstellend/venster-sluit/hersteld) en zouden op het
voedingsscherm verwarrend hergebruikt zijn voor een compleet ander begrip.
Bij overschrijding van het doel schakelt de balk (en het label) naar
`colors.danger` — dit is géén hergebruik van de hersteldiagram-kleuren
zelf, maar dezelfde bestaande "er is iets mis"-betekenis die `colors.danger`
al overal elders in de app heeft (bijv. formuliervalidatie), dus consistent
met het designsysteem in plaats van een nieuwe, losse betekenis.

*Tests.* Nieuw `nutrientProgress.test.ts` (6 tests): niets gegeten geeft
het volledige doel als restant, een gedeeltelijke balk geeft het juiste
percentage én concrete restant, exact op doel geeft "nog 0" (nog geen
overschrijding), overschrijding capt de balk op 100% en toont een
"boven doel"-label in plaats van een negatief restant, afronding van
kommagetallen, en een randgeval met doel ≤ 0 crasht niet.

*Verificatie.* Zelfde aanpak als bij het lichaamsdiagram: een tijdelijke
ongeauthenticeerde previewroute met de balken in verschillende scenario's
(leeg, gedeeltelijk, exact op doel, ver over doel), web-export, en een
Playwright-screenshot — bevestigd dat de balken, kleuren en labels er
correct uitzien, geen consolefouten. Achteraf volledig teruggedraaid;
maakt geen deel uit van deze commit.

**Bugfix (na stap 10): "Failed to fetch" bij voedsel zoeken op de
webversie.**

*Diagnose (bevestigd).* `src/lib/openFoodFacts.ts` riep
`world.openfoodfacts.org` rechtstreeks vanuit clientcode aan — een
cross-origin `fetch()` vanuit de browser waar Open Food Facts geen CORS
voor deze origin voor teruggeeft, dus de browser blokkeert de request vóór
er een response terugkomt. De destijds al gedocumenteerde kanttekening
("`User-Agent` wordt door de browser stilzwijgend laten vallen") was hier
niet eens de kern van het probleem — CORS blokkeert de request al eerder,
dus zelfs een geslaagde header-configuratie had dit niet opgelost. Bewijs:
alleen client-side code deed de fetch, er was geen server-side tussenstation.

*Fix: server-side proxy via een Supabase Edge Function (niet Vercel).*
Geen bestaande Vercel-configuratie, API-routes of Next.js in deze repo —
het is een statische Expo-webexport. De hele backend is al Supabase
(auth, RLS, migraties, CI), en een Edge Function is straks identiek
bereikbaar voor zowel web als native via dezelfde `supabase-js`-client,
in tegenstelling tot een Vercel-only API-route. Nieuwe
`supabase/functions/food-proxy/index.ts` (Deno):
- Neemt twee requesttypes aan (`{type:'product', barcode}` /
  `{type:'search', query}`), stuurt door naar de juiste OFF-endpoint (v2
  product-lookup resp. v1 zoeken), en zet de beschrijvende `User-Agent`
  hier server-side, waar hij daadwerkelijk effect heeft.
- Forwardt de JWT van de aanroeper naar zijn eigen Supabase-client in
  plaats van de service-role-key te gebruiken — `food_products`'s RLS stond
  al toe dat elke ingelogde gebruiker leest/schrijft (het is een gedeelde,
  niet-persoonlijke cache van publieke OFF-data), dus dit is exact
  hetzelfde toegangsniveau als een directe client-write, alleen via de
  proxy.
- Cachet: een barcode-opvraging checkt `food_products` eerst en roept OFF
  alleen aan bij een cache-miss; een zoekopdracht schrijft elk gevonden
  product weg in diezelfde cache, zodat een latere barcode-scan van een van
  die producten al een cache-hit is (breidt de al geplande caching uit naar
  het zoekpad, zoals gevraagd).
- Retourneert exact dezelfde OFF-vormgegeven JSON als voorheen (`{status,
  product}` / `{products}`), dus de bestaande `parseProduct()`/
  `parseNutriments()`-parsing in `openFoodFacts.ts` hoefde niet te
  veranderen — alleen wélke URL aangeroepen wordt.
- Zet CORS-headers op elke response, inclusief foutresponses, en geeft een
  nette Nederlandse foutmelding terug bij een mislukte upstream-call in
  plaats van de rauwe fetch-fout door te laten.

*Bewuste keuze: geen server-side rate limiter.* De opdracht noemde dit
optioneel ("eventueel"). Een edge-function draait op gedistribueerde,
stateless instanties — een in-memory teller zou geen betrouwbare,
project-brede limiet geven, alleen schijnzekerheid. In plaats daarvan
blijft de bestaande, al geteste client-side `canSearchNow()`-throttle de
verdediging tegen te snel achter elkaar zoeken, aangevuld met de
`food_products`-cache die herhaalde barcode-opvragingen sowieso al buiten
OFF om afhandelt.

`openFoodFacts.ts` roept nu `supabase.functions.invoke('food-proxy', ...)`
aan (dezelfde client als de rest van de app, inclusief automatische
auth-header) in plaats van een handmatige `fetch()` met timeout — de
timeout-logica verviel, consistent met hoe geen andere Supabase-aanroep in
de app een eigen timeout heeft. `.github/workflows/supabase-migrations.yml`
(hernoemd naar "Deploy Supabase migrations and edge functions") kreeg een
extra stap (`supabase functions deploy food-proxy`) en een extra
path-trigger (`supabase/functions/**`), zodat de functie automatisch
meegaat bij een merge naar main — zelfde automatiseringsprincipe als de
migratie-pipeline uit een eerdere sessie ("code in de repo die nooit
gedeployed wordt lost niets op").

*Tests.* Nieuw `openFoodFacts.test.ts` (10 tests, zelfde
hand-rolled-mock-patroon als `switchGoal.test.ts`): bevestigt dat de
proxy wordt aangeroepen met het juiste requesttype (nooit meer OFF
rechtstreeks), dat een gevonden product correct wordt geparsed, dat een
`status:0`-barcode `null` geeft (geen fout), dat een mislukte
functie-invoke een nette Nederlandse foutmelding geeft in plaats van de
rauwe fetch-fout, dat de proxy's eigen foutbericht wordt doorgegeven, dat
meerdere zoekresultaten correct parsen, dat een lege zoekopdracht
helemaal geen aanroep doet, en dat resultaten zonder barcode worden
overgeslagen in plaats van te crashen. De Deno-functiecode zelf heeft geen
directe testdekking (geen Deno-testrunner in deze repo, buiten scope om
toe te voegen voor deze bugfix) — de contractvorm (requestshape,
responseshape) is wel dichtgetimmerd via de client-tests hierboven.
**Handmatige verificatie na deploy is nog nodig**: zoeken op "Kwark" op de
live webbuild controleren zodra deze PR gemerged en de CI-deploy geslaagd
is.

**Vervolgbugfix: zoeken gaf 0 resultaten (geen fout meer) na deploy.**

*Diagnose (bevestigd, niet gegokt).* De live `food-proxy`-logs (Supabase
Dashboard → Edge Functions) toonden voor een echte zoekaanroep een
`POST | 502`-response — de functie zelf draaide en werd bereikt, maar het
`fetch()` naar Open Food Facts binnen de functie faalde. De app-code zelf
bleek géén stille foutafhandeling te hebben (`app/food-search.tsx` toont
`error` gewoon in de UI bij een gegooide fout) — punt 4 uit de
diagnosestappen viel dus af. Onderzoek naar de OFF-kant (via externe
bronnen, want dit sandbox-netwerk staat geen directe calls naar
`openfoodfacts.org` toe): Open Food Facts heeft de legacy v1
zoek-endpoint (`cgi/search.pl`, wat deze functie gebruikte) inmiddels
losgelaten — deze retourneert nu wereldwijd 5xx (bevestigd door een
onafhankelijk, extern gerapporteerd issue met exact hetzelfde symptoom).
`/api/v2/product/{barcode}.json` (gebruikt voor barcode-opzoeken) bleef
wel gewoon werken — dat verklaart waarom alleen zoeken kapot was en
barcode-scannen niet. Geen mismatch in de response-parsing en geen
verkeerd endpoint-gebruik in de oorspronkelijke code — puur een endpoint
dat aan de OFF-kant is uitgefaseerd.

*Fix.* `handleSearch()` in `supabase/functions/food-proxy/index.ts` roept
nu de nieuwe, door Open Food Facts zelf aangewezen vervanger aan:
`GET https://search.openfoodfacts.org/search` (search-a-licious,
Elasticsearch-gebaseerd) met `q`/`page_size`/`langs`-parameters in plaats
van `cgi/search.pl`'s `search_terms`/`search_simple`/`action`. De
resultatenlijst zit hier onder `hits` in plaats van `products`, maar elke
hit is nog steeds hetzelfde ruwe productdocument (`code`, `product_name`,
`nutriments`, ...) — de proxy leest dit uit en geeft nog altijd
`{products: [...]}` naar de client terug, dus `openFoodFacts.ts` en de
bestaande tests hoefden niet te veranderen. De bestaande
error/lege-staat-scheiding (nette foutmelding bij een niet-ok upstream-
response versus een leeg `products`-array bij écht geen resultaten) stond
al goed in de code — dat hoefde niet gerepareerd te worden, alleen het
endpoint eronder.

*Test (regressiebescherming).* Er is geen Deno-testrunner in deze repo
(bewuste eerdere keuze), dus in plaats daarvan kreeg
`.github/workflows/supabase-migrations.yml` een nieuwe stap, "Smoke test
food search", die na elke deploy de live edge function écht aanroept met
een bekende zoekterm ("Kwark") en de build laat falen als de response
geen 200 is of een leeg `products`-array bevat. Dit vangt zowel een
regressie in onze eigen code als een volgende breaking change aan de
OFF-kant — precies de klasse fout die deze keer onopgemerkt bleef omdat
de deploy zelf wél slaagde.

**Dashboard ("Vandaag") samenvoegen.**

*Layout.* Header (ongewijzigd), dan streak + weekoverzicht-strip
(`WeekOverview.tsx`), dan de bestaande week-review-banner (alleen zichtbaar
als er een openstaande weekevaluatie is), dan vier samenvattingskaarten
(training/voeding/progressie/readiness). Onder 700px breed staan de vier
kaarten onder elkaar; daarboven een 2×2-grid (`useWindowDimensions`,
zelfde patroon als de breedte-afhankelijke grafiekbreedte in
Progressie). Elke kaart is zelf de tik-ingang naar zijn volledige pagina
(`Card`'s eigen `onPress`, geen geneste knop) — geen los "bekijk meer"-
element nodig.

*Architectuurkeuze: zelf-ophalende kaarten, niet één centrale `load()`.*
Elke bestaande screen in deze app haalt zijn data centraal op (één
`load()` + `Promise.allSettled`) en rendert pas als dat klaar is — maar de
opdracht vroeg expliciet om onafhankelijke laadstatussen per kaart, zodat
een trage voedingsquery niet de rest blokkeert. Dat is met één centrale
`load()` niet eerlijk te bouwen (elke sectie zou op de traagste wachten).
Daarom hebben `TrainingTodayCard`/`NutritionSummaryCard`/
`ProgressSummaryCard`/`ReadinessCard` elk hún eigen fetch + laad-/
foutstatus, via `useFocusEffect` (zelfde ververs-bij-focus-patroon als
elders). Dit is een bewuste, geïsoleerde uitzondering op "componenten zijn
presentational, screens halen data op" — expliciet hier genoteerd zodat
het niet als inconsistentie oogt. Alle vier delen wel hetzelfde
`DashboardCardShell.tsx` (kop met icoon, laad-/foutstatus, content, CTA-
regel) zodat ze ondanks de aparte databronnen visueel één systeem blijven,
zoals gevraagd. Elke kaart hergebruikt uitsluitend al bestaande
fetch-functies (`fetchActiveProgram`, `fetchWeeklyVolume` +
`fetchMonthlyWorkoutCount`, `fetchAllMuscleGroupRecoveryEstimates`,
`computeUserNutritionTargets` + `fetchFoodLogsForDate`) — geen nieuwe
berekeningslogica, zoals de opdracht vereiste.

*0a/0b — Streak en weekoverzicht: waarom weken, geen dagen.* De opdracht
vroeg om de definitie te laten aansluiten op hoe trainingsdagen al worden
bijgehouden. Dit programma-model rotateert door dag 1/2/3/... op basis van
het totaal aantal voltooide workouts (`fetchActiveProgram`'s
`nextDayOrder`), niet op een vaste kalenderdag-planning — er bestaat dus
geen "woensdag is pushdag"-concept om een gemiste specifieke dag tegen af
te zetten. Een dag-voor-dag "gemiste geplande sessie"-definitie zou een
niet-bestaand due-date-model moeten verzinnen (willekeurig, en dus precies
de "kunstmatige vergoelijking" die de opdracht wil vermijden). In plaats
daarvan hergebruikt de streak dezelfde week-granulariteit als de
adaptatieplanner's eigen therapietrouw-check (`evaluateAdherence` in
`@fitness/adaptation-planner`: voltooide sessies t.o.v. `daysPerWeek` per
week) — nieuwe `src/lib/streak.ts` (`calculateStreak`) telt aaneengesloten,
volledig afgelopen weken waarin het weekdoel is gehaald, terugtellend
vanaf de meest recente afgeronde week; de lopende week telt bewust nergens
in mee (die is nog niet voorbij). Nieuwe `src/lib/weekStrip.ts`
(`computeWeekStrip`) gebruikt exact dezelfde
"weekdoel-gehaald-of-niet"-vraag, maar dan toegepast op de 7
kalenderdagen van de huidige week (ma-zo): elke dag zonder log is
'gemist' als het weekdoel op dat moment nog niet gehaald is en de dag al
voorbij is, 'gepland' als de dag nog moet komen (of vandaag is), en
anders 'rustdag' — zonder te doen alsof bekend is wélke specifieke dag
"had moeten" gebeuren. Beide functies zijn puur en gebouwd op nieuwe
`src/lib/dateWeek.ts`-hulpfuncties (`startOfIsoWeek`/`addDays`/
`isSameLocalDay`/`isBeforeLocalDay`). Data komt van een nieuwe
`fetchWorkoutDates()` in `progressStats.ts` (naast de al bestaande
`fetchLongestStreak`, die een ander, losstaand "langste streak ooit"-
kental blijft voor de Progressie-tab) — gecachet als ISO-strings, niet als
`Date`-objecten, omdat `fetchWithCache` via `JSON.stringify`/`parse`
round-trippt en dat `Date`-instanties bij een cache-fallback-lezing niet
zou reviven.

*Kaart 4 — Readiness: nieuwe volledige-schermroute.* `app/body-diagram.tsx`
(nieuw, modal) rendert dezelfde `BodyDiagram` uit de vorige verfijning op
volledig formaat met eigen databron — de compacte kaart toont alleen een
telling ("N spiergroepen klaar om te trainen") plus een tik-ingang, zoals
de opdracht als alternatief voor een verkleinde illustratie aanbood.

*Consolidatie: drie stukjes bestaande UI zijn vervangen, niet
gedupliceerd.* De opdracht is expliciet een "layout-/samenvoegingsprompt"
— bestaande onderdelen samenvoegen, dus is bewust gekozen om drie
overlappende stukjes van de oude "Vandaag" niet naast de nieuwe kaarten te
blijven tonen:
- De losse "Je {spiergroep} is hersteld"-banner: de Readiness-kaart (en de
  volledige lichaamsillustratie erachter) is nu de ene plek voor
  herstelstatus, in plaats van twee plekken die hetzelfde op net iets
  andere manieren zeggen.
- De losse eiwit-tekort-banner: het signaal zelf (`checkProteinShortfall`)
  is niet verwijderd, maar verplaatst náár de Voeding-kaart zelf (een
  kleine waarschuwingsregel onder de calorieën-/eiwitregel) — nog steeds
  zichtbaar, alleen niet meer als apart, plek-innemend blok op een
  dashboard dat juist compacter moest worden.
- De per-oefening `RecoveryIndicator`-stipjes op de oude, volledige
  dag-kaart: de nieuwe `TrainingTodayCard` toont bewust alleen naam,
  omschrijving en aantal oefeningen (zoals de opdracht vroeg), geen volle
  oefeningenlijst meer. Het onderliggende `RecoveryIndicator.tsx`-component
  had daardoor nergens meer een aanroeper en is verwijderd (ongebruikte
  code, geen nieuwe plek ervoor verzonnen) — herstelstatus per spiergroep
  is nu overal de Readiness-kaart/het lichaamsdiagram, niet twee losse
  weergaven die uit de pas kunnen gaan lopen.

*Tests.* Puur getest, geen React Native-componenttests (zelfde conventie
als de rest van deze codebase): `dateWeek.test.ts` (11), `weekStrip.test.ts`
(9 — quotum-gehaald-dus-rest, quotum-niet-gehaald-dus-gemist/gepland,
vandaag nooit "gemist", meerdere sessies dezelfde dag tellen als één,
andere week wordt genegeerd), `streak.test.ts` (7 — geen historie,
aaneengesloten weken, stopt bij de eerst-tegengekomen tekortweek zonder
oudere goede weken alsnog mee te tellen, lopende week telt nooit mee,
dubbele sessies dezelfde dag geen dubbele credit, `daysPerWeek` ≤ 0 crasht
niet).

*Verificatie.* Zelfde aanpak als de vorige twee verfijningen: een
tijdelijke ongeauthenticeerde previewroute die de echte pure functies
(`computeWeekStrip`/`calculateStreak`) met verzonnen datums en de echte
`DashboardCardShell`/kaartinhoud met vaste testdata rendert (de vier
kaarten doen zelf een live Supabase-aanroep, wat in deze sandbox toch niet
zou lukken — dat is dus code-review + typecheck + de pure-functietests
hierboven, niet een screenshot, die voor de dataverwerking garant staan),
via web-export + Playwright gescreenshot op zowel smalle (telefoon) als
brede (≥700px, 2×2-grid) viewport, inclusief de 'gemist'-dagstatus
apart gecontroleerd. Geen consolefouten. Achteraf volledig teruggedraaid.

**FAQ uitbreiden: categorieën + 19 nieuwe vragen.**

*Categorieën.* `FaqCategory` ging van drie categorieën (`Kracht`/`Herstel`/
`Cardio`) naar de zes gevraagde (`Training & progressie`/`Voeding`/
`Uitvoering & techniek`/`Resultaten & tijdlijn`/`Herstel & leefstijl`/
`Overig`). Alle acht bestaande vragen zijn verplaatst naar
`Training & progressie` — inclusief `supercompensatie` en `deload`, die
inhoudelijk over herstel gaan maar functioneel programmering/periodisering
zijn (dezelfde soort vraag als volume/RIR/doelen), niet leefstijl-herstel
zoals de nieuwe `Herstel & leefstijl`-categorie bedoelt. Het scherm zelf
(`app/faq.tsx`) had **geen enkele wijziging nodig**: de categorie-chips-rij
en `searchFaqEntries()` werkten al generiek over `FAQ_CATEGORIES`/
`FaqCategory` heen (gebouwd in een eerdere sessie met precies dit voor
ogen) — nieuwe categorieën verschijnen vanzelf als extra filterchips,
zoeken werkt vanzelf over alle categorieën heen.

*19 in plaats van 20 nieuwe vragen.* De titel van de opdracht noemde "20
nieuwe vragen", maar de opdracht zelf werkte precies 19 vragen volledig
uit (5 Voeding, 6 Uitvoering & techniek, 3 Resultaten & tijdlijn, 2
Herstel & leefstijl, 3 Overig). In plaats van zelf een 20e vraag te
verzinnen om het genoemde getal te halen — wat zou botsen met "elke bron
gecontroleerd, geen medisch advies zonder onderbouwing" — zijn precies de
19 volledig gespecificeerde vragen gebouwd, en is dit verschil hier
expliciet genoteerd in plaats van stilzwijgend opgevuld.

*Brononderzoek (serieus genomen, niet een formaliteit).* Voor alle ~25
bronnen van de 19 nieuwe vragen is elke URL/titel/auteur/jaar
gecontroleerd (net als bij de oorspronkelijke acht vragen, zie de opmerking
bovenaan dit bestand over de eerder gevonden PMC11679080-mismatch). Vier
echte fouten in de door de opdracht aangeleverde bronvermeldingen zijn
hersteld:
- **Anaboolvenster-vraag**: de opgegeven URL (`tandfonline.com/.../1550-2783-10-53`)
  wees naar een ander, bestaand artikel (Schoenfeld/Aragon/Krieger over
  eiwit-timing-en-kracht) door een tikfout in de DOI (een extra "3").
  Vervangen door de daadwerkelijke Aragon & Schoenfeld (2013)
  "anabolic window"-publicatie (PMC3577439).
- **Resultaten-tijdlijn-vraag**: de opgegeven bron ("Damas et al.") stond
  op een niet-officiële PDF-spiegel (een privésite) en de auteursnaam
  klopte niet met het opgegeven artikel. Het daadwerkelijke artikel bij die
  titel is DeFreitas, Beck, Stock, Dillon & Kasishke (2011) — vervangen
  door de officiële PubMed-vindplaats.
- **Plateaus-vraag**: de opgegeven auteurs ("Lorenz & Morrison, 2015")
  klopten niet bij het meegegeven PMC-artikel; dat artikel is daadwerkelijk
  Evans (2019), zelfde titel. Auteur/jaar gecorrigeerd, URL bleef correct.
- **Leeftijd-en-training-vraag**: de placeholder-brontitel is vervangen
  door de daadwerkelijke titel/auteurs van het artikel achter de gegeven
  ScienceDirect-URL (Hawley, Bell, Huang, Gibbs & Churchward-Venne, 2023).

  Daarnaast zijn een paar kleinere onnauwkeurigheden gecorrigeerd
  (jaartallen bij de Harvard Health- en InBody-bronnen bleken de
  laatst-herziene datum 2026 te zijn, niet een ouder jaar; twee
  publicatietitels misten een paar woorden t.o.v. de echte titel;
  de slaap-vraag miste een van de twee opgegeven bronnen in de eerste
  versie, nu toegevoegd). Zie de git-historie van `faqContent.ts` voor het
  volledige verificatieproces.

*Tests.* Twee nieuwe checks in `faqContent.test.ts` die specifiek tegen
categorie-drift bewaken (niet alleen relevant voor content, maar voor de
'geen lege filtertab'-eis uit de opdracht): elke `FAQ_ENTRIES`-categorie
moet een geldige `FAQ_CATEGORIES`-waarde zijn, en elke `FAQ_CATEGORIES`-
waarde moet minstens één vraag hebben.

*Verificatie.* Screenshot-geverifieerd via dezelfde tijdelijke-previewroute-
aanpak als eerder — in dit geval extra eenvoudig omdat `app/faq.tsx` geen
Supabase-afhankelijkheid heeft, dus de previewroute rendert het échte
scherm 1-op-1 (`export { default } from './faq'`), niet een los mockje.
Bevestigd: alle 6 categorie-chips tonen correct, filteren op "Voeding"
toont precies de 5 verwachte vragen, een vraag uitklappen toont antwoord/
app-uitleg/bronnen in het bestaande format, en zoeken op "DOMS" (met
"Alle" geselecteerd) vindt beide vragen die dat onderwerp raken across
categories heen (Uitvoering & techniek + Overig). Geen consolefouten.
Achteraf volledig teruggedraaid.

**Readiness als herstelringen (vervangt het lichaamsdiagram).**

*Waarom.* Het anatomische lichaamsdiagram uit stap 11 (en de daaropvolgende
verfijning) is volledig vervangen door een grid van cirkelvormige
voortgangsringen, één per spiergroep, in de stijl van Apple Watch
activiteitsringen — puur data-gedreven, geen illustratie nodig. De
onderliggende herstellogica (`estimateRecoveryState` in
`@fitness/progression-engine`) is volledig ongewijzigd; dit is uitsluitend
een vervanging van de visuele laag.

*Ringvulling is monotoon, kleur draagt de urgentie.* Nieuwe
`recoveryReadinessPercent()` (`src/lib/recoveryReadiness.ts`) loopt van 0%
naar 100% uitsluitend tijdens de `'recovering'`-fase (evenredig met
`hoursSinceSession / windowStartHours`) en blijft daarna voorgoed op 100%
staan (`ready`/`window_closing`/`window_passed`/`no_data`) — fysiologisch
"herstelt" een spier nooit terug naar minder hersteld. Verdere nuance (bv.
"het venster sluit bijna") wordt uitsluitend via de al bestaande
`recoveryColor()` uitgedrukt, ongewijzigd hergebruikt, niet opnieuw
geïnterpreteerd — ook `no_data` blijft bewust groen (klaar om te trainen),
zoals eerder vastgesteld, ook al noemde de opdracht losjes "grijs voor lang
niet getraind"; dat klopt feitelijk bij `window_passed`, niet bij
`no_data`.

*Sorteervolgorde: venster-sluit boven gewoon-klaar.* Nieuwe
`compareMuscleRecoveryPriority()` zet `window_closing` bóven `ready` in de
"wat nu te doen"-volgorde, ook al vullen beide de ring voor 100% — een
sluitend venster is tijdgevoelig (nu trainen of de bonus missen), gewoon
klaar niet. Binnen `recovering` sorteert de spiergroep die het dichtst bij
zijn venster zit het hoogst.

*Herbruikbare ring + tegel.* `RecoveryRing.tsx` is de generieke SVG-ring
(`stroke-dasharray`/`stroke-dashoffset`, geroteerd -90° zodat de vulling om
12 uur begint) die alleen percentage en kleur als props neemt.
`MuscleRecoveryRing.tsx` combineert ring + spiergroepnaam + statuslabel tot
één tegel (kleur is nooit de enige informatiedrager, zelfde eis als
eerder). `onPress` is bewust optioneel: in het volledige grid
(`app/readiness.tsx`) opent elke tegel de tik-kaart, maar in de compacte
dashboardkaart (`ReadinessCard.tsx`) is de hele kaart al één tikdoel
(`DashboardCardShell`) — een tweede geneste `Pressable` per ring daarbinnen
zou React Native's aanraakafhandeling in de weg zitten, dus zonder
`onPress` rendert de tegel als platte `View`.

*Plaatsing.* `app/readiness.tsx` (nieuw, vervangt `app/body-diagram.tsx`)
toont het volledige grid, gesorteerd op prioriteit, plus legenda en
tik-kaart (laatst getraind, statuslabel, actuele uitleg, link naar de FAQ
over supercompensatie). `ReadinessCard.tsx` is herschreven om de 4 hoogst
geprioriteerde ringen compact te tonen i.p.v. de eerdere "N spiergroepen
klaar"-telling, met dezelfde "hele kaart is het tikdoel"-navigatie naar
`/readiness`.

*Opgeruimd.* `BodyDiagram.tsx`, `bodyDiagramRegions.ts` (+ test) en
`app/body-diagram.tsx` zijn verwijderd — geen andere plek in de codebase
verwees er nog naar. `describeRegionTap()`/`RegionTapInfo` zijn behouden
(de output, niet de SVG-geometrie, was nog relevant) en hernoemd naar
`describeMuscleRecoveryTap()`/`MuscleRecoveryTapInfo` in het nieuwe
`recoveryReadiness.ts`.

*Tests.* 14 nieuwe tests in `recoveryReadiness.test.ts`:
`recoveryReadinessPercent` (0% net getraind, 50% halverwege, nooit boven
100%, altijd 100% buiten `recovering`), `recoveryRingLabel` (het
"18u te gaan"-format uit de opdracht zelf, nooit negatief, valt terug op
`STATUS_LABEL` voor elke andere status), `describeMuscleRecoveryTap`
(overgenomen van de oude `describeRegionTap`-tests) en
`compareMuscleRecoveryPriority` (venster-sluit boven klaar, klaar boven
geen-data boven herstellend, venster-voorbij altijd laatst, binnen
herstellend op afstand-tot-venster).

*Verificatie.* Via dezelfde tijdelijke-previewroute-aanpak als eerder
(`app/_readiness-preview.tsx`, geregistreerd in `app/_layout.tsx`, web-
export + Playwright-screenshot, achteraf volledig teruggedraaid) met
gefabriceerde `RecoveryEstimate`-waarden voor alle vijf statussen:
ringvulling en -kleur kloppen per status, de compacte 4-ringen-rij en het
volledige 10-ringen-grid tonen beide de juiste sortering, en tikken op een
ring (getest op "Rug", status `recovering`) toont de juiste tik-kaart met
statuslabel en actuele uitleg. Geen consolefouten.

**Dynamische supercompensatie-curve boven de legenda.**

*Wat.* Direct boven de kleurenlegenda op het readiness-scherm toont een
lijngrafiek het klassieke supercompensatie-verloop (dip → herstel → piek →
geleidelijke terugval) voor de geselecteerde spiergroep: een dip vlak na de
training, een stijging terug door de basislijn zodra het venster opent, een
piek binnen het venster (gearceerd), en daarna een geleidelijke terugval als
er niet opnieuw getraind wordt. Standaard toont de grafiek de bovenste
spiergroep uit dezelfde `compareMuscleRecoveryPriority`-sortering die het
grid al gebruikt; tikken op een ring in het grid werkt zowel de bestaande
tik-kaart als deze grafiek bij (gedeelde `curveMuscleGroupOverride`-state),
met een subtiele fade-overgang. Onder de grafiek staat dezelfde
statuslabel/uitleg als het tik-kaartje, plus een vaste notitie dat dit een
vereenvoudigd model is, met een link naar de FAQ.

*Recharts bleek geen goede match — bewust afgeweken van de opdracht.* De
opdracht noemde recharts als "al beschikbaar", maar dat klopt niet voor deze
codebase: recharts is geen dependency (`npm ls recharts` geeft niets terug),
en het is bovendien een React-DOM-bibliotheek die niet op React Native's
renderer draait — bruikbaar op de web-export, niet op een native
iOS/Android-build, en deze app is nadrukkelijk geen web-only Expo-project.
In plaats daarvan hergebruikt de grafiek exact hetzelfde patroon als het al
bestaande `LineChart.tsx` (afhankelijkheidsvrije `react-native-svg`,
zelfgebouwde schaalfuncties): nieuwe `RecoveryCurveChart.tsx`.

*`generateRecoveryCurve` neemt een `RecoveryEstimate`, geen ruwe sessie —
bewust afgeweken van de letterlijke functiehandtekening uit de opdracht.*
De opdracht suggereerde `generateRecoveryCurve(muscleGroup, lastSession)`.
Maar `windowStartHours`/`windowEndHours` zijn al de volledig
gewichtaangepaste uitkomst van `estimateRecoveryState`'s eigen
`heavinessMultiplier`-berekening (sessiezwaarte, RIR, sets, compound-lift,
soreness/slaap zitten er al in verwerkt) — een curve die in plaats daarvan
de ruwe sessie opnieuw zou verwerken, zou die berekening dupliceren en kon
op termijn uit de pas gaan lopen met `estimateRecoveryState` zelf. Door
`generateRecoveryCurve(muscleGroup, estimate: RecoveryEstimate)` te bouwen
(nieuw `packages/progression-engine/src/recoveryCurve.ts`) is de curve
letterlijk afgeleid van dezelfde estimate die de ring en de tik-kaart al
tonen: het "nu"-punt kopieert `estimate.status`/`hoursSinceSession` één op
één, in plaats van een tweede, mogelijk afwijkende classificatie te maken.
Dit voorkomt ook dat ruwe sessiedata (RIR, sets, compound-lift) helemaal tot
in de UI-laag zou moeten worden doorgegeven — `fetchAllMuscleGroupRecoveryEstimates`
geeft toch al alleen `RecoveryEstimate`s terug, geen ruwe sessies.

*Monotone curve-vorm, cosmetische kleurclassificatie.* De curve zelf (dip →
basislijn → piek → afvlakking) is met de hand ontworpen als vaste,
illustratieve vorm (cosinus-easing tussen een handvol ankerpunten,
tijdschaal afgeleid van `windowStartHours`/`windowEndHours`) — geen
statistisch model, consistent met hoe de opdracht dit zelf beschrijft
("geïllustreerd, vereenvoudigd model"). Elk gesampled punt krijgt ook een
eigen fase-classificatie (`illustrativeStatus()`) voor de segment-kleuring
langs de lijn (rood→oranje→groen via de bestaande, ongewijzigde
`recoveryColor()`) — deze classificatie dupliceert bewust
`estimateRecoveryState`'s drempels (inclusief de afronding van
`windowClosingStartHours`) maar wordt **nooit** gebruikt voor het "nu"-punt
zelf, juist om te voorkomen dat een afrondingsverschil op een
grenswaarde de curve tegen de ring/tekst zou laten ingaan bij het enige
punt dat er echt toe doet.

*Tests.* 7 nieuwe tests in `recoveryCurve.test.ts`: duidelijke dip met "nu"
dicht bij het dieptepunt vlak na een sessie, "nu" bij de piek binnen het
ready-venster, "nu".status komt voor alle vijf mogelijke statussen exact
overeen met de brontoestand (nooit een tegenspraak), "nu" staat precies op
`estimate.hoursSinceSession` (nooit herberekend), "nu" blijft altijd binnen
het gesample bereik (ook ver na `window_passed`), en determinisme (zelfde
estimate erin = zelfde curve eruit).

*Verificatie.* Via dezelfde tijdelijke-previewroute-aanpak (ditmaal een
volledige kopie van het readinessscherm met gefabriceerde data voor alle
vijf statussen, achteraf teruggedraaid): curve-vorm en kleur kloppen per
status, "nu"-label en basislijn-label overlappen nooit (twee rondes
gescreenshot — de eerste ronde toonde tekstoverlap/-afknipping bij `no_data`
en bij een net-getrainde spiergroep dicht bij de linkerrand, opgelost door
het "nu"-label en het basislijn-label altijd tegenover elkaar te verankeren
in plaats van beide links), en tikken op een ring in het volledige grid
werkt zowel de tik-kaart als de curve consistent bij (getest op "Triceps",
status `window_passed` — curve toont de afgevlakte staart dicht bij de
basislijn, precies zoals de status "voorbij" beschrijft). Geen
consolefouten.

**Correctie: vorm en vulkleuren van de supercompensatie-curve.**

*Wat er niet goed was.* De eerste versie van de curve begon al ín de dip op
t=0 (in plaats van op de basislijn te starten en er daarna pas vanaf te
zakken), had een ongelijke dip-diepte/piek-hoogte (20 vs. 15), en de duur
van fase 3+4 (herstel-tot-piek-tot-terugval) was losgekoppeld van fase 1+2
(`we+(we-ws)*1.2` i.p.v. gekoppeld aan `ws`). Dit is een gerichte correctie
van uitsluitend de wiskundige curve-vorm en de vulkleuren — de grafiek zelf,
de koppeling aan de spiergroep-ringen, de "nu"-marker en de tik-interactie
zijn ongewijzigd blijven werken.

*Nieuwe vorm — één doorlopende lijn, vier fases, symmetrisch.*
`generateRecoveryCurve()` (`packages/progression-engine/src/recoveryCurve.ts`)
gebruikt nu vijf ankerpunten in plaats van vier: `(0, basislijn)` →
`(troughHours, dipLevel)` → `(windowStartHours, basislijn)` →
`(peakHours, peakLevel)` → `(decayEndHours, basislijn)`. Fase 1+2 (dip, terug
naar basislijn) duurt exact `D = windowStartHours`; fase 3+4 (piek, terug
naar basislijn) duurt ook exact `D`, in twee gelijke helften gesplitst
(`peakHours = windowStartHours + D*0.5`, `decayEndHours = windowStartHours + D`)
— dus fase 3+4 samen even lang als fase 1+2, zoals gevraagd. Dip-diepte en
piek-hoogte zijn nu gelijk (`AMPLITUDE = 20` voor beide, in plaats van eerder
20 vs. 15). `peakHours`/`decayEndHours` zijn nieuwe velden op `RecoveryCurve`
zodat de UI-laag deze grenzen leest in plaats van ze zelf opnieuw te
berekenen (zelfde "geen tweede, mogelijk afwijkende berekening"-principe als
bij het "nu"-punt). De gesamplede punten bevatten nu ook altijd exact de
ankertijden (naast de reguliere vaste-interval-sampling), zodat de
vulgebieden in de UI-laag precies op deze grenzen kunnen knippen zonder zelf
te hoeven interpoleren.

*Vulkleuren — oppervlak tussen lijn en basislijn, niet langer een
tijdvak-rechthoek.* De oude `Rect` die het venster `[windowStartHours,
windowEndHours]` als vlak markeerde is vervangen door drie polygonen die het
gebied tussen de curve en de basislijn zelf vullen: het dip-gebied (fase
1+2, onder de basislijn) met `colors.warningMuted` ("verlies"/oranje), het
piek-opbouw-gebied (fase 3, van `windowStartHours` tot `peakHours`, boven de
basislijn) met `colors.accentMuted` ("winst"/groen), en het terugval-gebied
(fase 4, van `peakHours` tot `decayEndHours`) met een nieuwe SVG
`LinearGradient` die dezelfde groene kleur laat uitdoven naar transparant —
de "uitdovende, lichte variant" die de opdracht als alternatief voor "geen
vulling" noemde. De bestaande rood/oranje/groen-lijnkleur per punt-status
(via `recoveryColor()`, ongewijzigd) blijft daar bovenop getekend staan.

*Tests.* De twee vorm-specifieke tests zijn herzien (het "net getraind"-
scenario gebruikt nu een uur dat écht in de nieuwe dip valt, in plaats van
het oude uur dat bij de nieuwe vorm bijna nog op de basislijn zou liggen) en
5 nieuwe tests toegevoegd die de vier-fasen-vorm zelf bewijzen: start exact
op de basislijn bij uur 0, dip onder de basislijn met terugkeer naar de
basislijn op precies `windowStartHours`, piek boven de basislijn met
terugkeer naar de basislijn op precies `decayEndHours`, dip-diepte en
piek-hoogte binnen 0,01 van elkaar, en fase 3+4-duur exact gelijk aan fase
1+2-duur. 12 tests in totaal in `recoveryCurve.test.ts` (was 7).

*Verificatie.* Zelfde tijdelijke-previewroute-aanpak, dit keer specifiek
gericht op de vorm: voor een net-getrainde spiergroep begint de curve zichtbaar
op de basislijn en zakt daarna pas in de dip (rode "nu"-stip vlak bij het
begin, niet meer al in het dieptepunt); voor alle vijf statussen zijn beide
vulkleuren duidelijk te onderscheiden (oranje onder, groen boven, met een
zichtbare uitdoving richting het einde); voor `no_data` blijft de curve
terecht een platte lijn zonder vulling (geen fase om te vullen). Geen
consolefouten.

**Bugfix: witte balk zichtbaar tijdens scrollen (web).**

*Root cause.* Via DOM-inspectie (Playwright, computed styles per laag) bleek
er een lichtgrijze `rgb(242, 242, 242)`-achtergrond te zitten op een div
tussen `#root` en onze eigen, correct donker gestylede content — exact
React Navigations `DefaultTheme`-achtergrondkleur. Expo Router (SDK 57)
gebruikt intern nog steeds `@react-navigation/native`'s `NavigationContainer`
(met die lichte `DefaultTheme` als harde default, nooit overschreven), maar
staat sinds SDK 56 niet meer toe dat app-code zelf `@react-navigation/native`
importeert (Metro gooit een expliciete foutmelding — geprobeerd en bevestigd:
een `ThemeProvider`/`DarkTheme`-import brak de build direct). Onderzoek in
`node_modules/expo-router` (o.a. `ExpoRoot.js`, `fork/NavigationContainer.js`,
`layouts/StackClient.d.ts`) bevestigde dat er in deze versie geen publieke,
ondersteunde manier is om die interne theme-achtergrond vanuit app-code te
overschrijven — `Stack`'s `screenOptions`-functie kan het huidige thema wel
*lezen*, maar niet instellen. Deze lichtgrijze laag is normaal onzichtbaar
(onze eigen `contentStyle`/`Card`-achtergronden dekken hem af in rust), maar
kan tijdens de rubber-band/bounce-animatie van momentum-scrollen (met name
trackpad-scrollen op macOS/desktop) heel even doorschemeren als de content
voorbij zijn eigen grenzen overschiet.

*Fix — de bounce voorkomen in plaats van de onbereikbare laag overschilderen.*
Omdat de onderliggende kleur niet aan te passen is, is in plaats daarvan de
bounce-animatie zelf uitgezet: nieuwe `useDisableWebOverscrollBounce()`-hook
in `app/_layout.tsx` injecteert web-only (via `Platform.OS`) één globale
`<style>`-regel (`* { overscroll-behavior-y: contain; }`) bij het opstarten
van de app. `overscroll-behavior` is een no-op op elementen die zelf geen
scroll-container zijn, dus breed toepassen is veilig — het voorkomt zowel de
rubber-band-overshoot (waar het zichtbare gat vandaan kwam) als het
doorketenen van scroll naar een ouder-element.

*Wat overwogen en verworpen is.* Een `app/+html.tsx` (Expo Routers
mechanisme om de root-`<html>`/`<body>` op web aan te passen, incl.
`ScrollViewStyleReset`) is eerst gebouwd, maar bleek voor deze `web.output`-
instelling (geen `"static"`) helemaal niet te worden toegepast — de
geëxporteerde `index.html` bleef de standaard Expo-template, ongeacht het
bestand. `web.output: "static"` alsnog aanzetten om dit te forceren is
bewust niet gedaan: dat is een grotere architectuurwijziging (van SPA naar
per-route statische HTML) dan deze gerichte bugfix rechtvaardigt, en had het
daadwerkelijke probleem (een laag diep binnen `#root`, niet het `<html>`/
`<body>`-niveau) sowieso niet geraakt.

*Verificatie.* De exacte rubber-band-bounce is niet visueel te reproduceren
in deze sandbox (headless Chromium op Linux simuleert geen macOS/iOS-
scrollfysica), dus is in plaats daarvan geverifieerd dat de fix daadwerkelijk
actief is: via Playwright bevestigd dat de `<style>`-regel na het laden in
`document.head` staat en dat `getComputedStyle(document.body).overscrollBehaviorY`
`"contain"` teruggeeft (was `"auto"`), zonder consolefouten en zonder
visuele regressie op het (uitgeteste) inlogscherm.

**UI/UX-expertpas over de hele app.** Een pure polish-pass — geen wijziging
aan trainingslogica, voedingsberekeningen, databaseschema of welke schermen
er bestaan, uitsluitend hoe alles eruitziet en aanvoelt. Uitgevoerd in de
volgorde audit → design-tokens verscherpen → consistent toepassen →
microcopy → toegankelijkheid → zelfkritiek.

*Audit (kort).* Belangrijkste bevindingen: 9 modal-schermen (week-review,
adjustment-history, exercise-history, switch-goal, faq, food-search,
readiness, e.a.) hadden elk een handmatig nagebouwde "titel + Sluiten"-header
met net iets andere paddings/groottes; sommige tap-targets waren kleiner dan
44px (stepper-knoppen in het schema-scherm op 32×32, losse tekstlinks zonder
`hitSlop`); de dagselector-knop had twee verschillende groottes in onboarding
(52×52) versus profiel (44×44) voor hetzelfde concept; een aantal schermen
met data (readiness, voedingstrend, aanpassingsgeschiedenis, historie) misten
een echte lege-staat en toonden ofwel niets ofwel kale tekst; `colors.progressMuted`
stond gedefinieerd maar werd nergens gebruikt. Geen kleuren droegen dubbele
betekenis: het hersteldrempel-rood/oranje/groen (`recoveryColor.ts`) en de
voedingsbalk-kleur (`colors.progress`, een aparte neutrale blauwtint) waren al
strikt gescheiden van elkaar en van de algemene `accent`/`danger` — bewust
ongemoeid gelaten, inclusief de trainingsadvies-badges (verhogen/verlagen
gewicht) die `accent`/`danger` hergebruiken als een eigen, ander stoplicht-
patroon.

*Eén centraal tokensysteem, aangescherpt in plaats van opnieuw opgebouwd.*
`src/theme/typography.ts` kreeg drie ontbrekende presets (`bodyStrong`,
`captionStrong`, `micro`) naast de zeven die al bestonden, zodat "vetgedrukte
body-tekst" en "kleine bijschriften" niet langer per scherm een eigen
`fontSize`/`fontWeight`-combinatie kregen. Nieuw `src/theme/layout.ts` legt
schermchrome-constantes vast die eerder overal als losse letterlijke waarden
rondzwierven: `tabScreenPaddingTop` (was overal `paddingTop: 48` los
getypt), `modalHeaderPaddingTop`, en `minTapTarget` (44). Kleuren/spacing/
radii-schaal ongewijzigd — die stonden al goed vanuit een eerdere sessie.

*Eén hergebruikte `ModalHeader` in plaats van negen losse implementaties.*
Nieuwe `src/components/ModalHeader.tsx` (titel + "Sluiten"-link met
comfortabele `hitSlop`, optionele subtitel, optionele `right`-slot voor
extra acties) vervangt de handgebouwde header in 7 van de 9 modal-schermen
(`week-review`, `adjustment-history`, `history/[dayExerciseId]`,
`switch-goal`, `faq`, `food-search`, `readiness`). De overige 2
(`workout/[dayId]`, `food-scan`) hebben bewust géén titelrij — hun
headerrij bestaat uit een sluitknop plus statusbadge/geen titel — en zijn
dus niet in `ModalHeader` geforceerd; daar is alleen de sluitknop zelf
naar `layout.minTapTarget` + `hitSlop` gebracht. Diezelfde schermen kregen
ook doorgaans hun kaarten/lege staten/knoppen omgezet naar de bestaande
gedeelde `Card`/`EmptyState`/`Button`-componenten in plaats van losse
`View`/`Pressable`/`Text`-styling.

*Tap-targets.* Stepper-knoppen in het schema-scherm van 32×32 naar 44×44;
de dagselector-knop in profiel van 44×44 naar 52×52 (nu gelijk aan
onboarding, zelfde concept, was eerder toevallig twee groottes); `hitSlop`
toegevoegd aan een reeks losse tekstlinks en icoon-knoppen die eerder geen
enkele vergroting hadden (o.a. "Bekijk alles" op Progressie, FAQ-categorie-
chips, reorder/verwijder-iconen in het schema, sluitknoppen in
`workout/[dayId]` en `food-scan`).

*Lege staten.* Nieuwe `EmptyState`-toepassingen op readiness (had er eerder
géén), voedingstrend, aanpassingsgeschiedenis, oefeninghistorie,
metingen-lijst in profiel en het "nog niets gelogd"-blok in Voeding — elk
met uitnodigende copy in plaats van kale "geen data"-tekst (bv. "Nog geen
hersteldata — Log je eerste training om hier per spiergroep te zien wanneer
je klaar bent voor de volgende sessie" in plaats van niets).

*Microcopy.* Bij controle bleek de bestaande copy al grotendeels consistent
(dit was eerdere-sessiewerk): "Loggen"/"Gelogd" wordt overal voor het
loggen van sets/sessies/maaltijden gebruikt (nooit "Opgeslagen" of
"Toegevoegd" door elkaar), foutmeldingen volgen overal hetzelfde
"Kon [je] X niet laden."/"{Werkwoord} mislukt"-patroon, en nergens kwam
verontschuldigende taal ("Sorry", "helaas") voor. Enige aanpassing: het
gelogde-set-regeltje in `workout/[dayId]` kreeg een expliciet "Gelogd —"-
voorvoegsel in plaats van kaal "Set N: ...", om bevestiging en historie
visueel te onderscheiden.

*Toegankelijkheid.* `colors.textTertiary` (bijschriften, tijdstempels) gaf
een contrastratio van 3.75:1 tegen `colors.surface` — onder de WCAG AA-eis
van 4.5:1 voor normale tekstgrootte. Aangepast van `#6B7684` naar `#808D9E`
(zelfde grijsblauwe karakter, alleen lichter): nu 5.1-5.7:1 tegen
`background`/`surface`/`surfaceElevated`. Eén token, dus de fix geldt overal
tegelijk. Nieuwe `src/lib/useReducedMotion.ts` (wrapper om
`AccessibilityInfo.isReduceMotionEnabled`/`reduceMotionChanged`, werkt ook
op web via de `prefers-reduced-motion`-media query) is gekoppeld aan de
enige twee animaties in de app: de gestaggerde vul-animatie van `StatBars.tsx`
en de fade-transitie van `RecoveryCurveChart.tsx` — bij "reduce motion" aan
verschijnen beide direct in eindstaat. De weekstrip-stippen op "Vandaag"
(`WeekOverview.tsx`) droegen status (getraind/gemist/rustdag) alleen via
kleur en vorm; kregen een `accessibilityLabel` per dag zodat een
schermlezer dezelfde informatie krijgt. Overige kleur-als-signaal-plekken
(hersteldrempel-ringen, voedingsbalken, trainingsadvies-badges) hadden al
overal een tekstlabel naast de kleur.

*Snelle paden.* Gecontroleerd, niet gewijzigd (navigatiestructuur zit buiten
de scope): "Vandaag" → workout loggen is 1 tik (`TrainingTodayCard` opent
`/workout/[dayId]` direct), "Vandaag" → maaltijd loggen is 2 tikken (naar
Voeding-tab, dan Scannen/Zoeken) — beide binnen de gestelde 2-tikken-eis.

*Zelfkritiek + verificatie.* Tijdelijke `app/_uiux-preview.tsx`
("kitchen sink" met alle tokens/componenten: typografieschaal, alle
knopvarianten, kaartvarianten, lege staat, voedingsbalken, hersteldrempel-
ringen, stat-tegels/-balken), geregistreerd in `app/_layout.tsx`, via
`expo export --platform web` + Playwright gescreenshot, geen consolefouten,
daarna volledig teruggedraaid (zelfde tijdelijke-previewroute-aanpak als
eerdere verificaties in dit document). Geen overbodige decoratie
aangetroffen; alle gecontroleerde schermen volgen het tokensysteem.

*Bewust ongemoeid gelaten.* Het herstelstatus-kleursysteem
(`recoveryColor.ts`) is op expliciet verzoek niet aangeraakt, ook niet waar
"herstellend" hetzelfde rood deelt als foutmeldingen/destructieve acties —
dat is een eerder doelbewust ontworpen en getest systeem. Een aantal
letterlijke, niet-tokenized font-groottes in kleinere componenten
(`SelectableCard`, `StatTile`, `WeekOverview`, curve-titels in
`readiness.tsx`) is bewust laten staan waar geen exacte preset paste en de
schermen onderling al consistent waren — voorkeur voor consistentie tussen
schermen boven het elimineren van elk laatste los getal.

*Tests/typecheck.* `npx tsc --noEmit` clean, alle 235 tests slagen (54
progression-engine + 25 adaptation-planner + 25 nutrition-engine + 32
program-generator + 99 root `src/lib`) — geen regressie in bestaande
functionaliteit, zoals vereist door de scope-afbakening van deze pass.

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

### Aannames bij stap 9 (supercompensatie + wetenschappelijke FAQ)

- **Herstelvenster is per spiergroep, niet per trainingsdag**: de opdracht
  bood beide opties ("per spiergroep (of per trainingsdag)"). Per
  spiergroep gekozen omdat een trainingsdag meestal meerdere spiergroepen
  combineert die niet allemaal in dezelfde herstelfase zitten — per
  spiergroep is dus preciezer en dwingt niet tot een kunstmatig
  gemiddelde. Op "Vandaag" tonen we het wel per oefening, zodat je alle
  spiergroepen van de dag naast elkaar ziet.
- **Geen spierpijn/slaap-invoer gebouwd**: de opdracht noemde dit expliciet
  optioneel ("als je die uitvraagt"). `estimateRecoveryState()` accepteert
  `soreness`/`sleepQuality` al (geteste parameters), maar er is nog geen UI
  om ze te loggen — de app geeft ze simpelweg niet mee. Toevoegen later is
  een pure UI/data-toevoeging, geen wijziging aan de functie zelf.
  Zonder deze signalen leunt de schatting volledig op sets/RIR/compound-mix
  uit de al gelogde sets, wat op zichzelf ook al literatuur-onderbouwd is.
- **Basiswindows zijn een startpunt, geen vastgestelde waarheid** — expliciet
  zo gecommuniceerd in zowel de code-comments, de FAQ-vraag over
  supercompensatie, als de banner-tekst op Vandaag ("geschatte venster",
  nooit een harde belofte).
  De multiplier-logica (RIR/sets/compound/spiergroep-grootte) is een
  redelijke, gedocumenteerde aanname, niet uit een specifieke studie
  1-op-1 overgenomen — dat kán ook niet, want de literatuur geeft ranges,
  geen formule.
- **Cardio-herstel niet meegenomen**: de herstelindicator kijkt alleen naar
  `kind = 'strength'`-sets. Cardio-vermoeidheid is een ander soort belasting
  en de opdracht vroeg specifiek om spiergroep-herstel — bewust buiten
  scope gehouden.
- **Elke FAQ-bron is gecontroleerd vóór het schrijven van de content**, niet
  achteraf aangenomen te kloppen. Zie de stap-9-samenvatting hierboven voor
  de twee concrete fouten die dat opleverde (een verkeerd gelabelde bron,
  een samengevoegde dubbele bron) en hoe ze zijn gecorrigeerd.
- **Geen nieuwe dependency voor de FAQ-UI**: inklapbare kaarten en
  categorie-chips zijn met bestaande primitieven (`Card`, `Pressable`,
  `TextInput`) gebouwd, net als de rest van de app.

### Aannames bij stap 10 (voeding — Open Food Facts)

- **BMR voor `gender: 'other'`**: Mifflin-St Jeor is alleen gedefinieerd
  voor man/vrouw. Gekozen voor het gemiddelde van beide formules in plaats
  van iemand met deze invoer uit te sluiten van een doel — een expliciete
  benadering, geen klinisch precieze waarde. Graag bevestigen of bijsturen.
- **Géén losse `nutrition_targets`-tabel**: de opdracht noemde deze als
  optioneel ("hoeft niet perse opgeslagen als de functie snel genoeg is").
  Doelen worden live berekend uit `profiles` + de laatste
  `body_measurements`-rij; geen historie van "wat was mijn doel op moment
  X" wordt bewaard. Als vergelijking-over-tijd van het dóél zelf (niet de
  intake) gewenst is, is dit alsnog toe te voegen.
- **"Opbouwfase" geïnterpreteerd als hypertrophy/strength**: het
  eiwit-tekort-signaal vuurt alleen voor die twee doelen. Bij
  fat_loss/endurance/mixed blijft het uit (eiwit is daar al elders
  geprioriteerd, of niet de primaire hefboom voor dat doel).
  Dagen zonder een enkele logging tellen niet mee als "tekort" — alleen
  dagen met minstens één logging die onder het doel bleven, om iemand die
  simpelweg de app niet opende niet ten onrechte te waarschuwen.
- **Favorieten loggen altijd op 100 g** (één tik): de per-100g-snapshot in
  `food_favorites` heeft geen bijbehorende "standaardhoeveelheid"-veld. Voor
  een andere hoeveelheid gebruikt de gebruiker scannen/zoeken (die wél een
  hoeveelheid-stap tonen). Eenvoudig uit te breiden met een
  `default_quantity_grams`-kolom als 100 g in de praktijk vaak niet klopt.
- **`User-Agent`-header op web**: browsers behandelen `User-Agent` als
  "forbidden header" in `fetch` en laten 'm stilzwijgend vallen — Open Food
  Facts' verzoek om een beschrijvende header wordt dus alleen op native
  (iOS/Android) daadwerkelijk gehonoreerd, niet in de web-build.
- **Camera-permissiestring is Nederlands, de rest van de systeem-UI-strings
  in `app.json`/`Info.plist` zijn dat historisch ook al** (consistent met
  de rest van de app, die uitsluitend Nederlandstalig is).

## Niet gebouwd (bewust, voor latere fases)

Wearables, social features, AI-chat, een vrije van-nul-af-aan
schema-builder (zie hierboven — bewerken van een bestaand gegenereerd
schema is er wel), meertaligheid, microvoeding/vitamines (voeding zelf is
sinds stap 10 wel gebouwd: calorieën + macro's) — zoals in de opdracht
vermeld, hier niet aangeraakt.

## Projectstructuur

```
.github/
  workflows/
    supabase-migrations.yml  Past supabase/migrations/*.sql toe + deployt supabase/functions/* op main bij wijzigingen (zie CI/CD-sectie)
app/                        Expo Router routes
  _layout.tsx                Root layout: Auth-/ProfileProvider + 3-weg Stack.Protected gate
  (auth)/
    index.tsx                 Login/registreren (e-mail + wachtwoord, één scherm met toggle)
  (onboarding)/
    index.tsx                  Intake-wizard: streeffysiek, basismetingen (+BMI), voorkeuren, samenvatting
  (tabs)/
    _layout.tsx                Tab navigator: Vandaag / Schema / Voeding / Progressie / Profiel
    index.tsx                   "Vandaag" dashboard: streak + weekoverzicht-strip + 4 samenvattingskaarten (training/voeding/progressie/readiness)
    schema.tsx                  "Schema": dagen/oefeningen bekijken, bewerken, vervangen, herordenen, toevoegen/verwijderen
    nutrition.tsx                "Voeding": dagoverzicht vs. calorie-/macrodoel, scannen/zoeken, recent/favorieten, dag-log
    progress.tsx                 "Progressie": kerncijfers, per-oefening links, aanpassingstijdlijn-preview, voedingssectie
    profile.tsx                  "Profiel": profielgegevens + lichaamsmetingen bewerken, OFF-attributie, uitloggen
  workout/
    [dayId].tsx                 Workout-invoer: StrengthLogger + CardioLogger, offline-first
  history/
    [dayExerciseId].tsx         Historie per oefening (kracht of cardio): lijngrafiek(en) + lijst per sessie
  week-review.tsx               Week-overzicht: voorgestelde aanpassingen aan-/uitvinken en bevestigen
  adjustment-history.tsx        Uitleg-geschiedenis: alle program_adjustments, per week gegroepeerd
  switch-goal.tsx                Ander streeffysiek/doel kiezen: PhysiquePicker + bevestiging, archiveert oud programma
  faq.tsx                        "Wetenschap": doorzoekbare, categoriseerbare FAQ met bronvermelding
  food-scan.tsx                  Barcode scannen (expo-camera) -> OFF-cache-opzoeking -> FoodLogForm
  food-search.tsx                Naam zoeken (expliciete actie, geen live type-ahead) -> FoodLogForm
  readiness.tsx                  Volledig grid van herstelringen (Readiness-kaart tikt hier naartoe) — eigen databron, sortering + tik-kaart + legenda
src/
  components/
    SyncStatusBadge.tsx        Offline / N niet gesynchroniseerd / Gesynchroniseerd — workout + Vandaag
    Card.tsx / Button.tsx / SelectableCard.tsx / EmptyState.tsx / ProgressDots.tsx / StatTile.tsx
                                 Designsysteem-componenten, gedeeld door alle vier de tabs + onboarding
    LineChart.tsx                Herbruikbare SVG-lijngrafiek (uit historiescherm getrokken; ook gebruikt in Profiel)
    StatBars.tsx                  Geanimeerde stat-balken voor de streeffysiek-kaarten
    PhysiquePicker.tsx            Het ene streeffysiek-keuzescherm — onboarding, profiel-edit én switch-goal delen dit
    icons.tsx                    Dependency-vrije SVG-icoonset (tab-iconen + PhysiqueSilhouette-placeholder + FlameIcon)
    NutrientProgressBar.tsx       Gevulde-balk voortgang voor een dagtotaal (calorieën/macro) t.o.v. doel
    FoodLogForm.tsx                Gedeeld door scan/zoeken/handmatig: hoeveelheid + macro-preview + loggen + favoriet
    RecoveryRing.tsx                Herbruikbare Apple Watch-stijl voortgangsring (SVG, stroke-dasharray/dashoffset) — puur presentational, percent + kleur als props
    MuscleRecoveryRing.tsx          Eén grid-tegel: ring + spiergroepnaam + statuslabel; optionele onPress (leeg = geneste-Pressable-val vermeden in de compacte kaart)
    RecoveryCurveChart.tsx          Illustratieve supercompensatie-curve (react-native-svg) voor de geselecteerde spiergroep — dip/piek/afvlakking + "nu"-marker, gedeelde kleurlogica met de ringen
    WeekOverview.tsx               Dashboard: streak-regel + 7-daagse weekoverzicht-strip, eigen fetch (fetchActiveProgram + fetchWorkoutDates)
    DashboardCardShell.tsx        Gedeelde kop/laadstatus/CTA-schil voor de vier dashboardkaarten — presentational only
    TrainingTodayCard.tsx          Dashboardkaart 1: eigen fetch (fetchActiveProgram), naam/omschrijving/aantal oefeningen + "Start workout"
    NutritionSummaryCard.tsx       Dashboardkaart 2: eigen fetch (targets + dagtotalen + eiwit-tekortsignaal), compacte calorieënbalk
    ProgressSummaryCard.tsx        Dashboardkaart 3: eigen fetch (fetchWeeklyVolume/fetchMonthlyWorkoutCount), twee StatTiles
    ReadinessCard.tsx              Dashboardkaart 4: eigen fetch (fetchAllMuscleGroupRecoveryEstimates), toont de 4 meest relevante herstelringen (compact)
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
    progressStats.ts             fetchWeeklyVolume / fetchMonthlyWorkoutCount / fetchLongestStreak / fetchWorkoutDates
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
    recovery.ts                   fetchRecoveryEstimate() + fetchAllMuscleGroupRecoveryEstimates() — cross-programma laatste-sessie-lookup + estimateRecoveryState()
    recoveryLabels.ts              STATUS_LABEL / STATUS_COLOR — React Native-vrij, gedeeld door de readiness-ringen (app/readiness.tsx) en pure src/lib-modules
    recoveryColor.ts / recoveryColor.test.ts
                                  recoveryColor() — vloeiende kleurgradiënt voor de herstelringen, puur op basis van bestaande RecoveryEstimate-velden
    recoveryReadiness.ts / recoveryReadiness.test.ts
                                  recoveryReadinessPercent() (ringvulling) + recoveryRingLabel() + describeMuscleRecoveryTap() (tik-kaart-tekst) + compareMuscleRecoveryPriority() (sortering "klaar om te trainen" eerst)
    faqContent.ts                 FAQ_ENTRIES + searchFaqEntries() — gestructureerde, doorzoekbare FAQ-content
    faqContent.test.ts             Controleert dat elke FAQ-entry minstens één bron met geldige url/auteur/jaar heeft
    openFoodFacts.ts / openFoodFacts.test.ts
                                  fetchProductByBarcode() / searchProductsByName() — roept de food-proxy edge function aan, nooit OFF rechtstreeks (CORS)
    foodProducts.ts                fetchProductWithCache() — Supabase-cache vóór elke OFF-aanroep
    nutritionTargets.ts            computeUserNutritionTargets() — koppelt profile+laatste meting aan de pure engine
    foodLogs.ts                    logFood (offline-wachtrij) / fetchFoodLogsForDate / fetchRecentFoodLogs / fetchRecentDailyProteinTotals / deleteFoodLog
    foodFavorites.ts               fetchFavorites / addFavorite / removeFavorite
    proteinSignal.ts               checkProteinShortfall() — koppelt detectProteinShortfall aan profile/doel
    searchThrottle.ts / searchThrottle.test.ts
                                  canSearchNow() — pure debounce-guard voor het zoekscherm
    dateWeek.ts / dateWeek.test.ts
                                  startOfIsoWeek / addDays / isSameLocalDay / isBeforeLocalDay — gedeelde datumhulp voor streak.ts + weekStrip.ts
    weekStrip.ts / weekStrip.test.ts
                                  computeWeekStrip() — 7-daagse ma-zo statusstrip (gedaan/gepland/rustdag/gemist) uit workout-datums + daysPerWeek
    streak.ts / streak.test.ts
                                  calculateStreak() — aaneengesloten volledig-afgelopen weken met weekdoel gehaald, zelfde granulariteit als adaptatieplanner's therapietrouw-check
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
      recovery.ts                estimateRecoveryState() — supercompensatie-venster per spiergroep
      recoveryCurve.ts            generateRecoveryCurve() — illustratieve dip/piek/afvlakking-curve, afgeleid van diezelfde RecoveryEstimate
    tests/
      strength.test.ts
      cardio.test.ts
      recovery.test.ts
      recoveryCurve.test.ts
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
  nutrition-engine/           Pure, framework-onafhankelijke calorie-/macroberekening
    src/
      types.ts
      targets.ts                 calculateNutritionTargets() + per-doel config-tabellen + activiteitsmultiplier
      proteinShortfall.ts          detectProteinShortfall()
      scale.ts                    scaleNutrients() — per-100g -> gelogde hoeveelheid
    tests/
      targets.test.ts
      proteinShortfall.test.ts
      scale.test.ts
supabase/
  migrations/
    0001_init.sql              Volledig Fase 1-datamodel + RLS
    0002_adaptation_planner.sql  Weekteller, is_active op program_days, week_number/is_deload + insert-policy
    0003_physique_and_measurements.sql
                                 target_physique/gender/birth_year/target_weight_kg op profiles + body_measurements-tabel
    0004_nutrition.sql          food_products (gedeelde OFF-cache) + food_logs + food_favorites + RLS
  functions/
    food-proxy/index.ts        Server-side proxy naar Open Food Facts (CORS-fix) — cachet in food_products, zet User-Agent server-side
vitest.config.ts               Root-scope testrunner voor pure src/lib-modules (src/**/*.test.ts), naast de package-tests
```

## CI/CD: migraties en edge functions automatisch toepassen

`.github/workflows/supabase-migrations.yml` draait `supabase db push` én
`supabase functions deploy food-proxy` zodra een merge naar `main`
bestanden in `supabase/migrations/` of `supabase/functions/` wijzigt (plus
een handmatige "Run workflow"-knop in de Actions-tab voor als je 'm meteen
wilt draaien zonder nieuwe commit). De migratie-automatisering bestaat
specifiek omdat migratie 0003 een hele sessie lang in de repo stond zonder
ooit toegepast te zijn — er was geen enkel automatisch signaal dat dat was
misgegaan, alleen een bug downstream die er niets mee te maken leek te
hebben. Dezelfde reden gold voor de edge function toevoegen: functiecode in
de repo lost niets op als niemand hem ooit daadwerkelijk deployt. Beide
commando's zijn idempotent (migraties: past alleen toe wat nog niet in de
remote historie staat; functions deploy: overschrijft gewoon de vorige
versie), dus opnieuw draaien is altijd veilig.

**Vereist drie repository secrets** (Settings → Secrets and variables →
Actions → "New repository secret") — die kan ik niet zelf toevoegen, dat
moet in de GitHub-instellingen zelf:

| Secret | Waar te vinden |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens — genereer een nieuwe personal access token |
| `SUPABASE_PROJECT_REF` | Project → Settings → General → "Reference ID" (voor deze app: `xafjhpztfbyhozyruarh`) |
| `SUPABASE_DB_PASSWORD` | Het database-wachtwoord dat je koos bij het aanmaken van het project — te resetten via Project → Settings → Database als je 'm niet meer weet |

Zolang deze secrets ontbreken faalt de workflow gewoon zichtbaar in de
Actions-tab (in plaats van stil niets te doen), dus het ergste geval is
"geen automatische toepassing", niet "een onopgemerkte fout".

## Hoe te draaien

```bash
npm install
cp .env.example .env   # vul EXPO_PUBLIC_SUPABASE_URL en _ANON_KEY in
npm run test           # unit tests, alle packages + root src/lib samen (235 tests)
npm run typecheck      # TypeScript over het hele project
npm run web            # of: npm start, dan a/i/w voor android/ios/web
```

Zonder een geldig Supabase-project in `.env` start de auth-flow niet (de
Supabase-client gooit bewust een duidelijke foutmelding bij het opstarten in
plaats van stil te falen).
