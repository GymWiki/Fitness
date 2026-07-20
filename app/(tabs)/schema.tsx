import type { EquipmentType } from '@fitness/program-generator';
import { candidateExercisesForMuscleGroup } from '@fitness/program-generator';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ChevronDownIcon, ChevronUpIcon, EditIcon, PlusIcon, SwapIcon, TrashIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import {
  addDay,
  fetchSchemaProgram,
  removeDay,
  replaceExercise,
  swapExerciseOrder,
  updateExerciseSets,
  type SchemaDay,
  type SchemaExercise,
  type SchemaProgram,
} from '@/lib/schemaEditor';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const KIND_LABEL: Record<SchemaExercise['kind'], string> = {
  strength: 'Kracht',
  cardio_duration: 'Cardio',
  cardio_interval: 'Cardio (intervallen)',
};

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (next: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperButton} disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={[styles.stepperButtonText, value <= min && styles.stepperButtonTextDisabled]}>–</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperButton} disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={[styles.stepperButtonText, value >= max && styles.stepperButtonTextDisabled]}>+</Text>
      </Pressable>
    </View>
  );
}

interface EditDraft {
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
}

function ExerciseRow({
  exercise,
  isFirst,
  isLast,
  equipment,
  onReorder,
  onSaved,
}: {
  exercise: SchemaExercise;
  isFirst: boolean;
  isLast: boolean;
  equipment: EquipmentType;
  onReorder: (direction: 'up' | 'down') => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({
    sets: exercise.sets ?? 3,
    repRangeMin: exercise.repRangeMin ?? 8,
    repRangeMax: exercise.repRangeMax ?? 12,
    targetRIR: exercise.targetRIR ?? 2,
  });

  const isStrength = exercise.kind === 'strength';
  const candidates = exercise.muscleGroup ? candidateExercisesForMuscleGroup(exercise.muscleGroup, equipment, exercise.exerciseName) : [];

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateExerciseSets(exercise.id, draft);
      setIsEditing(false);
      await onSaved();
    } catch (err) {
      Alert.alert('Opslaan mislukt', err instanceof Error ? err.message : 'Onbekende fout.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReplace(name: string) {
    setIsSaving(true);
    try {
      await replaceExercise(exercise.id, name);
      setIsSwapping(false);
      await onSaved();
    } catch (err) {
      Alert.alert('Vervangen mislukt', err instanceof Error ? err.message : 'Onbekende fout.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseHeaderRow}>
        <View style={styles.exerciseTextColumn}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          <Text style={styles.exerciseDetail}>
            {isStrength
              ? `${exercise.sets}× ${exercise.repRangeMin}-${exercise.repRangeMax} reps · RIR ${exercise.targetRIR}`
              : KIND_LABEL[exercise.kind]}
          </Text>
        </View>
        <View style={styles.reorderColumn}>
          <Pressable disabled={isFirst} onPress={() => onReorder('up')} style={styles.iconButton}>
            <ChevronUpIcon size={18} color={isFirst ? colors.textTertiary : colors.textSecondary} />
          </Pressable>
          <Pressable disabled={isLast} onPress={() => onReorder('down')} style={styles.iconButton}>
            <ChevronDownIcon size={18} color={isLast ? colors.textTertiary : colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.actionRow}>
        {isStrength && (
          <Pressable style={styles.actionButton} onPress={() => setIsEditing((v) => !v)}>
            <EditIcon size={14} color={colors.textSecondary} />
            <Text style={styles.actionButtonText}>Bewerken</Text>
          </Pressable>
        )}
        {candidates.length > 0 && (
          <Pressable style={styles.actionButton} onPress={() => setIsSwapping((v) => !v)}>
            <SwapIcon size={14} color={colors.textSecondary} />
            <Text style={styles.actionButtonText}>Vervang</Text>
          </Pressable>
        )}
      </View>

      {isEditing && (
        <View style={styles.editPanel}>
          <View style={styles.editFieldRow}>
            <Text style={styles.editFieldLabel}>Sets</Text>
            <Stepper value={draft.sets} min={1} max={8} onChange={(v) => setDraft({ ...draft, sets: v })} />
          </View>
          <View style={styles.editFieldRow}>
            <Text style={styles.editFieldLabel}>Reps min</Text>
            <Stepper value={draft.repRangeMin} min={1} max={draft.repRangeMax} onChange={(v) => setDraft({ ...draft, repRangeMin: v })} />
          </View>
          <View style={styles.editFieldRow}>
            <Text style={styles.editFieldLabel}>Reps max</Text>
            <Stepper value={draft.repRangeMax} min={draft.repRangeMin} max={30} onChange={(v) => setDraft({ ...draft, repRangeMax: v })} />
          </View>
          <View style={styles.editFieldRow}>
            <Text style={styles.editFieldLabel}>RIR</Text>
            <Stepper value={draft.targetRIR} min={0} max={5} onChange={(v) => setDraft({ ...draft, targetRIR: v })} />
          </View>
          <Button onPress={handleSave} loading={isSaving}>
            Opslaan
          </Button>
        </View>
      )}

      {isSwapping && (
        <View style={styles.editPanel}>
          {candidates.map((name) => (
            <Pressable key={name} style={styles.candidateRow} onPress={() => handleReplace(name)} disabled={isSaving}>
              <Text style={styles.candidateText}>{name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function DayCard({
  day,
  equipment,
  canRemove,
  onChanged,
}: {
  day: SchemaDay;
  equipment: EquipmentType;
  canRemove: boolean;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();

  async function handleReorder(exercise: SchemaExercise, direction: 'up' | 'down') {
    const index = day.exercises.findIndex((e) => e.id === exercise.id);
    const neighborIndex = direction === 'up' ? index - 1 : index + 1;
    const neighbor = day.exercises[neighborIndex];
    if (!neighbor) return;
    await swapExerciseOrder(
      { id: exercise.id, exerciseOrder: exercise.exerciseOrder },
      { id: neighbor.id, exerciseOrder: neighbor.exerciseOrder },
    );
    await onChanged();
  }

  function confirmRemove() {
    Alert.alert('Dag verwijderen', `Weet je zeker dat je "${day.name}" wilt verwijderen? Je trainingshistorie blijft bewaard.`, [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijderen', style: 'destructive', onPress: () => removeDay(day.id).then(onChanged) },
    ]);
  }

  return (
    <Card style={styles.dayCard}>
      <View style={styles.dayHeaderRow}>
        <Pressable style={styles.dayTitleWrap} onPress={() => router.push(`/workout/${day.id}`)}>
          <Text style={styles.dayTitle}>
            Dag {day.dayOrder}: {day.name}
          </Text>
        </Pressable>
        {canRemove && (
          <Pressable style={styles.iconButton} onPress={confirmRemove}>
            <TrashIcon size={18} color={colors.danger} />
          </Pressable>
        )}
      </View>

      {day.exercises.map((exercise, index) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          isFirst={index === 0}
          isLast={index === day.exercises.length - 1}
          equipment={equipment}
          onReorder={(direction) => handleReorder(exercise, direction)}
          onSaved={onChanged}
        />
      ))}
    </Card>
  );
}

export default function SchemaScreen() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [program, setProgram] = useState<SchemaProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingDay, setIsAddingDay] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      setProgram(await fetchSchemaProgram(session.user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon je schema niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeDays = program?.days.filter((day) => day.isActive) ?? [];

  async function handleAddDay() {
    if (!program || activeDays.length === 0) return;
    setIsAddingDay(true);
    try {
      await addDay(program, activeDays[0]!.id);
      await load();
    } catch (err) {
      Alert.alert('Toevoegen mislukt', err instanceof Error ? err.message : 'Onbekende fout.');
    } finally {
      setIsAddingDay(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Schema</Text>
            {program ? <Text style={styles.subtitle}>{program.name}</Text> : null}
          </View>
          <Pressable onPress={() => router.push('/switch-goal')}>
            <Text style={styles.switchGoalLink}>Ander doel kiezen</Text>
          </Pressable>
        </View>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && !program && (
          <EmptyState title="Nog geen programma" body="Zodra je de intake afrondt, kun je hier je schema bekijken en aanpassen." />
        )}

        {!isLoading &&
          !error &&
          program &&
          activeDays.map((day) => (
            <DayCard key={day.id} day={day} equipment={profile?.equipment ?? 'gym'} canRemove={activeDays.length > 1} onChanged={load} />
          ))}

        {!isLoading && !error && program && (
          <Pressable style={styles.addDayButton} onPress={handleAddDay} disabled={isAddingDay}>
            <PlusIcon size={18} color={colors.accent} />
            <Text style={styles.addDayButtonText}>{isAddingDay ? 'Bezig...' : 'Dag toevoegen'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    paddingTop: 48,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    ...typography.display,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: spacing.sm,
  },
  switchGoalLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  dayCard: {
    gap: spacing.xs,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayTitleWrap: {
    flex: 1,
  },
  dayTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  iconButton: {
    padding: spacing.xs,
  },
  exerciseRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTextColumn: {
    flex: 1,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  reorderColumn: {
    flexDirection: 'row',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  editPanel: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  editFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editFieldLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  stepperButtonTextDisabled: {
    color: colors.textTertiary,
  },
  stepperValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  candidateRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  candidateText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  addDayButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
