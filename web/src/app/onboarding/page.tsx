'use client';

import type { EquipmentType, ExperienceLevel, Goal, IntakeAnswers } from '@fitness/program-generator';
import { CARDIO_BASELINE_BY_GOAL, generateProgram } from '@fitness/program-generator';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressDots } from '@/components/ProgressDots';
import { PhysiquePicker } from '@/components/PhysiquePicker';
import { SelectableCard } from '@/components/SelectableCard';
import { WeekdayPicker } from '@/components/WeekdayPicker';
import { useAuth } from '@/lib/auth/AuthProvider';
import { BMI_CATEGORY_LABELS, BMI_CAVEAT, bmiCategory, calculateBmi } from '@/lib/bmi';
import type { Gender } from '@/lib/profile';
import { useProfile } from '@/lib/profile';
import { PHYSIQUE_OPTIONS, goalForPhysique, type Physique } from '@/lib/physique';
import { saveGeneratedProgram } from '@/lib/programs';
import { saveMeasurement } from '@/lib/measurements';

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Beginner', description: 'Minder dan een jaar consistent trainen.' },
  { value: 'intermediate', label: 'Gemiddeld', description: '1-3 jaar consistent trainen.' },
  { value: 'advanced', label: 'Gevorderd', description: 'Meer dan 3 jaar consistent trainen.' },
];

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentType; label: string; description: string }> = [
  { value: 'gym', label: 'Sportschool', description: 'Volledige toegang: barbells, machines, cables.' },
  { value: 'home_dumbbells', label: 'Dumbbells thuis', description: 'Een setje dumbbells, geen machines.' },
  { value: 'bodyweight', label: 'Eigen lichaamsgewicht', description: 'Geen materiaal, alleen bodyweight-oefeningen.' },
];

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: 'Vrouw' },
  { value: 'male', label: 'Man' },
  { value: 'other', label: 'Anders' },
];

const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6, 7];

type Step = 'physique' | 'measurements' | 'preferences' | 'summary';
const STEPS: Step[] = ['physique', 'measurements', 'preferences', 'summary'];

function parsePositiveFloat(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Explains the cardio baseline that's now in every schema, per the goal — ties into the explanation feature. */
function cardioExplanation(goal: Goal): string {
  const baseline = CARDIO_BASELINE_BY_GOAL[goal];
  const sessionWord = baseline.sessionsPerWeek === 1 ? 'lichte cardiosessie' : 'cardiosessies';
  if (goal === 'fat_loss' || goal === 'endurance') {
    return `Cardio is de kern van dit schema: ${baseline.sessionsPerWeek} sessies per week, opgebouwd volgens de 80/20-verdeling tussen rustige duurtraining en intervallen.`;
  }
  if (goal === 'mixed') {
    return `Je schema combineert kracht met ${baseline.sessionsPerWeek} cardiosessies per week, in balans met je krachttraining.`;
  }
  return `Je schema bevat ook ${baseline.sessionsPerWeek} ${sessionWord} per week voor je hart- en vaatgezondheid.`;
}

function FieldLabel({ children }: { children: string }) {
  return <p className="mt-4 mb-2 text-[13px] font-semibold uppercase tracking-[0.6px] text-text-secondary">{children}</p>;
}

const inputClasses =
  'w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent';

export default function OnboardingPage() {
  const { session } = useAuth();
  const { refresh } = useProfile();

  const [stepIndex, setStepIndex] = useState(0);

  const [physique, setPhysique] = useState<Physique | null>(null);

  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');

  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<EquipmentType | null>(null);
  const [preferredWeekdays, setPreferredWeekdays] = useState<number[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex]!;

  const parsedWeightKg = parsePositiveFloat(weightKg);
  const parsedHeightCm = parsePositiveFloat(heightCm);
  const parsedBodyFatPercent = bodyFatPercent.trim() === '' ? null : parsePositiveFloat(bodyFatPercent);
  const parsedTargetWeightKg = targetWeightKg.trim() === '' ? null : parsePositiveFloat(targetWeightKg);
  const parsedBirthYear = birthYear.trim() === '' ? null : Number.parseInt(birthYear, 10);
  const bmi = parsedWeightKg && parsedHeightCm ? calculateBmi(parsedWeightKg, parsedHeightCm) : null;

  const goal = physique ? goalForPhysique(physique) : null;

  const intake: IntakeAnswers | null = useMemo(() => {
    if (!goal || !experienceLevel || !daysPerWeek || !equipment) return null;
    return { goal, experienceLevel, daysPerWeek, equipment };
  }, [goal, experienceLevel, daysPerWeek, equipment]);

  const program = useMemo(() => (intake ? generateProgram(intake) : null), [intake]);

  const canGoNext =
    (step === 'physique' && physique !== null) ||
    (step === 'measurements' && parsedWeightKg !== null && parsedHeightCm !== null) ||
    (step === 'preferences' &&
      experienceLevel !== null &&
      daysPerWeek !== null &&
      equipment !== null &&
      preferredWeekdays.length === daysPerWeek);

  function selectDaysPerWeek(value: number) {
    setDaysPerWeek(value);
    // A previous weekday selection almost never still matches a new day count, so it's cleared
    // rather than silently kept partial/oversized — better to ask again than to guess.
    if (preferredWeekdays.length !== value) setPreferredWeekdays([]);
  }

  function goNext() {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  async function handleStart() {
    if (!intake || !program || !physique || !session || !parsedWeightKg || !parsedHeightCm || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveGeneratedProgram(session.user.id, intake, program, {
        targetPhysique: physique,
        gender,
        birthYear: parsedBirthYear,
        targetWeightKg: parsedTargetWeightKg,
        preferredWeekdays,
      });
      await saveMeasurement(session.user.id, {
        weightKg: parsedWeightKg,
        heightCm: parsedHeightCm,
        bodyFatPercent: parsedBodyFatPercent,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout bij het opslaan van je programma.');
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-8">
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <ProgressDots total={STEPS.length} currentIndex={stepIndex} />
        <p className="-mt-3 text-[13px] font-semibold uppercase tracking-[0.6px] text-text-secondary">
          Stap {stepIndex + 1} van {STEPS.length}
        </p>

        {step === 'physique' && (
          <div>
            <h1 className="mb-2 text-[22px] font-bold text-text-primary">Wat is je streeffysiek?</h1>
            <p className="mb-4 text-[15px] leading-[21px] text-text-secondary">
              Dit bepaalt het trainingsdoel achter je schema — geen oordeel, gewoon de richting die we inslaan.
            </p>
            <PhysiquePicker selected={physique} onSelect={setPhysique} />
          </div>
        )}

        {step === 'measurements' && (
          <div>
            <h1 className="mb-2 text-[22px] font-bold text-text-primary">Waar sta je nu?</h1>
            <p className="mb-4 text-[15px] leading-[21px] text-text-secondary">Schatten mag — je kunt dit later altijd bijwerken.</p>

            <FieldLabel>Gewicht (kg)</FieldLabel>
            <input
              className={inputClasses}
              inputMode="decimal"
              placeholder="bv. 75"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />

            <FieldLabel>Lengte (cm)</FieldLabel>
            <input
              className={inputClasses}
              inputMode="decimal"
              placeholder="bv. 178"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />

            <FieldLabel>Vetpercentage (optioneel)</FieldLabel>
            <input
              className={inputClasses}
              inputMode="decimal"
              placeholder="Schatten mag"
              value={bodyFatPercent}
              onChange={(e) => setBodyFatPercent(e.target.value)}
            />

            {bmi !== null && (
              <Card className="mt-4 flex flex-col gap-1">
                <p className="text-base font-bold text-accent">
                  BMI {bmi.toFixed(1)} · {BMI_CATEGORY_LABELS[bmiCategory(bmi)]}
                </p>
                <p className="text-xs leading-[17px] text-text-secondary">{BMI_CAVEAT}</p>
              </Card>
            )}

            <FieldLabel>Geslacht (optioneel)</FieldLabel>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setGender(gender === option.value ? null : option.value)}
                  className={`rounded-full border px-4 py-3 text-sm font-semibold ${
                    gender === option.value ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-surface text-text-secondary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <FieldLabel>Geboortejaar (optioneel)</FieldLabel>
            <input
              className={inputClasses}
              inputMode="numeric"
              placeholder="bv. 1994"
              maxLength={4}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            />

            <FieldLabel>Streefgewicht (optioneel, kg)</FieldLabel>
            <input
              className={inputClasses}
              inputMode="decimal"
              placeholder="Optioneel"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
            />
          </div>
        )}

        {step === 'preferences' && (
          <div>
            <h1 className="mb-4 text-[22px] font-bold text-text-primary">Jouw trainingsvoorkeuren</h1>

            <FieldLabel>Trainingservaring</FieldLabel>
            {EXPERIENCE_OPTIONS.map((option) => (
              <SelectableCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={experienceLevel === option.value}
                onClick={() => setExperienceLevel(option.value)}
              />
            ))}

            <FieldLabel>Dagen per week</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {DAYS_PER_WEEK_OPTIONS.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => selectDaysPerWeek(value)}
                  className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border text-lg font-bold ${
                    daysPerWeek === value ? 'border-accent bg-accent-muted text-accent' : 'border-border bg-surface text-text-primary'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {daysPerWeek !== null && (
              <>
                <FieldLabel>Op welke dagen train je het liefst?</FieldLabel>
                <p className="mb-3 text-[15px] leading-[21px] text-text-secondary">
                  We plannen je schema vanaf nu op deze vaste dagen, 2 weken vooruit — zo weet je altijd zonder gokken of
                  vandaag een trainingsdag is.
                </p>
                <WeekdayPicker selected={preferredWeekdays} requiredCount={daysPerWeek} onChange={setPreferredWeekdays} />
              </>
            )}

            <FieldLabel>Materiaal</FieldLabel>
            {EQUIPMENT_OPTIONS.map((option) => (
              <SelectableCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={equipment === option.value}
                onClick={() => setEquipment(option.value)}
              />
            ))}
          </div>
        )}

        {step === 'summary' && program && physique && (
          <div>
            <Card elevated className="mb-4 flex flex-col gap-1">
              <p className="text-[13px] font-semibold uppercase tracking-[0.6px] text-text-secondary">Jouw doel</p>
              <p className="text-xl font-bold text-text-primary">
                {PHYSIQUE_OPTIONS.find((option) => option.value === physique)!.label}
              </p>
              <p className="mt-1 text-[15px] leading-[21px] text-text-secondary">
                We bouwen een {program.name.toLowerCase()}-schema van {intake!.daysPerWeek} dagen per week.
              </p>
              <p className="text-[15px] leading-[21px] text-text-secondary">{cardioExplanation(program.goal)}</p>
            </Card>

            {program.days.map((day) => (
              <div key={day.dayOrder} className="mb-3 rounded-xl border border-border bg-surface p-4">
                <p className="mb-2 text-[15px] font-bold text-text-primary">
                  Dag {day.dayOrder}: {day.name}
                </p>
                {day.exercises.map((exercise) => (
                  <p key={exercise.exerciseOrder} className="text-[13px] leading-[19px] text-text-secondary">
                    {exercise.exerciseName} — {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps (RIR{' '}
                    {exercise.targetRIR})
                  </p>
                ))}
                {day.cardioSessions.map((cardioSession) => (
                  <p key={cardioSession.exerciseOrder} className="text-[13px] leading-[19px] text-text-secondary">
                    {cardioSession.exerciseName} — ±{cardioSession.durationMinutes} minuten
                  </p>
                ))}
              </div>
            ))}
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          {stepIndex > 0 ? (
            <button type="button" className="py-4 text-[15px] font-semibold text-text-secondary" onClick={goBack} disabled={isSaving}>
              Terug
            </button>
          ) : (
            <span />
          )}

          {step === 'summary' ? (
            <Button onClick={handleStart} loading={isSaving}>
              Start programma
            </Button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="rounded-xl bg-accent px-6 py-4 text-base font-bold text-background disabled:opacity-40"
            >
              Volgende
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
