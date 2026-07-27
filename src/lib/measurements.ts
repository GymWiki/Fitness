import { getAllAsync, runAsync } from './db';
import { generateId } from './id';

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
export async function saveMeasurement(input: NewMeasurement): Promise<void> {
  const now = new Date().toISOString();
  await runAsync(
    `insert into body_measurements (id, measured_at, weight_kg, height_cm, body_fat_percent, created_at)
     values (?, ?, ?, ?, ?, ?)`,
    [generateId(), now.slice(0, 10), input.weightKg, input.heightCm, input.bodyFatPercent ?? null, now],
  );
}

/** Oldest first, for charting. */
export async function fetchMeasurementHistory(): Promise<BodyMeasurement[]> {
  const rows = await getAllAsync<BodyMeasurementRow>(
    'select id, measured_at, weight_kg, height_cm, body_fat_percent from body_measurements order by measured_at asc',
  );
  return rows.map(fromRow);
}
