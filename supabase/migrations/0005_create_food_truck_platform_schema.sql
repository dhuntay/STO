-- Food truck platform core schema: trucks, their menus, pickup windows,
-- orders, payments, and pickup verification. This is the schema for the
-- food-truck-scoped rebuild (see STO_Consolidated_Context.md in the
-- project) and sits alongside the existing saved_meals feature, which
-- predates the pivot and is not touched by this migration.

-- ---------------------------------------------------------------------
-- profiles
-- One row per Supabase auth user. `role` distinguishes a customer from a
-- truck owner for RLS and app routing. A user is one or the other in MVP
-- (no shared/staff logins yet -- see Future Expansion in the context doc).
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'truck_owner')),
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row for every new account, same pattern as
-- seed_default_meals() in 0003. security definer so it can insert past
-- RLS; execute is revoked from client roles below since it must only run
-- as an auth.users trigger.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
exception
  when others then
    -- Profile creation is required for the app to function, but a failure
    -- here should still never block account creation itself.
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

revoke execute on function public.handle_new_user_profile() from public;
revoke execute on function public.handle_new_user_profile() from anon;
revoke execute on function public.handle_new_user_profile() from authenticated;

-- ---------------------------------------------------------------------
-- trucks
-- A truck's static profile plus its "today" operational state (location,
-- hours, open/closed, pickup availability). Kept on one row for MVP --
-- see context doc Section 5 candidate additions for a future recurring
-- schedule / location-history table.
-- ---------------------------------------------------------------------
create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  name text not null check (char_length(trim(name)) > 0),
  cuisine text,
  description text,
  photo_url text,

  -- Operator/Admin Web UI controls (context doc Section 5)
  current_location_label text,
  current_lat double precision,
  current_lng double precision,
  opens_at time,
  closes_at time,
  is_open boolean not null default false,
  accepting_pickup boolean not null default false,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trucks_owner_id_idx on public.trucks (owner_id);
create index trucks_is_active_idx on public.trucks (is_active) where is_active;

alter table public.trucks enable row level security;

create policy "Anyone can view active trucks"
  on public.trucks for select
  to anon, authenticated
  using (is_active);

create policy "Owners can view their own truck"
  on public.trucks for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Owners can create their own truck"
  on public.trucks for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update their own truck"
  on public.trucks for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their own truck"
  on public.trucks for delete
  to authenticated
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- menu_items
-- Owner-entered, fixed values -- no modifiers/options in MVP (see context
-- doc Section 5, "Menu item creation"). These are exactly what populate
-- the customer-facing item dropdown once a truck is selected.
-- ---------------------------------------------------------------------
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,

  name text not null check (char_length(trim(name)) > 0),
  price numeric(10,2) not null check (price >= 0),
  main_ingredients text[] not null default '{}',
  photo_url text,

  is_available_today boolean not null default true,
  is_sold_out boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_truck_id_idx on public.menu_items (truck_id);

alter table public.menu_items enable row level security;

create policy "Anyone can view menu items for active trucks"
  on public.menu_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.trucks t
      where t.id = menu_items.truck_id and t.is_active
    )
  );

create policy "Owners can manage their own truck's menu items"
  on public.menu_items for all
  to authenticated
  using (
    exists (
      select 1 from public.trucks t
      where t.id = menu_items.truck_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trucks t
      where t.id = menu_items.truck_id and t.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- pickup_windows
-- Lightweight for MVP: capacity is optional (null = unlimited). Slot
-- generation/capacity management is not yet an Operator/Admin UI control
-- (see context doc Section 5 candidate additions) -- this table exists so
-- the customer-facing "select pickup window" step has something real to
-- select from once that decision is made.
-- ---------------------------------------------------------------------
create table public.pickup_windows (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,

  window_start timestamptz not null,
  window_end timestamptz not null,
  capacity int,
  orders_count int not null default 0,

  created_at timestamptz not null default now(),
  check (window_end > window_start)
);

create index pickup_windows_truck_id_idx on public.pickup_windows (truck_id, window_start);

alter table public.pickup_windows enable row level security;

create policy "Anyone can view pickup windows for active trucks"
  on public.pickup_windows for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.trucks t
      where t.id = pickup_windows.truck_id and t.is_active
    )
  );

create policy "Owners can manage their own truck's pickup windows"
  on public.pickup_windows for all
  to authenticated
  using (
    exists (
      select 1 from public.trucks t
      where t.id = pickup_windows.truck_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trucks t
      where t.id = pickup_windows.truck_id and t.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- orders / order_items
-- order_items supports multi-item orders (customer process step 4,
-- "Select items", is plural -- unlike the old single-saved-meal model).
-- price_at_order / name_at_order are snapshots so an order's history
-- stays accurate even if a menu item's price changes or it's removed
-- later.
-- ---------------------------------------------------------------------
create type public.order_status as enum (
  'created',
  'payment_pending',
  'paid',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
  'cancelled_refunded'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  truck_id uuid not null references public.trucks(id) on delete restrict,
  pickup_window_id uuid references public.pickup_windows(id) on delete set null,

  status public.order_status not null default 'created',
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  order_number text not null unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_truck_id_status_idx on public.orders (truck_id, status);

alter table public.orders enable row level security;

create policy "Customers can view their own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = customer_id);

create policy "Truck owners can view orders placed at their truck"
  on public.orders for select
  to authenticated
  using (
    exists (
      select 1 from public.trucks t
      where t.id = orders.truck_id and t.owner_id = auth.uid()
    )
  );

create policy "Customers can create their own orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = customer_id);

-- Customers may only cancel while the order hasn't progressed past
-- "created" (i.e. before payment). All later transitions (accepted,
-- preparing, ready, picked_up) belong to the truck side.
create policy "Customers can cancel their own unpaid orders"
  on public.orders for update
  to authenticated
  using (auth.uid() = customer_id and status = 'created')
  with check (auth.uid() = customer_id and status = 'cancelled_refunded');

create policy "Truck owners can progress orders placed at their truck"
  on public.orders for update
  to authenticated
  using (
    exists (
      select 1 from public.trucks t
      where t.id = orders.truck_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trucks t
      where t.id = orders.truck_id and t.owner_id = auth.uid()
    )
  );

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  price_at_order numeric(10,2) not null,
  name_at_order text not null
);

create index order_items_order_id_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

create policy "Order participants can view order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1 from public.trucks t
            where t.id = o.truck_id and t.owner_id = auth.uid()
          )
        )
    )
  );

create policy "Customers can add items to their own orders"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- payments
-- Deliberately no insert/update policy for anon or authenticated: a
-- payment's status should only ever be written by a trusted server
-- context (a Supabase Edge Function using the service role key, driven
-- by Square webhooks), never directly by a client. Rows are readable by
-- the two parties to the order.
-- ---------------------------------------------------------------------
create type public.payment_provider as enum ('square');
create type public.payment_status as enum ('pending', 'authorized', 'captured', 'failed', 'refunded');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider public.payment_provider not null default 'square',
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  amount numeric(10,2) not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);

alter table public.payments enable row level security;

create policy "Order participants can view payments"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1 from public.trucks t
            where t.id = o.truck_id and t.owner_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------
-- verifications
-- Face-primary/thumb-fallback pickup verification (context doc Section
-- 8). Recorded by the truck's operator device at pickup, not by the
-- customer.
-- ---------------------------------------------------------------------
create type public.verification_method as enum ('face', 'thumb');

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.verification_method not null,
  succeeded boolean not null,
  staff_override boolean not null default false,
  verified_at timestamptz not null default now()
);

create index verifications_order_id_idx on public.verifications (order_id);

alter table public.verifications enable row level security;

create policy "Order participants can view verification events"
  on public.verifications for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = verifications.order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1 from public.trucks t
            where t.id = o.truck_id and t.owner_id = auth.uid()
          )
        )
    )
  );

create policy "Truck owners can record verification events for their own orders"
  on public.verifications for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      join public.trucks t on t.id = o.truck_id
      where o.id = verifications.order_id and t.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trucks_set_updated_at before update on public.trucks
  for each row execute function public.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
