-- Raises the training-frequency ceiling from 6 to 7 days/week. The
-- `days_per_week` check constraint was defined inline in 0001_init.sql
-- (unnamed, so Postgres auto-named it `profiles_days_per_week_check`) —
-- drop it by that default name and replace it with a named constraint
-- covering 2-7.

alter table profiles
  drop constraint profiles_days_per_week_check;

alter table profiles
  add constraint profiles_days_per_week_check check (days_per_week between 2 and 7);
