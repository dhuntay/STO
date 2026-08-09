-- Saved meals, scoped per authenticated user via RLS.
create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  restaurant text not null check (char_length(trim(restaurant)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  main_ingredients text[] not null default '{}',
  price numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index saved_meals_user_id_idx on public.saved_meals (user_id);

alter table public.saved_meals enable row level security;

create policy "Users can view their own saved meals"
  on public.saved_meals for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own saved meals"
  on public.saved_meals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own saved meals"
  on public.saved_meals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved meals"
  on public.saved_meals for delete
  to authenticated
  using (auth.uid() = user_id);
