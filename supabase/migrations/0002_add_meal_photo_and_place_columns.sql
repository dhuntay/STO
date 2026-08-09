-- Unsplash photo + credit fields, and Google Places metadata captured when
-- a meal is saved (restaurant address/place id, cuisine type used to derive
-- the common-menu-item dropdown).
alter table public.saved_meals
  add column if not exists image_url text,
  add column if not exists image_photographer_name text,
  add column if not exists image_photographer_url text,
  add column if not exists image_unsplash_url text,
  add column if not exists restaurant_address text,
  add column if not exists restaurant_place_id text,
  add column if not exists cuisine_type text;
