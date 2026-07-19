# Adaptieve Fitness App — Plan van aanpak Fase 1

## Doel van Fase 1

Een werkend fundament neerzetten waarin de kernbelofte van de app — adaptief en
uitlegbaar advies — al aantoonbaar en getest is, vóórdat er tijd in UI-polish
gaat. Daarom is de bouwvolgorde bewust: eerst de progressie-engines (het
"kroonjuweel"), dan pas de schermen eromheen.

## Stappen en status

1. **Projectsetup: Expo + TypeScript + Supabase, auth (e-mail + magic link)** — ✅ gebouwd in deze sessie
2. **Progressie-engines als pure functies met uitgebreide unit tests** — ✅ gebouwd in deze sessie
3. Intake-flow + generator met 2 templates (full body 3×, upper/lower 4×) — nog niet gebouwd
4. Workout-invoerscherm (sportschool-geoptimaliseerd, offline queue) — nog niet gebouwd
5. Advies-weergave per oefening met uitleg-regel — nog niet gebouwd
6. Simpele historie per oefening (lijst + lijngrafiek) — nog niet gebouwd

Dit document beschrijft de aanpak voor alle 6 stappen zodat de architectuur
consistent blijft, maar de opdracht voor deze sessie was expliciet beperkt tot
stap 1 en 2.

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

Nog open voor stap 3 e.v. (niet blokkerend voor nu, maar wel relevant bij het
ontwerpen van de generator):
- Exacte oefeningenlijst per template/spiergroep/materiaal-combinatie.
- Hoe therapietrouw ("sessies overgeslagen") precies wordt gemeten (aantal
  gemiste sessies per periode?) voordat het schema wordt verkleind.
- Hoe de interference-check (cardio niet vlak vóór zware krachtdag) precies
  wordt ingebouwd in de weekplanner-output.

## Niet gebouwd (bewust, voor latere fases)

Wearables, voeding, social features, AI-chat, eigen-schema-builder,
meertaligheid — zoals in de opdracht vermeld, hier niet aangeraakt.

## Projectstructuur

```
app/                        Expo Router routes
  _layout.tsx                Root layout: AuthProvider + Stack.Protected auth-gate
  (auth)/
    index.tsx                 Login (e-mail + magic link)
    callback.tsx               Landing spot voor de magic-link redirect
  (tabs)/
    _layout.tsx                Tab navigator
    index.tsx                   Placeholder "Vandaag"-scherm na inloggen
src/
  lib/
    supabase.ts               Supabase client (AsyncStorage op native)
    auth.tsx                   AuthProvider + useAuth hook
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
supabase/
  migrations/
    0001_init.sql              Volledig Fase 1-datamodel + RLS
```

## Hoe te draaien

```bash
npm install
cp .env.example .env   # vul EXPO_PUBLIC_SUPABASE_URL en _ANON_KEY in
npm run test           # unit tests progressie-engine (25 tests)
npm run typecheck      # TypeScript over het hele project
npm run web            # of: npm start, dan a/i/w voor android/ios/web
```

Zonder een geldig Supabase-project in `.env` start de auth-flow niet (de
Supabase-client gooit bewust een duidelijke foutmelding bij het opstarten in
plaats van stil te falen).
