-- Calendar-based training schedule: ties program days to real calendar
-- dates instead of pure day-count rotation, so "is today a training day,
-- and which one" has a concrete answer instead of a guess. Adds a rolling
-- ~2-week window per user, generated client-side by
-- `src/lib/schedule.ts` (via `distributeSessions`/`buildScheduleDates` in
-- @fitness/adaptation-planner) — this migration only adds the storage for
-- it, no server-side scheduling logic.

alter table profiles
  add column preferred_weekdays smallint[];

-- 1 = Monday .. 7 = Sunday, matching @fitness/adaptation-planner's Weekday type.
-- Null means "not set yet" (existing accounts, or anyone who skipped the
-- step) — every consumer of this column treats null as "calendar scheduling
-- not available for this user", falling back to the pre-existing day-count
-- rotation rather than failing.
alter table profiles
  add constraint preferred_weekdays_length check (
    preferred_weekdays is null or cardinality(preferred_weekdays) = days_per_week
  ),
  add constraint preferred_weekdays_range check (
    preferred_weekdays is null or preferred_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  );

create type scheduled_session_status as enum ('planned', 'done', 'missed', 'rest');

create table scheduled_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references programs (id) on delete cascade,
  scheduled_date date not null,
  -- Null means a plain rest day. Set to a specific program_day for both
  -- strength and cardio-only days (the generator gives cardio its own
  -- program_days rows, so this needs no separate cardio-session reference).
  program_day_id uuid references program_days (id) on delete set null,
  status scheduled_session_status not null default 'planned',
  -- Backlink once completed, so a scheduled day and the workout that
  -- fulfilled it can be traced in either direction.
  workout_id uuid references workouts (id) on delete set null,
  created_at timestamptz not null default now(),
  -- A user has exactly one plan for any given calendar day, regardless of
  -- which program it belongs to — this is what makes switching goals or
  -- applying a weekly adjustment (both of which delete and regenerate
  -- future rows) collision-free.
  unique (user_id, scheduled_date)
);
create index scheduled_sessions_user_id_date_idx on scheduled_sessions (user_id, scheduled_date);
create index scheduled_sessions_program_id_idx on scheduled_sessions (program_id);

alter table scheduled_sessions enable row level security;

create policy "Users manage their own scheduled sessions" on scheduled_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
