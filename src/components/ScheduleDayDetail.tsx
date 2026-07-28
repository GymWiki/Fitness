import type { EquipmentType, Goal } from '@fitness/program-generator';
import { candidateExercisesForMuscleGroup } from '@fitness/program-generator';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDownIcon, ChevronUpIcon, EditIcon, SwapIcon, TrashIcon } from '@/components/icons';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { ScheduledSessionRow } from '@/lib/schedule';
import { removeDay, replaceExercise, swapExerciseOrder, updateExerciseSets, type SchemaDay, type SchemaExercise } from '@/lib/schemaEditor';
import { fetchSchedulePreview, type SchedulePreview, type SchedulePreviewExercise } from '@/lib/scheduleDayPreview';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Button } from './Button';
import { Card } from './Card';

const KIND_LABEL: Record<SchemaExercise['kind'], string> = {
  strength: 'Kracht',
  cardio_duration: 'Cardio',
  cardio_interval: 'Cardio (intervallen)',
};

function AdviceLine({ advice }: { advice: SchedulePreviewExercise | undefined }) {
  if (!advice) return null;
  if (advice.kind === 'strength') {
    return advice.adviceWeightKg !== null ? (
      <Text style={styles.adviceLine}>
        Advies: {advice.adviceWeightKg} kg — {advice.adviceExplanation}
      </Text>
    ) : (
      <Text style={styles.adviceLineMuted}>Nog geen historie voor deze oefening.</Text>
    );
  }
  return (
    <Text style={styles.adviceLine}>
      {advice.sessionType === 'zone2' ? 'Zone 2' : 'Interval'} · circa {advice.durationMinutes} min — {advice.explanation}
    </Text>
  );
}

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

/**
 * One exercise on the currently selected day — the same edit/swap/reorder
 * controls the old full-week schema list had, plus the advice line the
 * read-only preview had, merged into a single row so a day never needs two
 * separate representations on the page.
 */
function EditableExerciseRow({
  exercise,
  advice,
  isFirst,
  isLast,
  equipment,
  onReorder,
  onSaved,
}: {
  exercise: SchemaExercise;
  advice: SchedulePreviewExercise | undefined;
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
          <AdviceLine advice={advice} />
        </View>
        <View style={styles.reorderColumn}>
          <Pressable disabled={isFirst} onPress={() => onReorder('up')} style={styles.iconButton} hitSlop={10}>
            <ChevronUpIcon size={18} color={isFirst ? colors.textTertiary : colors.textSecondary} />
          </Pressable>
          <Pressable disabled={isLast} onPress={() => onReorder('down')} style={styles.iconButton} hitSlop={10}>
            <ChevronDownIcon size={18} color={isLast ? colors.textTertiary : colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.exerciseActionRow}>
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

/** Read-only fallback row — used only when a scheduled day's program_day no longer belongs to the active program (e.g. viewing history from before a goal switch), so there's advice but nothing safe to edit. */
function ReadOnlyExerciseRow({ exercise }: { exercise: SchedulePreviewExercise }) {
  if (exercise.kind === 'strength') {
    return (
      <Card style={styles.exerciseCard}>
        <Text style={typography.bodyStrong}>{exercise.exerciseName}</Text>
        <Text style={styles.exerciseTarget}>
          {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps · RIR {exercise.targetRIR}
        </Text>
        <AdviceLine advice={exercise} />
      </Card>
    );
  }
  return (
    <Card style={styles.exerciseCard}>
      <Text style={typography.bodyStrong}>{exercise.exerciseName}</Text>
      <AdviceLine advice={exercise} />
    </Card>
  );
}

/**
 * Inline info + edit section for the day selected in `WeekCardRow`,
 * rendered directly below it on the Schema page — replaces both the old
 * `/schedule-day/[date]` modal and the separate full-week editable list
 * (every day rendered at once). Re-fetches whenever the selection changes;
 * a short fade (skipped under reduced motion) softens that swap instead of
 * the content just popping in.
 */
export function ScheduleDayDetail({
  userId,
  dateIso,
  row,
  goal,
  schemaDay,
  equipment,
  canRemove,
  onChanged,
}: {
  userId: string;
  dateIso: string;
  row: ScheduledSessionRow | null;
  goal: Goal;
  /** The editable program day matching `row.programDayId`, or null when there's nothing to edit (rest day, or the row's day no longer belongs to the active program). */
  schemaDay: SchemaDay | null;
  equipment: EquipmentType;
  canRemove: boolean;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    (async () => {
      try {
        if (!row) {
          if (!cancelled) setPreview({ type: 'rest' });
          return;
        }
        const result = await fetchSchedulePreview(userId, row, goal);
        if (cancelled) return;
        if (!result) {
          setLoadError('Kon deze dag niet laden.');
          return;
        }
        setPreview(result);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Kon deze dag niet laden.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- row's identity churns on every parent refetch; only its content matters here.
  }, [userId, dateIso, row?.id, row?.programDayId, row?.status, goal]);

  useEffect(() => {
    if (isLoading) return;
    if (reducedMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0.3);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [dateIso, isLoading, reducedMotion, fade]);

  async function handleReorder(day: SchemaDay, exercise: SchemaExercise, direction: 'up' | 'down') {
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

  function confirmRemove(day: SchemaDay) {
    Alert.alert('Dag verwijderen', `Weet je zeker dat je "${day.name}" wilt verwijderen? Je trainingshistorie blijft bewaard.`, [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijderen', style: 'destructive', onPress: () => removeDay(day.id).then(onChanged) },
    ]);
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      )}

      {!isLoading && loadError && <Text style={styles.error}>{loadError}</Text>}

      {!isLoading && !loadError && preview && (
        <Animated.View style={{ opacity: fade }}>
          {preview.type === 'rest' && (
            <Card style={styles.restCard}>
              <Text style={typography.bodyStrong}>Rustdag</Text>
              <Text style={styles.exerciseTarget}>Rust is onderdeel van je plan — geniet ervan, morgen gaat het weer verder.</Text>
            </Card>
          )}

          {preview.type === 'training' && (
            <>
              <View style={styles.dayHeaderRow}>
                <Text style={styles.programDayName}>{preview.programDayName}</Text>
                {schemaDay && canRemove && (
                  <Pressable style={styles.iconButton} onPress={() => confirmRemove(schemaDay)} hitSlop={10}>
                    <TrashIcon size={18} color={colors.danger} />
                  </Pressable>
                )}
              </View>

              {schemaDay
                ? schemaDay.exercises.map((exercise, index) => (
                    <EditableExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      advice={preview.exercises[index]}
                      isFirst={index === 0}
                      isLast={index === schemaDay.exercises.length - 1}
                      equipment={equipment}
                      onReorder={(direction) => handleReorder(schemaDay, exercise, direction)}
                      onSaved={onChanged}
                    />
                  ))
                : preview.exercises.map((exercise, index) => <ReadOnlyExerciseRow key={`${exercise.exerciseName}-${index}`} exercise={exercise} />)}
            </>
          )}

          {row?.programDayId && (
            <View style={styles.actionRow}>
              <Button onPress={() => router.push(`/workout/${row.programDayId}`)}>
                {row.status === 'done' ? 'Bekijk resultaat' : 'Start training'}
              </Button>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  loadingRow: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  programDayName: {
    ...typography.heading,
  },
  iconButton: {
    padding: spacing.xs,
  },
  exerciseCard: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  exerciseTarget: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  adviceLine: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  adviceLineMuted: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  restCard: {
    gap: spacing.xs,
  },
  actionRow: {
    marginTop: spacing.sm,
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
  exerciseActionRow: {
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
    width: 44,
    height: 44,
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
});
