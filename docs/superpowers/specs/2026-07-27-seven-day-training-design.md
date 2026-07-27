# 7 dagen per week trainen — design

## Probleem

`days_per_week` is momenteel gelimiteerd tot 2-6, op drie plekken tegelijk:
UI (`DAYS_PER_WEEK_OPTIONS`), database (check-constraint) en programma-generator
(`MAX_DAYS_PER_WEEK`). De gebruiker wil ook 7 dagen per week kunnen trainen.

## Scope

Alleen het optrekken van de dagen-per-week-limiet naar 7 en het toevoegen van
een passend schema-type voor hoge frequentie (6-7 dagen). Geen wijziging aan
de onderliggende recovery-, progressie- of adaptatielogica.

## 1. Cap verhogen (UI + generator + database)

- `DAYS_PER_WEEK_OPTIONS` in `app/(onboarding)/index.tsx:41` en
  `app/(tabs)/profile.tsx:35` wordt `[2, 3, 4, 5, 6, 7]`.
- `MIN_DAYS_PER_WEEK`/`MAX_DAYS_PER_WEEK` in
  `packages/program-generator/src/generate.ts:12-13` wordt 2-7; de
  foutmelding bij een ongeldige waarde blijft hetzelfde patroon
  (`daysPerWeek must be between X and Y, got Z.`).
- Nieuwe Supabase-migratie (`supabase/migrations/0006_seven_day_training.sql`)
  laat de check-constraint op `profiles.days_per_week` (uit `0001_init.sql`,
  huidige vorm `between 2 and 6`) toe tot `between 2 and 7`. De
  `preferred_weekdays`-constraints in `0005_scheduled_sessions.sql` staan al
  1-7 toe en hoeven niet aangepast.
- `IntakeAnswers.daysPerWeek`-doc-comment in
  `packages/program-generator/src/types.ts:16` wordt bijgewerkt van "2-6"
  naar "2-7".

## 2. Nieuw Push/Pull/Legs-schema voor 6-7 dagen/week

Nieuwe `TemplateKey`-waarde `push_pull_legs_6x`, gebouwd uit bestaande
oefening-slots (geen nieuwe slots nodig):

- **Push** (variant A/B): `horizontalPush`, `verticalPush`, `triceps`, `core`
- **Pull** (variant A/B): `horizontalPull`, `verticalPull`, `biceps`, `core`
- **Benen** (variant A/B): `squat`, `hinge`, `quadIsolation`,
  `hamstringIsolation`, `calf`

6 archetypes in `TEMPLATE_DAY_ARCHETYPES.push_pull_legs_6x`: Push A, Pull A,
Benen A, Push B, Pull B, Benen B — dezelfde cyclische opbouw
(`buildProgramDays`'s bestaande modulo-cyclus) als de andere templates.

- Bij 6 dagen/week: exact één volledige cyclus (nette 2x PPL).
- Bij 7 dagen/week: dag 7 herhaalt Push A (index `6 % 6 = 0`) — consistent
  met hoe 5- en 6-dagen upper/lower nu al eerdere archetypes herhalen. Geen
  spier-overlap tussen dag 6 (Benen B) en dag 7 (Push A).

`selectTemplateKey` (`packages/program-generator/src/templates.ts:32-34`)
wordt:

```ts
export function selectTemplateKey(daysPerWeek: number): TemplateKey {
  if (daysPerWeek <= 3) return 'full_body_3x';
  if (daysPerWeek <= 5) return 'upper_lower_4x';
  return 'push_pull_legs_6x';
}
```

`TEMPLATE_LABELS` in `generate.ts:15-18` krijgt een entry
`push_pull_legs_6x: 'Push/Pull/Legs'`.

Dit wijzigt het schema voor bestaande 6-dagen-gebruikers (van upper/lower
naar PPL) — expliciet gekozen door de gebruiker.

## 3. Weekplanning en cardio bij volle weken

`distributeSessions` (`packages/adaptation-planner/src/distribute.ts`)
ondersteunt 7 kracht-dagen al zonder wijziging
(`STRENGTH_WEEKDAY_PATTERNS[7] = [1,2,3,4,5,6,7]`). Wanneer er geen
kracht-vrije dag meer over is voor een cardiosessie, valt de bestaande
fallback-keten (`restDayCandidates[0] ?? nonStrengthCandidates[0] ??
unusedCandidates[0] ?? candidates[0]`) terug op het plaatsen van cardio op
een dag die al een krachtsessie heeft — geaccepteerd gedrag, geen
codewijziging nodig.

De "zware beendag"-bescherming (`isHeavyLowerBodyDay`,
`packages/program-generator/src/exercises.ts:152-156`) wordt afgeleid van de
daadwerkelijke oefeningen op een dag (squat/hinge-patroon), niet van een
vaste lijst — een Benen-dag in het nieuwe PPL-schema wordt dus automatisch
als zware dag herkend, zonder aanpassing.

## 4. Tests

- `packages/program-generator/tests/generate.test.ts`: bestaande
  verwachtingen die het 2-6-bereik en `upper_lower_4x` bij 6 dagen
  aannemen, worden bijgewerkt. Nieuwe gevallen: `selectTemplateKey(6)` en
  `selectTemplateKey(7)` geven `push_pull_legs_6x`; `generateProgram` met
  `daysPerWeek: 7` geeft 7 kracht-dagen + cardio-dagen, geen error;
  `daysPerWeek: 1` en `daysPerWeek: 8` blijven een error geven.
- `packages/adaptation-planner/tests/distribute.test.ts`: bestaande
  dekking van het 7-dagen-patroon blijft (of wordt toegevoegd indien
  ontbrekend) om het stapel-gedrag van cardio op een volle week te
  bevestigen.

## Buiten scope

- Geen wijziging aan `distributeSessions`, recovery-schatting,
  deload-logica of adherence-evaluatie.
- Geen apart schema-type voor 6 dagen los van 7 (beide delen
  `push_pull_legs_6x`).
- Geen wijziging aan de weekoverzicht-cards op de Schema-pagina (aparte,
  latere feature).
