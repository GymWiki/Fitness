-- Phase 1 core schema: intake profile, generated programs, logged workouts,
-- and the adjustment log that backs the "why" explanations in the app.

create type goal as enum ('hypertrophy', 'strength', 'endurance', 'fat_loss', 'mixed');
create type experience_level as enum ('beginner', 'intermediate', 'advanced');
create type equipment_type as enum ('gym', 'home_dumbbells', 'bodyweight');
create type exercise_kind as enum ('strength', 'cardio_duration', 'cardio_interval');
create type program_status as enum ('active', 'completed', 'archived');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  goal goal not null,
  experience_level experience_level not null,
  days_per_week smallint not null check (days_per_week between 2 and 6),
  equipment equipment_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  goal goal not null,
  status program_status not null default 'active',
  template_key text not null,
  started_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_user_id_idx on programs (user_id);

create table program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  day_order smallint not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (program_id, day_order)
);

create table day_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days (id) on delete cascade,
  exercise_order smallint not null,
  exercise_name text not null,
  muscle_group text,
  kind exercise_kind not null,
  sets smallint,
  rep_range_min smallint,
  rep_range_max smallint,
  target_rir smallint,
  exercise_type text,
  cardio_config jsonb,
  progression_rule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (program_day_id, exercise_order)
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_day_id uuid references program_days (id) on delete set null,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index workouts_user_id_idx on workouts (user_id);

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  day_exercise_id uuid not null references day_exercises (id) on delete cascade,
  set_order smallint not null,
  weight_kg numeric(6, 2) not null,
  reps smallint not null,
  rir smallint not null,
  created_at timestamptz not null default now()
);
create index set_logs_workout_id_idx on set_logs (workout_id);
create index set_logs_day_exercise_id_idx on set_logs (day_exercise_id);

create table cardio_logs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  day_exercise_id uuid not null references day_exercises (id) on delete cascade,
  session_type text not null,
  duration_minutes numeric(6, 2) not null,
  distance_km numeric(6, 2),
  rpe smallint not null,
  avg_heart_rate smallint,
  rounds smallint,
  created_at timestamptz not null default now()
);
create index cardio_logs_workout_id_idx on cardio_logs (workout_id);
create index cardio_logs_day_exercise_id_idx on cardio_logs (day_exercise_id);

create table program_adjustments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  day_exercise_id uuid references day_exercises (id) on delete set null,
  adjustment_type text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text not null,
  effective_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index program_adjustments_program_id_idx on program_adjustments (program_id);

-- Row Level Security: every table only exposes rows owned by the requesting user.

alter table profiles enable row level security;
alter table programs enable row level security;
alter table program_days enable row level security;
alter table day_exercises enable row level security;
alter table workouts enable row level security;
alter table set_logs enable row level security;
alter table cardio_logs enable row level security;
alter table program_adjustments enable row level security;

create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage their own programs" on programs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage days of their own programs" on program_days
  for all using (
    exists (select 1 from programs where programs.id = program_days.program_id and programs.user_id = auth.uid())
  ) with check (
    exists (select 1 from programs where programs.id = program_days.program_id and programs.user_id = auth.uid())
  );

create policy "Users manage exercises of their own program days" on day_exercises
  for all using (
    exists (
      select 1 from program_days
      join programs on programs.id = program_days.program_id
      where program_days.id = day_exercises.program_day_id and programs.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from program_days
      join programs on programs.id = program_days.program_id
      where program_days.id = day_exercises.program_day_id and programs.user_id = auth.uid()
    )
  );

create policy "Users manage their own workouts" on workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage set logs of their own workouts" on set_logs
  for all using (
    exists (select 1 from workouts where workouts.id = set_logs.workout_id and workouts.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts where workouts.id = set_logs.workout_id and workouts.user_id = auth.uid())
  );

create policy "Users manage cardio logs of their own workouts" on cardio_logs
  for all using (
    exists (select 1 from workouts where workouts.id = cardio_logs.workout_id and workouts.user_id = auth.uid())
  ) with check (
    exists (select 1 from workouts where workouts.id = cardio_logs.workout_id and workouts.user_id = auth.uid())
  );

create policy "Users read adjustments of their own programs" on program_adjustments
  for select using (
    exists (select 1 from programs where programs.id = program_adjustments.program_id and programs.user_id = auth.uid())
  );
