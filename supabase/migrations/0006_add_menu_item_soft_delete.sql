-- menu_items can't be hard-deleted once a real order references them --
-- order_items.menu_item_id is a not-null FK, by design, so historical
-- orders keep their item details even after a truck stops offering that
-- item. "Remove" in the Operator dashboard sets this flag instead of
-- DELETEing the row; every query that embeds menu_items(...) filters it
-- out via lib/trucks.ts's mapTruckRow, and POST /api/orders re-checks it
-- server-side so a removed item can never be ordered even via a stale
-- saved_meal link.
alter table public.menu_items
  add column is_removed boolean not null default false;

comment on column public.menu_items.is_removed is
  'Soft-delete flag. Removed items are hidden everywhere (dashboard, discovery, ordering) but the row stays so past order_items keep valid data.';
