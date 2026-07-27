import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'fitness.db';

// Bumping this only adds a new entry to MIGRATIONS below — never edit a
// migration that has already shipped, exactly like the old supabase/migrations
// numbering discipline this replaces.
const MIGRATIONS: string[] = [
  `
  create table profiles (
    id text primary key,
    goal text not null,
    experience_level text not null,
    days_per_week integer not null,
    equipment text not null,
    display_name text,
    target_physique text,
    gender text,
    birth_year integer,
    target_weight_kg real,
    preferred_weekdays text,
    created_at text not null,
    updated_at text not null
  );

  create table programs (
    id text primary key,
    name text not null,
    goal text not null,
    status text not null default 'active',
    template_key text not null,
    started_at text not null,
    current_week_number integer not null default 1,
    created_at text not null,
    updated_at text not null
  );

  create table program_days (
    id text primary key,
    program_id text not null references programs (id) on delete cascade,
    day_order integer not null,
    name text not null,
    is_active integer not null default 1,
    created_at text not null,
    unique (program_id, day_order)
  );

  create table day_exercises (
    id text primary key,
    program_day_id text not null references program_days (id) on delete cascade,
    exercise_order integer not null,
    exercise_name text not null,
    muscle_group text,
    kind text not null,
    sets integer,
    rep_range_min integer,
    rep_range_max integer,
    target_rir integer,
    exercise_type text,
    cardio_config text,
    progression_rule text not null default '{}',
    created_at text not null,
    unique (program_day_id, exercise_order)
  );

  create table workouts (
    id text primary key,
    program_day_id text references program_days (id) on delete set null,
    performed_at text not null,
    created_at text not null
  );

  create table set_logs (
    id text primary key,
    workout_id text not null references workouts (id) on delete cascade,
    day_exercise_id text not null references day_exercises (id) on delete cascade,
    set_order integer not null,
    weight_kg real not null,
    reps integer not null,
    rir integer not null,
    created_at text not null
  );
  create index set_logs_workout_id_idx on set_logs (workout_id);
  create index set_logs_day_exercise_id_idx on set_logs (day_exercise_id);

  create table cardio_logs (
    id text primary key,
    workout_id text not null references workouts (id) on delete cascade,
    day_exercise_id text not null references day_exercises (id) on delete cascade,
    session_type text not null,
    duration_minutes real not null,
    distance_km real,
    rpe integer not null,
    avg_heart_rate integer,
    rounds integer,
    created_at text not null
  );
  create index cardio_logs_workout_id_idx on cardio_logs (workout_id);
  create index cardio_logs_day_exercise_id_idx on cardio_logs (day_exercise_id);

  create table program_adjustments (
    id text primary key,
    program_id text not null references programs (id) on delete cascade,
    day_exercise_id text references day_exercises (id) on delete set null,
    adjustment_type text not null,
    previous_value text,
    new_value text,
    reason text not null,
    effective_at text not null,
    week_number integer not null default 1,
    is_deload integer not null default 0,
    created_at text not null
  );
  create index program_adjustments_program_id_idx on program_adjustments (program_id);

  create table body_measurements (
    id text primary key,
    measured_at text not null,
    weight_kg real not null,
    height_cm real not null,
    body_fat_percent real,
    created_at text not null
  );
  create index body_measurements_measured_at_idx on body_measurements (measured_at);

  create table scheduled_sessions (
    id text primary key,
    program_id text not null references programs (id) on delete cascade,
    scheduled_date text not null unique,
    program_day_id text references program_days (id) on delete set null,
    status text not null default 'planned',
    workout_id text references workouts (id) on delete set null,
    created_at text not null
  );
  create index scheduled_sessions_program_id_idx on scheduled_sessions (program_id);
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  return (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = versionRow?.user_version ?? 0;

    for (let version = currentVersion + 1; version <= MIGRATIONS.length; version += 1) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(MIGRATIONS[version - 1]);
      });
      await db.execAsync(`PRAGMA user_version = ${version}`);
    }

    return db;
  })();
}

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = openAndMigrate();
  return dbPromise;
}

export type SqlParams = SQLite.SQLiteBindParams;

export async function execAsync(sql: string): Promise<void> {
  const db = await getDb();
  await db.execAsync(sql);
}

export async function runAsync(sql: string, params: SqlParams = []): Promise<SQLite.SQLiteRunResult> {
  const db = await getDb();
  return db.runAsync(sql, params);
}

export async function getAllAsync<T>(sql: string, params: SqlParams = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function getFirstAsync<T>(sql: string, params: SqlParams = []): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<T>(sql, params);
  return row ?? null;
}

/**
 * Real SQLite transaction — unlike the old supabase-js client, multi-table
 * writes (e.g. inserting a program + its days + its exercises) can now
 * actually roll back together on failure instead of leaving partial rows.
 */
export async function withTransactionAsync<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDb();
  let result!: T;
  await db.withTransactionAsync(async () => {
    result = await fn();
  });
  return result as T;
}
