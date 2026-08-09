import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderingScreen from "@/components/OrderingScreen";
import { SavedMeal, SavedMealRow, mapMealRow } from "@/lib/types";
import { searchMealPhoto } from "@/lib/unsplash";

const MEAL_COLUMNS =
  "id, user_id, restaurant, name, main_ingredients, price, created_at, " +
  "image_url, image_photographer_name, image_photographer_url, image_unsplash_url, " +
  "restaurant_address, restaurant_place_id, cuisine_type";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("saved_meals")
    .select(MEAL_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load saved meals: ${error.message}`);
  }

  let meals: SavedMeal[] = (data ?? []).map((row) =>
    mapMealRow(row as unknown as SavedMealRow)
  );

  // Lazily backfill a hero photo for any meal that doesn't have one yet —
  // covers meals saved before Unsplash was wired up, or before
  // UNSPLASH_ACCESS_KEY was configured. searchMealPhoto no-ops if the key
  // still isn't set.
  const missingPhoto = meals.filter((m) => !m.imageUrl);
  if (missingPhoto.length > 0) {
    const results = await Promise.all(
      missingPhoto.map(async (meal) => {
        const photo = await searchMealPhoto(meal.name);
        return { meal, photo };
      })
    );

    const withPhotos = results.filter((r) => r.photo);
    if (withPhotos.length > 0) {
      await Promise.all(
        withPhotos.map(({ meal, photo }) =>
          supabase
            .from("saved_meals")
            .update({
              image_url: photo!.imageUrl,
              image_photographer_name: photo!.photographerName,
              image_photographer_url: photo!.photographerProfileUrl,
              image_unsplash_url: photo!.unsplashUrl,
            })
            .eq("id", meal.id)
        )
      );

      const photoById = new Map(withPhotos.map((r) => [r.meal.id, r.photo!]));
      meals = meals.map((m) => {
        const photo = photoById.get(m.id);
        return photo
          ? {
              ...m,
              imageUrl: photo.imageUrl,
              imagePhotographerName: photo.photographerName,
              imagePhotographerUrl: photo.photographerProfileUrl,
              imageUnsplashUrl: photo.unsplashUrl,
            }
          : m;
      });
    }
  }

  return <OrderingScreen initialMeals={meals} userEmail={user.email ?? ""} />;
}
