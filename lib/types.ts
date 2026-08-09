export type SavedMeal = {
  id: string;
  userId: string;
  restaurant: string;
  name: string;
  mainIngredients: string[];
  /** Total price, tax included, as entered by the user. */
  price: number;
  createdAt: string;
};

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
