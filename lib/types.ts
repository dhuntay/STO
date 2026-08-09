export type SavedMeal = {
  id: string;
  name: string;
  restaurant: string;
  /** Emoji used as a lightweight stand-in for a hero food photo. */
  emoji: string;
  /** Tailwind gradient classes used behind the hero image. */
  gradient: string;
  mainIngredients: string[];
  price: number;
  tax: number;
  calories: number;
  fullIngredients: string[];
  dietary: string[];
  allergens: string[];
  pickupEtaMinutes: number;
};

export function mealTotal(meal: SavedMeal): number {
  return meal.price + meal.tax;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
