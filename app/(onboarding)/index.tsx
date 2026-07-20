import type { EquipmentType, ExperienceLevel, Goal, IntakeAnswers } from '@fitness/program-generator';
import { generateProgram } from '@fitness/program-generator';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { saveGeneratedProgram } from '@/lib/programs';
import { colors } from '@/theme/colors';

const GOAL_OPTIONS: Array<{ value: Goal; label: string; description: string }> = [
  { value: 'hypertrophy', label: 'Spieropbouw', description: 'Meer spiermassa, hypertrofie-gerichte volumes.' },
  { value: 'strength', label: 'Kracht', description: 'Zwaarder worden op de basisoefeningen.' },
  { value: 'endurance', label: 'Uithoudingsvermogen', description: 'Cardio-capaciteit opbouwen.' },
  { value: 'fat_loss', label: 'Vetverlies', description: 'Vet verliezen met behoud van spiermassa.' },
  { value: 'mixed', label: 'Gemixed', description: 'Een beetje van alles, geen specifieke piek.' },
];

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

const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6];

type Step = 'goal' | 'experience' | 'days' | 'equipment' | 'review';
const STEPS: Step[] = ['goal', 'experience', 'days', 'equipment', 'review'];

export default function IntakeScreen() {
  const { session } = useAuth();
  const { refresh } = useProfile();

  const [stepIndex, setStepIndex] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<EquipmentType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex]!;

  const intake: IntakeAnswers | null = useMemo(() => {
    if (!goal || !experienceLevel || !daysPerWeek || !equipment) return null;
    return { goal, experienceLevel, daysPerWeek, equipment };
  }, [goal, experienceLevel, daysPerWeek, equipment]);

  const program = useMemo(() => (intake ? generateProgram(intake) : null), [intake]);

  const canGoNext =
    (step === 'goal' && goal !== null) ||
    (step === 'experience' && experienceLevel !== null) ||
    (step === 'days' && daysPerWeek !== null) ||
    (step === 'equipment' && equipment !== null);

  function goNext() {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  async function handleStart() {
    if (!intake || !program || !session || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveGeneratedProgram(session.user.id, intake, program);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout bij het opslaan van je programma.');
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.progress}>
        Stap {stepIndex + 1} van {STEPS.length}
      </Text>

      {step === 'goal' && (
        <StepPicker
          title="Wat is je doel?"
          options={GOAL_OPTIONS}
          selected={goal}
          onSelect={setGoal}
        />
      )}

      {step === 'experience' && (
        <StepPicker
          title="Wat is je trainingservaring?"
          options={EXPERIENCE_OPTIONS}
          selected={experienceLevel}
          onSelect={setExperienceLevel}
        />
      )}

      {step === 'days' && (
        <View>
          <Text style={styles.title}>Hoeveel dagen per week train je?</Text>
          <View style={styles.daysRow}>
            {DAYS_PER_WEEK_OPTIONS.map((value) => (
              <Pressable
                key={value}
                style={[styles.dayButton, daysPerWeek === value && styles.dayButtonSelected]}
                onPress={() => setDaysPerWeek(value)}
              >
                <Text style={[styles.dayButtonText, daysPerWeek === value && styles.optionLabelSelected]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 'equipment' && (
        <StepPicker
          title="Welk materiaal heb je?"
          options={EQUIPMENT_OPTIONS}
          selected={equipment}
          onSelect={setEquipment}
        />
      )}

      {step === 'review' && program && (
        <View>
          <Text style={styles.title}>{program.name}</Text>
          <Text style={styles.body}>
            Op basis van je antwoorden hebben we dit programma samengesteld. Je kunt gewichten pas
            invullen zodra je een workout gaat loggen.
          </Text>
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

        {step === 'review' ? (
          <Pressable
            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
            onPress={handleStart}
            disabled={isSaving}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Bezig...' : 'Start programma'}</Text>
          </Pressable>
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

function StepPicker<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: Array<{ value: T; label: string; description: string }>;
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.optionCard, isSelected && styles.optionCardSelected]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 64,
    gap: 20,
  },
  progress: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: colors.accent,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 10,
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
  },
  dayButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dayCardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  exerciseLine: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 8,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
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
