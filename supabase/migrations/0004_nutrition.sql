-- Nutrition tracking: an Open Food Facts-backed product cache, per-user food
-- logs and favorites. No changes to any training table — this feature reads
-- `profiles`/`body_measurements` for its calorie/macro targets but writes
-- nowhere near the strength/cardio/adaptation-planner data model.

-- `food_products` is a shared cache of publicly-licensed (ODbL) Open Food
-- Facts data, not user-owned data — there is no `user_id` and RLS grants any
-- authenticated user read/write, purely so repeat barcode lookups across
-- users hit this cache instead of the OFF API (staying under its rate
-- limits), the same way any client-side HTTP cache would.
create table food_products (
  barcode text primary key,
  name text not null,
  brand text,
  calories_per_100g numeric(7, 2),
  protein_per_100g numeric(7, 2),
  carbs_per_100g numeric(7, 2),
  fat_per_100g numeric(7, 2),
  fetched_at timestamptz not null default now()
);

create table food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  -- Either a cached product (barcode) or a free-text manual entry (custom_name) — never both null.
  barcode text references food_products (barcode) on delete set null,
  custom_name text,
  quantity_grams numeric(7, 2) not null check (quantity_grams > 0),
  calories numeric(7, 2) not null,
  protein_grams numeric(7, 2) not null,
  carbs_grams numeric(7, 2) not null,
  fat_grams numeric(7, 2) not null,
  created_at timestamptz not null default now(),
  constraint food_logs_has_a_name check (barcode is not null or custom_name is not null)
);
create index food_logs_user_id_logged_at_idx on food_logs (user_id, logged_at);

-- A saved shortcut to re-log a recurring meal in one tap. Snapshots the
-- per-100g macros at save time (not a live join to food_products) so a
-- favorite still works even if that product ever drops out of the cache.
create table food_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  barcode text references food_products (barcode) on delete set null,
  label text not null,
  calories_per_100g numeric(7, 2) not null,
  protein_per_100g numeric(7, 2) not null,
  carbs_per_100g numeric(7, 2) not null,
  fat_per_100g numeric(7, 2) not null,
  created_at timestamptz not null default now()
);
create index food_favorites_user_id_idx on food_favorites (user_id);

alter table food_products enable row level security;
alter table food_logs enable row level security;
alter table food_favorites enable row level security;

create policy "Authenticated users read and populate the shared product cache" on food_products
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users cache products they look up" on food_products
  for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users refresh cached products" on food_products
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Users manage their own food logs" on food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own food favorites" on food_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
