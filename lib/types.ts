export type SavedMeal = {
  id: string;
  userId: string;
  restaurant: string;
  name: string;
  mainIngredients: string[];
  /** Total price, tax included, as entered by the user. */
  price: number;
  createdAt: string;

  /** Hero photo sourced from Unsplash, searched by meal name. Null until
   * fetched, or if search/credentials are unavailable — render the
   * deterministic emoji/gradient placeholder in that case. */
  imageUrl: string | null;
  imagePhotographerName: string | null;
  imagePhotographerUrl: string | null;
  imageUnsplashUrl: string | null;

  /** Captured from Google Places when the restaurant was selected via
   * autocomplete. Null for meals entered before that existed, or where the
   * restaurant was typed freehand. */
  restaurantAddress: string | null;
  restaurantPlaceId: string | null;
  cuisineType: string | null;
};

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// Raw shape returned by Supabase for a saved_meals row (snake_case).
export type SavedMealRow = {
  id: string;
  user_id: string;
  restaurant: string;
  name: string;
  main_ingredients: string[] | null;
  price: number | string;
  created_at: string;
  image_url: string | null;
  image_photographer_name: string | null;
  image_photographer_url: string | null;
  image_unsplash_url: string | null;
  restaurant_address: string | null;
  restaurant_place_id: string | null;
  cuisine_type: string | null;
};

export function mapMealRow(row: SavedMealRow): SavedMeal {
  return {
    id: row.id,
    userId: row.user_id,
    restaurant: row.restaurant,
    name: row.name,
    mainIngredients: row.main_ingredients ?? [],
    price: Number(row.price),
    createdAt: row.created_at,
    imageUrl: row.image_url,
    imagePhotographerName: row.image_photographer_name,
    imagePhotographerUrl: row.image_photographer_url,
    imageUnsplashUrl: row.image_unsplash_url,
    restaurantAddress: row.restaurant_address,
    restaurantPlaceId: row.restaurant_place_id,
    cuisineType: row.cuisine_type,
  };
}
