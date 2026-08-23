import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchMealPhoto } from "@/lib/unsplash";
import { SavedMealRow, mapMealRow } from "@/lib/types";

type CreateMealBody = {
  restaurant?: unknown;
  name?: unknown;
  mainIngredients?: unknown;
  price?: unknown;
  restaurantAddress?: unknown;
  restaurantPlaceId?: unknown;
  cuisineType?: unknown;
  truckId?: unknown;
  menuItemId?: unknown;
};

const MEAL_COLUMNS =
  "id, user_id, restaurant, name, main_ingredients, price, created_at, " +
  "image_url, image_photographer_name, image_photographer_url, image_unsplash_url, " +
  "restaurant_address, restaurant_place_id, cuisine_type, truck_id, menu_item_id";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: CreateMealBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const restaurant =
    typeof body.restaurant === "string" ? body.restaurant.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const mainIngredients = Array.isArray(body.mainIngredients)
    ? body.mainIngredients.filter((i): i is string => typeof i === "string")
    : [];
  const price = typeof body.price === "number" ? body.price : NaN;
  const restaurantAddress =
    typeof body.restaurantAddress === "string" ? body.restaurantAddress : null;
  const restaurantPlaceId =
    typeof body.restaurantPlaceId === "string" ? body.restaurantPlaceId : null;
  const cuisineType =
    typeof body.cuisineType === "string" ? body.cuisineType : null;
  const truckId = typeof body.truckId === "string" ? body.truckId : null;
  const menuItemId = typeof body.menuItemId === "string" ? body.menuItemId : null;

  if (!restaurant || !name || mainIngredients.length === 0) {
    return NextResponse.json(
      { error: "Restaurant, meal name, and at least one ingredient are required." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  }

  // A meal can only be linked to a menu item that actually belongs to the
  // linked truck -- guards against the two ids getting out of sync (e.g. a
  // stale client state) before it ever reaches the truck_id/menu_item_id
  // foreign keys. Silently drop the link rather than erroring the whole
  // save: a meal that fails this check just falls back to the legacy
  // simulated-checkout flow instead of blocking the customer.
  let linkedTruckId: string | null = null;
  let linkedMenuItemId: string | null = null;
  if (truckId && menuItemId) {
    const { data: item } = await supabase
      .from("menu_items")
      .select("id")
      .eq("id", menuItemId)
      .eq("truck_id", truckId)
      .maybeSingle();
    if (item) {
      linkedTruckId = truckId;
      linkedMenuItemId = menuItemId;
    }
  } else if (truckId) {
    linkedTruckId = truckId;
  }

  const photo = await searchMealPhoto(name);

  const { data, error } = await supabase
    .from("saved_meals")
    .insert({
      restaurant,
      name,
      main_ingredients: mainIngredients,
      price,
      restaurant_address: restaurantAddress,
      restaurant_place_id: restaurantPlaceId,
      cuisine_type: cuisineType,
      image_url: photo?.imageUrl ?? null,
      image_photographer_name: photo?.photographerName ?? null,
      image_photographer_url: photo?.photographerProfileUrl ?? null,
      image_unsplash_url: photo?.unsplashUrl ?? null,
      truck_id: linkedTruckId,
      menu_item_id: linkedMenuItemId,
    })
    .select(MEAL_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapMealRow(data as unknown as SavedMealRow));
}
