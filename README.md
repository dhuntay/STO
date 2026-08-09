# Swipe2Order (MVP)

> "You already know what you want. Why order it all over again?"

A no-scroll, self-pickup reorder experience: **open → choose saved meal →
swipe → authenticate → ordered.** Built from the Swipe2Order product concept
summary as a Next.js + TypeScript prototype, backed by Supabase for auth and
data.

## What's implemented

- **Real accounts, per-user data** — email/password sign-up and sign-in via
  Supabase Auth (`app/login/page.tsx`, `components/LoginForm.tsx`). Saved
  meals live in Postgres (`saved_meals` table) with row-level security so
  each account only ever sees its own meals — verified directly against the
  database (one user's insert is invisible to a second user's `select`).
- **Add Meal screen** (`app/meals/new/page.tsx`,
  `components/AddMealForm.tsx`) — logged-in users add a saved meal with
  restaurant, meal name, comma-separated main ingredients, and total price
  (tax included). Writes straight to Supabase, scoped to the signed-in user.
- **No-scroll ordering screen** (`components/OrderingScreen.tsx`) — fits one
  viewport (`h-dvh`, no page scroll). One saved meal gets a hero
  presentation; other saved meals appear as compact thumbnail selectors
  below it, plus a `+ Add meal` tile. An empty state prompts first-time
  users to add a meal before anything else shows.
- **Primary vs. secondary info** — photo, name, restaurant, main
  ingredients, and exact total are always visible. Full ingredient list,
  save date, and a remove action live behind a `More …` bottom sheet
  (`components/MoreInfoSheet.tsx`).
- **Swipe-to-order gesture** (`components/SwipeToOrder.tsx`) — a custom
  pointer-events drag control (mouse + touch), not a tap button. Keyboard
  users get an equivalent via `Enter`/`Space`.
- **Mock device authentication** (`components/AuthModal.tsx`) — completing
  the swipe immediately invokes a *simulated* device authentication
  (face-first with a fingerprint fallback), standing in for the OS-level
  Apple Pay / Google Pay prompt. This is separate from the real Supabase
  login above — it's the one-tap "confirm this specific order" step from
  the product summary. No biometric data is captured or stored.
- **Order confirmation + pickup status**
  (`components/ProcessingScreen.tsx`, `components/ConfirmationScreen.tsx`) —
  a brief "authorizing payment / sending to restaurant" step, then an order
  number and a pickup status tracker (sent → preparing → ready).

## What's stubbed / not real

- **Payment is entirely mocked.** No real Apple Pay, Google Pay, or POS
  (Square/Clover/Toast) integration yet. `AuthModal` and `ProcessingScreen`
  simulate the "one device authentication authorizes payment" flow, but no
  money moves.
- **Device auth is simulated.** The face/fingerprint scan for confirming an
  order is a timed UI animation, not real biometrics. (Real *account* login,
  above, is genuine Supabase Auth — just the per-order confirmation step is
  mocked, per the product direction that Swipe2Order itself should never
  implement biometrics.)
- **Self-pickup only**, per MVP scope — no delivery, driver, or refund
  flows.
- **Restaurant "menu" suggestions are generic, not real.** Google Places
  has no menu API. Once a restaurant is selected via Autocomplete, the Meal
  name field offers common items for that cuisine (curated in
  `lib/cuisineMenu.ts`) — the form says so explicitly, and "Other" always
  falls back to free text.
- **Meal photos fall back to placeholder emoji** when Unsplash search
  returns nothing (or the key isn't configured) — a deterministic
  emoji/gradient is derived from each meal's id (`lib/mealVisuals.ts`) so a
  given meal always looks the same.

## Supabase setup

This repo is linked to Vercel with the Supabase integration, which
auto-syncs these env vars into the Vercel project (Production/Preview):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

For local development, copy `.env.local.example` to `.env.local` and fill
in the values from Supabase Project Settings → API.

The database schema lives in `supabase/migrations/0001_create_saved_meals.sql`
— a `saved_meals` table with row-level security policies scoped to
`auth.uid()`.

**Email confirmation:** new Supabase projects require confirming your email
before you can sign in, by default. If sign-up doesn't drop you straight
into the app, check your inbox for the confirmation link, or turn off
"Confirm email" under Authentication → Providers → Email in the Supabase
dashboard for frictionless local testing.

## Unsplash setup (meal photos)

Each meal's hero photo is searched on Unsplash by meal name and cached on
the row so it's only fetched once. Env var, server-only (never sent to the
browser):

```
UNSPLASH_ACCESS_KEY
```

Get one from https://unsplash.com/oauth/applications. Without this set,
meals just show the emoji/gradient placeholder — nothing breaks. New meals
are photographed at save time; existing meals without a photo are
backfilled the next time `/` loads (see the backfill loop in
`app/page.tsx`). Attribution ("Photo by X on Unsplash", both links pointing
back to Unsplash with `utm_source=swipeorder`) renders under the hero image
whenever a photo is present, per Unsplash's API guidelines — see
`components/PhotoCredit.tsx`. `lib/unsplash.ts` also pings Unsplash's
`download_location` endpoint when a photo is selected, as their guidelines
require.

## Google Places setup (restaurant autocomplete)

The Restaurant field in Add Meal uses the Places Autocomplete widget,
biased to the browser's geolocation (permission requested client-side; the
form still works fine if it's denied). Env var, **must be public** since it
loads in the browser:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

In Google Cloud Console: enable **Maps JavaScript API** and **Places API
(New)** on the project, then restrict the key by **HTTP referrer** to your
`*.vercel.app` domain(s) (and `localhost` for local dev) — it's a
client-side key by necessity, so this restriction is what keeps it from
being freely reusable elsewhere. Without this set, the Restaurant field
just degrades to a plain text input.

Once a restaurant is selected, `lib/cuisineMenu.ts` maps its Google Places
type (e.g. `pizza_restaurant`, `indian_restaurant`) to a curated list of
common items for that cuisine, shown as the Meal name dropdown. There's no
Google API for a restaurant's actual menu — the UI says explicitly that
these are common items for the cuisine, not the restaurant's confirmed
menu, and "Other" always lets you type your own.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Resize your browser to a phone-sized viewport
(or open dev tools device mode) — this is designed as a single-screen
mobile ordering experience.

```bash
npm run build   # production build
npm run lint    # eslint
```

## Project structure

```
app/
  page.tsx              Server component: auth-gates "/", fetches meals, backfills missing photos
  api/meals/route.ts     POST: server-side Unsplash search + Supabase insert (needs the secret key)
  login/page.tsx         Sign-in/sign-up screen (redirects to "/" if already logged in)
  meals/new/page.tsx     Add Meal screen (redirects to "/login" if signed out)
  layout.tsx, globals.css
components/
  OrderingScreen.tsx      Client state machine: idle → authenticating → processing → confirmed
  HeroMealCard.tsx        Hero presentation — real photo or emoji/gradient fallback
  ThumbnailRail.tsx       Compact selectors for other saved meals + "Add meal" tile
  MoreInfoSheet.tsx       Secondary info (ingredients, price, saved date) + remove action
  PhotoCredit.tsx         "Photo by X on Unsplash" attribution line
  SwipeToOrder.tsx        Swipe-to-order gesture control
  AuthModal.tsx           Mock face/fingerprint device authentication (per-order, not login)
  ProcessingScreen.tsx    Mock payment authorization + order-send step
  ConfirmationScreen.tsx  Order number + pickup status tracker
  LoginForm.tsx           Supabase email/password sign-in and sign-up
  AddMealForm.tsx         Add Meal form — Places autocomplete + cuisine menu dropdown
  RestaurantAutocompleteInput.tsx  Google Places Autocomplete, geolocation-biased
  SignOutButton.tsx       Supabase sign-out
lib/
  types.ts               SavedMeal model + Supabase row mapper
  mealVisuals.ts          Deterministic emoji/gradient/ETA per meal id (photo fallback)
  unsplash.ts             Server-only Unsplash search
  googleMaps.ts           Client-side Maps JS loader + geolocation helper
  cuisineMenu.ts          Google Places type → curated common-menu-items
  supabase/               Browser, server, and middleware Supabase clients
middleware.ts             Refreshes the Supabase session cookie on every request
supabase/migrations/      SQL schema + RLS policies
```

## Suggested next steps (per the product direction doc)

Restaurant POS APIs (Square looks most promising first) for real order +
payment, and Apple Pay / Google Pay for real wallet authentication — swapped
in behind the same UI without adding a Swipe2Order-side payment/commission
layer.
