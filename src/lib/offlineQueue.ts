import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { toLocalDateString } from './dates';
import { generateId } from './id';
import { supabase } from './supabase';

const STORAGE_KEY = 'offline_queue_v1';
const RETRY_INTERVAL_MS = 20_000;

export interface CreateWorkoutPayload {
  workoutId: string;
  userId: string;
  programDayId: string;
  performedAt: string;
}

export interface LogSetPayload {
  setLogId: string;
  workoutId: string;
  dayExerciseId: string;
  setOrder: number;
  weightKg: number;
  reps: number;
  rir: number;
}

export interface LogCardioPayload {
  cardioLogId: string;
  workoutId: string;
  dayExerciseId: string;
  sessionType: string;
  durationMinutes: number;
  rpe: number;
  distanceKm?: number;
  avgHeartRate?: number;
  rounds?: number;
}

export interface LogFoodPayload {
  foodLogId: string;
  userId: string;
  loggedAt: string;
  /** Exactly one of barcode/customName is set — a cached product or a free-text manual entry. */
  barcode?: string;
  customName?: string;
  quantityGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export type QueuedAction =
  | { id: string; type: 'create_workout'; payload: CreateWorkoutPayload }
  | { id: string; type: 'log_set'; payload: LogSetPayload }
  | { id: string; type: 'log_cardio'; payload: LogCardioPayload }
  | { id: string; type: 'log_food'; payload: LogFoodPayload };

async function readQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
}

type QueueListener = (pendingCount: number) => void;
const queueListeners = new Set<QueueListener>();

/** Subscribes to pending-count changes (after every enqueue and every synced/failed flush step). Returns an unsubscribe function. */
export function subscribeToQueue(listener: QueueListener): () => void {
  queueListeners.add(listener);
  return () => {
    queueListeners.delete(listener);
  };
}

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  for (const listener of queueListeners) listener(queue.length);
}

/** Every row uses a client-generated id and `upsert`, so retrying a partially-succeeded action is always safe. */
async function runAction(action: QueuedAction): Promise<void> {
  if (action.type === 'create_workout') {
    const { workoutId, userId, programDayId, performedAt } = action.payload;
    const { error } = await supabase
      .from('workouts')
      .upsert({ id: workoutId, user_id: userId, program_day_id: programDayId, performed_at: performedAt });
    if (error) throw error;

    // Marks today's calendar-scheduled session (if any) as done. A no-op update
    // (0 rows affected, no error) when the user has no calendar schedule yet.
    // Deliberately best-effort: the workout itself is already safely persisted
    // above, so a failure here must never block this (or later, FIFO-ordered)
    // queue items from flushing.
    try {
      await supabase
        .from('scheduled_sessions')
        .update({ status: 'done', workout_id: workoutId })
        .eq('user_id', userId)
        .eq('scheduled_date', toLocalDateString(new Date(performedAt)));
    } catch {
      // best-effort, see comment above
    }
    return;
  }

  if (action.type === 'log_set') {
    const { setLogId, workoutId, dayExerciseId, setOrder, weightKg, reps, rir } = action.payload;
    const { error } = await supabase.from('set_logs').upsert({
      id: setLogId,
      workout_id: workoutId,
      day_exercise_id: dayExerciseId,
      set_order: setOrder,
      weight_kg: weightKg,
      reps,
      rir,
    });
    if (error) throw error;
    return;
  }

  if (action.type === 'log_cardio') {
    const { cardioLogId, workoutId, dayExerciseId, sessionType, durationMinutes, rpe, distanceKm, avgHeartRate, rounds } =
      action.payload;
    const { error } = await supabase.from('cardio_logs').upsert({
      id: cardioLogId,
      workout_id: workoutId,
      day_exercise_id: dayExerciseId,
      session_type: sessionType,
      duration_minutes: durationMinutes,
      rpe,
      distance_km: distanceKm ?? null,
      avg_heart_rate: avgHeartRate ?? null,
      rounds: rounds ?? null,
    });
    if (error) throw error;
    return;
  }

  const { foodLogId, userId, loggedAt, barcode, customName, quantityGrams, calories, proteinGrams, carbsGrams, fatGrams } = action.payload;
  const { error } = await supabase.from('food_logs').upsert({
    id: foodLogId,
    user_id: userId,
    logged_at: loggedAt,
    barcode: barcode ?? null,
    custom_name: customName ?? null,
    quantity_grams: quantityGrams,
    calories,
    protein_grams: proteinGrams,
    carbs_grams: carbsGrams,
    fat_grams: fatGrams,
  });
  if (error) throw error;
}

let isFlushing = false;

/**
 * Processes the queue strictly in FIFO order and stops at the first failure.
 * That ordering is what makes offline logging safe: a `log_set` is always
 * enqueued after the `create_workout` it depends on (set_logs.workout_id is
 * a foreign key), so as long as we never skip ahead, the dependency is
 * satisfied by the time we get to it. Safe to call repeatedly/concurrently.
 */
export async function flushQueue(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;
  try {
    let queue = await readQueue();
    while (queue.length > 0) {
      const next = queue[0]!;
      try {
        await runAction(next);
      } catch {
        return; // offline or transient error; retry on the next flush trigger
      }
      queue = queue.slice(1);
      await writeQueue(queue);
    }
  } finally {
    isFlushing = false;
  }
}

export async function enqueue(action: Omit<QueuedAction, 'id'>): Promise<void> {
  const queue = await readQueue();
  queue.push({ ...action, id: generateId() } as QueuedAction);
  await writeQueue(queue);
  void flushQueue();
}

export async function getPendingCount(): Promise<number> {
  return (await readQueue()).length;
}

NetInfo.addEventListener((state) => {
  if (state.isConnected) void flushQueue();
});

setInterval(() => {
  void flushQueue();
}, RETRY_INTERVAL_MS);

void flushQueue();
