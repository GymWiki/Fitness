import type { DailyProteinTotal } from '@fitness/nutrition-engine';
import { enqueue } from './offlineQueue';
import { fetchWithCache } from './offlineCache';
import { generateId } from './id';
import { supabase } from './supabase';

export interface NewFoodLogEntry {
  /** Exactly one of barcode/customName is set — a cached product or a free-text manual entry. */
  barcode?: string;
  customName?: string;
  quantityGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface FoodLogEntry {
  id: string;
  loggedAt: string;
  name: string;
  barcode: string | null;
  quantityGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

interface FoodLogRow {
  id: string;
  logged_at: string;
  barcode: string | null;
  custom_name: string | null;
  quantity_grams: number;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  food_products: { name: string } | { name: string }[] | null;
}

function productName(row: FoodLogRow): string {
  if (row.custom_name) return row.custom_name;
  const joined = Array.isArray(row.food_products) ? row.food_products[0] : row.food_products;
  return joined?.name ?? 'Onbekend product';
}

function fromRow(row: FoodLogRow): FoodLogEntry {
  return {
    id: row.id,
    loggedAt: row.logged_at,
    name: productName(row),
    barcode: row.barcode,
    quantityGrams: row.quantity_grams,
    calories: row.calories,
    proteinGrams: row.protein_grams,
    carbsGrams: row.carbs_grams,
    fatGrams: row.fat_grams,
  };
}

/** Queues a food log entry — same offline-first pattern as workout logging: writes locally first, syncs when back online. */
export async function logFood(userId: string, entry: NewFoodLogEntry): Promise<void> {
  await enqueue({
    type: 'log_food',
    payload: {
      foodLogId: generateId(),
      userId,
      loggedAt: new Date().toISOString(),
      barcode: entry.barcode,
      customName: entry.customName,
      quantityGrams: entry.quantityGrams,
      calories: entry.calories,
      proteinGrams: entry.proteinGrams,
      carbsGrams: entry.carbsGrams,
      fatGrams: entry.fatGrams,
    },
  });
}

function dayRangeIso(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Every item logged on the given local day, most recent first. Cached so today's log is still visible offline. */
export async function fetchFoodLogsForDate(userId: string, date: Date): Promise<FoodLogEntry[]> {
  const dayKey = date.toISOString().slice(0, 10);
  return fetchWithCache(`food_logs:${userId}:${dayKey}`, () => fetchFoodLogsForDateFromNetwork(userId, date));
}

async function fetchFoodLogsForDateFromNetwork(userId: string, date: Date): Promise<FoodLogEntry[]> {
  const { start, end } = dayRangeIso(date);
  const { data, error } = await supabase
    .from('food_logs')
    .select('id, logged_at, barcode, custom_name, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, food_products (name)')
    .eq('user_id', userId)
    .gte('logged_at', start)
    .lt('logged_at', end)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as FoodLogRow));
}

/** Online-only, like the rest of the schema-editing surface — a delete doesn't need offline-queue support the way logging mid-workout does. */
export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}

export interface DaySummary {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export function summarizeDay(entries: FoodLogEntry[]): DaySummary {
  return entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + entry.calories,
      proteinGrams: sum.proteinGrams + entry.proteinGrams,
      carbsGrams: sum.carbsGrams + entry.carbsGrams,
      fatGrams: sum.fatGrams + entry.fatGrams,
    }),
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );
}

/** Most recently logged distinct items (by barcode, or by name for manual entries), for the "Recent gelogd" one-tap re-log row. */
export async function fetchRecentFoodLogs(userId: string, limit = 10): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('id, logged_at, barcode, custom_name, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, food_products (name)')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  const entries = (data ?? []).map((row) => fromRow(row as FoodLogRow));
  const seen = new Set<string>();
  const deduped: FoodLogEntry[] = [];
  for (const entry of entries) {
    const key = entry.barcode ?? entry.name;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

/**
 * Total protein logged per day over the last `days` days, oldest first —
 * feeds `detectProteinShortfall`. Only days with at least one logged item
 * are included: a day with zero entries usually means the user simply
 * didn't open the app, not that they deliberately ate zero protein, so it
 * shouldn't count as a shortfall day.
 */
export async function fetchRecentDailyProteinTotals(userId: string, days = 7): Promise<DailyProteinTotal[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('food_logs')
    .select('logged_at, protein_grams')
    .eq('user_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });
  if (error) throw error;

  const totalsByDay = new Map<string, number>();
  for (const row of data ?? []) {
    const dayKey = (row.logged_at as string).slice(0, 10);
    totalsByDay.set(dayKey, (totalsByDay.get(dayKey) ?? 0) + (row.protein_grams as number));
  }
  return [...totalsByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, proteinGrams]) => ({ date, proteinGrams }));
}
