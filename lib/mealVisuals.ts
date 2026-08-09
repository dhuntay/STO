// Saved meals only store the facts a customer types in (restaurant, name,
// ingredients, price). The hero photo, accent color, and pickup ETA are
// derived deterministically from the meal id so the same meal always looks
// the same without needing an image upload step in the MVP.

const PALETTE: { emoji: string; gradient: string }[] = [
  { emoji: "🍕", gradient: "from-orange-400 via-red-400 to-rose-500" },
  { emoji: "🍛", gradient: "from-amber-400 via-orange-400 to-red-400" },
  { emoji: "☕", gradient: "from-yellow-200 via-amber-300 to-orange-400" },
  { emoji: "🍜", gradient: "from-lime-400 via-yellow-400 to-amber-500" },
  { emoji: "🍔", gradient: "from-amber-500 via-orange-500 to-red-600" },
  { emoji: "🥗", gradient: "from-lime-300 via-green-400 to-emerald-500" },
  { emoji: "🍣", gradient: "from-rose-300 via-pink-400 to-fuchsia-500" },
  { emoji: "🌮", gradient: "from-yellow-400 via-orange-400 to-amber-600" },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function mealVisual(id: string): { emoji: string; gradient: string } {
  return PALETTE[hashString(id) % PALETTE.length];
}

/** Deterministic pseudo pickup ETA (8-18 min) for the confirmation screen. */
export function estimatePickupMinutes(id: string): number {
  return 8 + (hashString(id) % 11);
}
