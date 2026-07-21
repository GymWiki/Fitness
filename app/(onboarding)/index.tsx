import type { EquipmentType, ExperienceLevel, Goal, IntakeAnswers } from '@fitness/program-generator';
import { CARDIO_BASELINE_BY_GOAL, generateProgram } from '@fitness/program-generator';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressDots } from '@/components/ProgressDots';
import { PhysiquePicker } from '@/components/PhysiquePicker';
import { SelectableCard } from '@/components/SelectableCard';
import { useAuth } from '@/lib/auth';
import { BMI_CATEGORY_LABELS, BMI_CAVEAT, bmiCategory, calculateBmi } from '@/lib/bmi';
import type { Gender } from '@/lib/profile';
import { useProfile } from '@/lib/profile';
import { PHYSIQUE_OPTIONS, goalForPhysique, type Physique } from '@/lib/physique';
import { saveGeneratedProgram } from '@/lib/programs';
import { saveMeasurement } from '@/lib/measurements';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

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

const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6];

type Step = 'physique' | 'measurements' | 'preferences' | 'summary';
const STEPS: Step[] = ['physique', 'measurements', 'preferences', 'summary'];

function parsePositiveFloat(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function IntakeScreen() {
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
    (step === 'preferences' && experienceLevel !== null && daysPerWeek !== null && equipment !== null);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgressDots total={STEPS.length} currentIndex={stepIndex} />
      <Text style={styles.progress}>
        Stap {stepIndex + 1} van {STEPS.length}
      </Text>

      {step === 'physique' && (
        <View>
          <Text style={styles.title}>Wat is je streeffysiek?</Text>
          <Text style={styles.body}>
            Dit bepaalt het trainingsdoel achter je schema — geen oordeel, gewoon de richting die we inslaan.
          </Text>
          <PhysiquePicker selected={physique} onSelect={setPhysique} />
        </View>
      )}

      {step === 'measurements' && (
        <View>
          <Text style={styles.title}>Waar sta je nu?</Text>
          <Text style={styles.body}>Schatten mag — je kunt dit later altijd bijwerken.</Text>

          <FieldLabel>Gewicht (kg)</FieldLabel>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="bv. 75"
            placeholderTextColor={colors.textTertiary}
            value={weightKg}
            onChangeText={setWeightKg}
          />

          <FieldLabel>Lengte (cm)</FieldLabel>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="bv. 178"
            placeholderTextColor={colors.textTertiary}
            value={heightCm}
            onChangeText={setHeightCm}
          />

          <FieldLabel>Vetpercentage (optioneel)</FieldLabel>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="Schatten mag"
            placeholderTextColor={colors.textTertiary}
            value={bodyFatPercent}
            onChangeText={setBodyFatPercent}
          />

          {bmi !== null && (
            <Card style={styles.bmiCard}>
              <Text style={styles.bmiValue}>
                BMI {bmi.toFixed(1)} · {BMI_CATEGORY_LABELS[bmiCategory(bmi)]}
              </Text>
              <Text style={styles.bmiCaveat}>{BMI_CAVEAT}</Text>
            </Card>
          )}

          <FieldLabel>Geslacht (optioneel)</FieldLabel>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.chip, gender === option.value && styles.chipSelected]}
                onPress={() => setGender(gender === option.value ? null : option.value)}
              >
                <Text style={[styles.chipText, gender === option.value && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <FieldLabel>Geboortejaar (optioneel)</FieldLabel>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="bv. 1994"
            placeholderTextColor={colors.textTertiary}
            value={birthYear}
            onChangeText={setBirthYear}
            maxLength={4}
          />

          <FieldLabel>Streefgewicht (optioneel, kg)</FieldLabel>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="Optioneel"
            placeholderTextColor={colors.textTertiary}
            value={targetWeightKg}
            onChangeText={setTargetWeightKg}
          />
        </View>
      )}

      {step === 'preferences' && (
        <View>
          <Text style={styles.title}>Jouw trainingsvoorkeuren</Text>

          <FieldLabel>Trainingservaring</FieldLabel>
          {EXPERIENCE_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={experienceLevel === option.value}
              onPress={() => setExperienceLevel(option.value)}
            />
          ))}

          <FieldLabel>Dagen per week</FieldLabel>
          <View style={styles.daysRow}>
            {DAYS_PER_WEEK_OPTIONS.map((value) => (
              <Pressable
                key={value}
                style={[styles.dayButton, daysPerWeek === value && styles.dayButtonSelected]}
                onPress={() => setDaysPerWeek(value)}
              >
                <Text style={[styles.dayButtonText, daysPerWeek === value && styles.dayButtonTextSelected]}>{value}</Text>
              </Pressable>
            ))}
          </View>

          <FieldLabel>Materiaal</FieldLabel>
          {EQUIPMENT_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={equipment === option.value}
              onPress={() => setEquipment(option.value)}
            />
          ))}
        </View>
      )}

      {step === 'summary' && program && physique && (
        <View>
          <Card elevated style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Jouw doel</Text>
            <Text style={styles.summaryGoal}>
              {PHYSIQUE_OPTIONS.find((option) => option.value === physique)!.label}
            </Text>
            <Text style={styles.summaryBody}>
              We bouwen een {program.name.toLowerCase()}-schema van {intake!.daysPerWeek} dagen per week.
            </Text>
            <Text style={styles.summaryBody}>{cardioExplanation(program.goal)}</Text>
          </Card>

          {program.days.map((day) => (
            <View key={day.dayOrder} style={styles.dayCard}>
              <Text style={styles.dayCardTitle}>
                Dag {day.dayOrder}: {day.name}
              </Text>
              {day.exercises.map((exercise) => (
                <Text key={exercise.exerciseOrder} style={styles.exerciseLine}>
                  {exercise.exerciseName} — {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps
                  (RIR {exercise.targetRIR})
                </Text>
              ))}
              {day.cardioSessions.map((session) => (
                <Text key={session.exerciseOrder} style={styles.exerciseLine}>
                  {session.exerciseName} — ±{session.durationMinutes} minuten
                </Text>
              ))}
            </View>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}

      <View style={styles.nav}>
        {stepIndex > 0 ? (
          <Pressable style={styles.secondaryButton} onPress={goBack} disabled={isSaving}>
            <Text style={styles.secondaryButtonText}>Terug</Text>
          </Pressable>
        ) : (
          <View />
        )}

        {step === 'summary' ? (
          <Button onPress={handleStart} loading={isSaving}>
            Start programma
          </Button>
        ) : (
          <Pressable
            style={[styles.primaryButton, !canGoNext && styles.primaryButtonDisabled]}
            onPress={goNext}
            disabled={!canGoNext}
          >
            <Text style={styles.primaryButtonText}>Volgende</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
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
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    paddingTop: 64,
    gap: spacing.xl,
  },
  progress: {
    ...typography.label,
    marginTop: -spacing.md,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.bodySecondary,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.label,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  bmiCard: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  bmiValue: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  bmiCaveat: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.accent,
  },
  daysRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  dayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  dayButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  dayButtonTextSelected: {
    color: colors.accent,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.label,
  },
  summaryGoal: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  summaryBody: {
    ...typography.bodySecondary,
    marginTop: spacing.xs,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dayCardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  exerciseLine: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
