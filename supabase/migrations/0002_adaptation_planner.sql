-- Weekly adaptation planner: fields needed to compare week-over-week and
-- to shrink a program without ever deleting day_exercises (that would
-- cascade-delete set_logs/cardio_logs and destroy training history).

alter table programs
  add column current_week_number smallint not null default 1;

alter table program_days
  add column is_active boolean not null default true;

alter table program_adjustments
  add column week_number smallint not null default 1,
  add column is_deload boolean not null default false;

create index program_adjustments_program_id_week_number_idx
  on program_adjustments (program_id, week_number);

-- 0001 deliberately left program_adjustments select-only, assuming a
-- server-side process (edge function) would be the one filling it in. The
-- weekly adaptation planner turned out to run client-side instead, gated on
-- explicit user confirmation in the week-review screen, so it needs to be
-- able to write its own rows.
create policy "Users create adjustments for their own programs" on program_adjustments
  for insert with check (
    exists (select 1 from programs where programs.id = program_adjustments.program_id and programs.user_id = auth.uid())
  );
