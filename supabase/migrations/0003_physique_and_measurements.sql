-- Richer onboarding: a chosen streeffysiek (mapped 1:1 to the existing
-- `goal` enum in the app layer, see src/lib/physique.ts), a few profile
-- fields useful for calorie/body estimates, and a body-measurements time
-- series so weight/body-fat can be tracked over time instead of as a single
-- overwritten field.

create type target_physique as enum (
  'muscular_athletic',
  'lean_defined',
  'strong_powerful',
  'fit_enduring',
  'balanced_general'
);

create type gender as enum ('male', 'female', 'other');

alter table profiles
  add column display_name text,
  add column target_physique target_physique,
  add column gender gender,
  add column birth_year smallint check (birth_year is null or birth_year between 1900 and 2100),
  add column target_weight_kg numeric(6, 2);

create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(6, 2) not null,
  height_cm numeric(6, 2) not null,
  body_fat_percent numeric(5, 2),
  created_at timestamptz not null default now()
);
create index body_measurements_user_id_idx on body_measurements (user_id, measured_at);

alter table body_measurements enable row level security;

create policy "Users manage their own body measurements" on body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
