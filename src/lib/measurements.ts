import { fetchWithCache } from './offlineCache';
import { supabase } from './supabase';

export interface BodyMeasurement {
  id: string;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  bodyFatPercent: number | null;
}

interface BodyMeasurementRow {
  id: string;
  measured_at: string;
  weight_kg: number;
  height_cm: number;
  body_fat_percent: number | null;
}

function fromRow(row: BodyMeasurementRow): BodyMeasurement {
  return {
    id: row.id,
    measuredAt: row.measured_at,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    bodyFatPercent: row.body_fat_percent,
  };
}

export interface NewMeasurement {
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number | null;
}

/** Every measurement is a new row — this is a time series, never an overwrite of a "current weight" field. */
export async function saveMeasurement(userId: string, input: NewMeasurement): Promise<void> {
  const { error } = await supabase.from('body_measurements').insert({
    user_id: userId,
    weight_kg: input.weightKg,
    height_cm: input.heightCm,
    body_fat_percent: input.bodyFatPercent ?? null,
  });
  if (error) throw error;
}

/** Oldest first, for charting — cached so Profiel/Progressie can still show the last-known trend offline. */
export async function fetchMeasurementHistory(userId: string): Promise<BodyMeasurement[]> {
  return fetchWithCache(`measurements:${userId}`, () => fetchMeasurementHistoryFromNetwork(userId));
}

async function fetchMeasurementHistoryFromNetwork(userId: string): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('id, measured_at, weight_kg, height_cm, body_fat_percent')
    .eq('user_id', userId)
    .order('measured_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as BodyMeasurementRow));
}
