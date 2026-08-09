# SwipeOrder (MVP)

> "You already know what you want. Why order it all over again?"

A no-scroll, self-pickup reorder experience: **open → choose saved meal →
swipe → authenticate → ordered.** Built from the SwipeOrder product concept
summary as a Next.js + TypeScript prototype.

## What's implemented

- **No-scroll ordering screen** (`app/page.tsx`) — fits one viewport
  (`h-dvh`, no page scroll). One saved meal gets a hero presentation;
  other saved meals appear as compact thumbnail selectors below it.
- **Primary vs. secondary info** — photo, name, restaurant, main
  ingredients, and exact total (incl. tax) are always visible. Calories,
  full ingredient list, dietary info, and allergens live behind a
  `More …` bottom sheet (`components/MoreInfoSheet.tsx`) so they don't
  clutter the primary screen.
- **Swipe-to-order gesture** (`components/SwipeToOrder.tsx`) — a custom
  pointer-events drag control (mouse + touch), not a tap button, so
  ordering communicates deliberate intent. Keyboard users get an
  equivalent via `Enter`/`Space` on the control.
- **Mock authentication** (`components/AuthModal.tsx`) — completing the
  swipe immediately invokes a simulated device authentication (face-first
  with a fingerprint fallback), standing in for the OS-level Apple
  Pay / Google Pay prompt. One successful auth covers both order
  confirmation and payment authorization — there's no separate checkout
  step. No biometric data is captured or stored; this is a UI stub only.
- **Order confirmation + pickup status**
  (`components/ProcessingScreen.tsx`, `components/ConfirmationScreen.tsx`) —
  after auth, a brief "authorizing payment / sending to restaurant"
  step, then an order number and a pickup status tracker
  (sent → preparing → ready).
- **Saved meals the customer controls** (`lib/meals.ts`) — a small set of
  mock saved meals (no recommendation feed, no sponsored items, no
  cart/checkout maze, no tipping screen), matching the "no unnecessary
  friction" pickup MVP scope from the product summary.

## What's stubbed / not real

- **Payment is entirely mocked.** There is no real Apple Pay, Google Pay,
  or POS (Square/Clover/Toast) integration yet. `AuthModal` and
  `ProcessingScreen` simulate the "one device authentication authorizes
  payment" flow described in the product summary, but no money moves and
  no wallet is contacted.
- **Auth is simulated.** The face/fingerprint scan is a timed UI
  animation, not real biometrics. In production this app should not
  implement or store biometrics itself — that should stay with
  Apple Pay / Google Pay / the OS, per the product direction.
- **No backend/persistence.** Saved meals are hard-coded mock data
  (`lib/meals.ts`). No Supabase, auth accounts, or order history yet.
- **Self-pickup only**, per MVP scope — no delivery, driver, or refund
  flows.

## Suggested next steps (per the product direction doc)

Supabase for Postgres/auth/backend, restaurant POS APIs (Square looks
most promising first) for real order + payment, and Apple Pay / Google
Pay for real wallet authentication — swapped in behind the same UI
without adding a SwipeOrder-side payment/commission layer.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Resize your browser to a phone-sized
viewport (or open dev tools device mode) — this is designed as a
single-screen mobile ordering experience.

```bash
npm run build   # production build
npm run lint    # eslint
```

## Project structure

```
app/
  page.tsx            Screen state machine: idle → authenticating → processing → confirmed
  layout.tsx, globals.css
components/
  HeroMealCard.tsx     Hero presentation for the selected saved meal
  ThumbnailRail.tsx    Compact selectors for other saved meals
  MoreInfoSheet.tsx    Secondary info (calories, full ingredients, dietary, allergens)
  SwipeToOrder.tsx     Swipe-to-order gesture control
  AuthModal.tsx        Mock face/fingerprint device authentication
  ProcessingScreen.tsx Mock payment authorization + order-send step
  ConfirmationScreen.tsx  Order number + pickup status tracker
lib/
  types.ts, meals.ts   SavedMeal model + mock saved meals
```
