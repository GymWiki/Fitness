'use client';

import type { AddableExercise, EquipmentType, ExperienceLevel, Goal } from '@fitness/program-generator';
import { allExercisesForEquipment, candidateExercisesForMuscleGroup, getRepScheme, getWeightIncrementKg } from '@fitness/program-generator';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, EditIcon, InfoIcon, PlusIcon, SwapIcon, TrashIcon } from '@/components/icons';
import type { ScheduledSessionRow } from '@/lib/schedule';
import {
  addExercise,
  removeDay,
  replaceExercise,
  swapExerciseOrder,
  updateExerciseSets,
  type SchemaDay,
  type SchemaExercise,
} from '@/lib/schemaEditor';
import { fetchSchedulePreview, type SchedulePreview, type SchedulePreviewExercise } from '@/lib/scheduleDayPreview';
import { colors } from '@/theme/colors';
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
      <p className="mt-0.5 text-[13px] leading-[19px] text-text-primary">
        Advies: {advice.adviceWeightKg} kg — {advice.adviceExplanation}
      </p>
    ) : (
      <p className="mt-0.5 text-[13px] text-text-tertiary">Nog geen historie voor deze oefening.</p>
    );
  }
  return (
    <p className="mt-0.5 text-[13px] leading-[19px] text-text-primary">
      {advice.sessionType === 'zone2' ? 'Zone 2' : 'Interval'} · circa {advice.durationMinutes} min — {advice.explanation}
    </p>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-lg font-bold text-text-primary disabled:text-text-tertiary"
      >
        –
      </button>
      <span className="min-w-5 text-center text-[15px] font-bold text-text-primary">{value}</span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-lg font-bold text-text-primary disabled:text-text-tertiary"
      >
        +
      </button>
    </div>
  );
}

interface EditDraft {
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
}

/**
 * One exercise on the currently selected day — edit/swap/reorder controls
 * plus the advice line, merged into a single row so a day never needs two
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

  const router = useRouter();
  const isStrength = exercise.kind === 'strength';
  const candidates = exercise.muscleGroup ? candidateExercisesForMuscleGroup(exercise.muscleGroup, equipment, exercise.exerciseName) : [];

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateExerciseSets(exercise.id, draft);
      setIsEditing(false);
      await onSaved();
    } catch (err) {
      window.alert(`Opslaan mislukt: ${err instanceof Error ? err.message : 'Onbekende fout.'}`);
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
      window.alert(`Vervangen mislukt: ${err instanceof Error ? err.message : 'Onbekende fout.'}`);
    } finally {
      setIsSaving(false);
    }
  }

  function openDemo() {
    const params = new URLSearchParams({ name: exercise.exerciseName, muscleGroup: exercise.muscleGroup ?? '' });
    router.push(`/exercise-demo?${params.toString()}`);
  }

  return (
    <div className="border-t border-border py-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-text-primary">{exercise.exerciseName}</p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {isStrength
              ? `${exercise.sets}× ${exercise.repRangeMin}-${exercise.repRangeMax} reps · RIR ${exercise.targetRIR}`
              : KIND_LABEL[exercise.kind]}
          </p>
          <AdviceLine advice={advice} />
        </div>
        <div className="flex">
          <button type="button" disabled={isFirst} onClick={() => onReorder('up')} className="p-1">
            <ChevronUpIcon size={18} color={isFirst ? colors.textTertiary : colors.textSecondary} />
          </button>
          <button type="button" disabled={isLast} onClick={() => onReorder('down')} className="p-1">
            <ChevronDownIcon size={18} color={isLast ? colors.textTertiary : colors.textSecondary} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex gap-4">
        {isStrength && (
          <button type="button" className="flex items-center gap-1 text-[13px] font-semibold text-text-secondary" onClick={() => setIsEditing((v) => !v)}>
            <EditIcon size={14} color={colors.textSecondary} />
            Bewerken
          </button>
        )}
        {candidates.length > 0 && (
          <button type="button" className="flex items-center gap-1 text-[13px] font-semibold text-text-secondary" onClick={() => setIsSwapping((v) => !v)}>
            <SwapIcon size={14} color={colors.textSecondary} />
            Vervang
          </button>
        )}
        <button type="button" className="flex items-center gap-1 text-[13px] font-semibold text-text-secondary" onClick={openDemo}>
          <InfoIcon size={14} color={colors.textSecondary} />
          Demonstratie
        </button>
      </div>

      {isEditing && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-surface-elevated p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Sets</span>
            <Stepper value={draft.sets} min={1} max={8} onChange={(v) => setDraft({ ...draft, sets: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Reps min</span>
            <Stepper value={draft.repRangeMin} min={1} max={draft.repRangeMax} onChange={(v) => setDraft({ ...draft, repRangeMin: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Reps max</span>
            <Stepper value={draft.repRangeMax} min={draft.repRangeMin} max={30} onChange={(v) => setDraft({ ...draft, repRangeMax: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">RIR</span>
            <Stepper value={draft.targetRIR} min={0} max={5} onChange={(v) => setDraft({ ...draft, targetRIR: v })} />
          </div>
          <Button onClick={handleSave} loading={isSaving}>
            Opslaan
          </Button>
        </div>
      )}

      {isSwapping && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-surface-elevated p-3">
          {candidates.map((name) => (
            <button
              key={name}
              type="button"
              className="border-b border-border py-2 text-left text-sm text-text-primary last:border-0"
              onClick={() => handleReplace(name)}
              disabled={isSaving}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Read-only fallback row — used only when a scheduled day's program_day no longer belongs to the active program (e.g. viewing history from before a goal switch), so there's advice but nothing safe to edit. */
function ReadOnlyExerciseRow({ exercise }: { exercise: SchedulePreviewExercise }) {
  const router = useRouter();
  const demoLink = (
    <button
      type="button"
      className="flex items-center gap-1 text-[13px] font-semibold text-text-secondary"
      onClick={() => router.push(`/exercise-demo?${new URLSearchParams({ name: exercise.exerciseName }).toString()}`)}
    >
      <InfoIcon size={14} color={colors.textSecondary} />
      Demonstratie
    </button>
  );

  if (exercise.kind === 'strength') {
    return (
      <Card className="mb-2 flex flex-col gap-1">
        <p className={typography.bodyStrong}>{exercise.exerciseName}</p>
        <p className="text-[13px] text-text-secondary">
          {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps · RIR {exercise.targetRIR}
        </p>
        <AdviceLine advice={exercise} />
        {demoLink}
      </Card>
    );
  }
  return (
    <Card className="mb-2 flex flex-col gap-1">
      <p className={typography.bodyStrong}>{exercise.exerciseName}</p>
      <AdviceLine advice={exercise} />
      {demoLink}
    </Card>
  );
}

/**
 * Picker for "Oefening toevoegen" — the full exercise catalog for the day's
 * equipment, grouped by muscle group, minus whatever's already on the day.
 */
function AddExercisePanel({
  equipment,
  excludeNames,
  onPick,
  isSaving,
}: {
  equipment: EquipmentType;
  excludeNames: Set<string>;
  onPick: (candidate: AddableExercise) => void;
  isSaving: boolean;
}) {
  const candidates = allExercisesForEquipment(equipment).filter((candidate) => !excludeNames.has(candidate.exerciseName));

  return (
    <div className="mt-3 flex flex-col gap-1 rounded-lg bg-surface-elevated p-3">
      {candidates.map((candidate, index) => {
        const showHeader = candidate.muscleGroup !== candidates[index - 1]?.muscleGroup;
        return (
          <div key={candidate.exerciseName}>
            {showHeader && <p className="mt-2 text-xs font-bold uppercase text-text-tertiary">{candidate.muscleGroup}</p>}
            <button
              type="button"
              className="w-full border-b border-border py-2 text-left text-sm text-text-primary last:border-0"
              onClick={() => onPick(candidate)}
              disabled={isSaving}
            >
              {candidate.exerciseName}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Inline info + edit section for the day selected in `WeekCardRow`,
 * rendered directly below it on the Schema page. Re-fetches whenever the
 * selection changes; a short fade (skipped under reduced motion) softens
 * that swap instead of the content just popping in.
 */
export function ScheduleDayDetail({
  userId,
  dateIso,
  row,
  goal,
  experienceLevel,
  schemaDay,
  equipment,
  canRemove,
  onChanged,
}: {
  userId: string;
  dateIso: string;
  row: ScheduledSessionRow | null;
  goal: Goal;
  experienceLevel: ExperienceLevel;
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
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isSavingNewExercise, setIsSavingNewExercise] = useState(false);
  const [isFaded, setIsFaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Resets local UI state for the newly selected day — intentional, not a
    // render-time sync.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsLoading(true);
    setLoadError(null);
    setIsAddingExercise(false);
    /* eslint-enable react-hooks/set-state-in-effect */
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
    // Triggers the fade-back-in transition on day change — intentional, not a render-time sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFaded(true);
    const timer = setTimeout(() => setIsFaded(false), 20);
    return () => clearTimeout(timer);
  }, [dateIso, isLoading]);

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
    if (window.confirm(`Weet je zeker dat je "${day.name}" wilt verwijderen? Je trainingshistorie blijft bewaard.`)) {
      removeDay(day.id).then(onChanged);
    }
  }

  async function handleAddExercise(day: SchemaDay, candidate: AddableExercise) {
    setIsSavingNewExercise(true);
    try {
      const repScheme = getRepScheme(goal, candidate.exerciseType, experienceLevel);
      await addExercise(day.id, day.exercises.length, {
        exerciseName: candidate.exerciseName,
        muscleGroup: candidate.muscleGroup,
        exerciseType: candidate.exerciseType,
        sets: repScheme.sets,
        repRangeMin: repScheme.repRangeMin,
        repRangeMax: repScheme.repRangeMax,
        targetRIR: repScheme.targetRIR,
        weightIncrementKg: getWeightIncrementKg(equipment, candidate.exerciseType),
      });
      setIsAddingExercise(false);
      await onChanged();
    } catch (err) {
      window.alert(`Toevoegen mislukt: ${err instanceof Error ? err.message : 'Onbekende fout.'}`);
    } finally {
      setIsSavingNewExercise(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}

      {!isLoading && loadError && <p className="text-sm text-danger">{loadError}</p>}

      {!isLoading && !loadError && preview && (
        <div className={`transition-opacity duration-200 ${isFaded ? 'opacity-30' : 'opacity-100'}`}>
          {preview.type === 'rest' && (
            <Card className="flex flex-col gap-1">
              <p className={typography.bodyStrong}>Rustdag</p>
              <p className="text-[13px] text-text-secondary">Rust is onderdeel van je plan — geniet ervan, morgen gaat het weer verder.</p>
            </Card>
          )}

          {preview.type === 'training' && (
            <>
              <div className="mb-1 flex items-center justify-between">
                <p className={typography.heading}>{preview.programDayName}</p>
                {schemaDay && canRemove && (
                  <button type="button" className="p-1" onClick={() => confirmRemove(schemaDay)}>
                    <TrashIcon size={18} color={colors.danger} />
                  </button>
                )}
              </div>

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

              {schemaDay && (
                <>
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent py-3 text-sm font-semibold text-accent"
                    onClick={() => setIsAddingExercise((v) => !v)}
                  >
                    <PlusIcon size={16} color={colors.accent} />
                    {isAddingExercise ? 'Annuleren' : 'Oefening toevoegen'}
                  </button>
                  {isAddingExercise && (
                    <AddExercisePanel
                      equipment={equipment}
                      excludeNames={new Set(schemaDay.exercises.map((exercise) => exercise.exerciseName))}
                      onPick={(candidate) => handleAddExercise(schemaDay, candidate)}
                      isSaving={isSavingNewExercise}
                    />
                  )}
                </>
              )}
            </>
          )}

          {row?.programDayId && (
            <div className="mt-2">
              <Button onClick={() => router.push(`/workout/${row.programDayId}`)}>{row.status === 'done' ? 'Bekijk resultaat' : 'Start training'}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
