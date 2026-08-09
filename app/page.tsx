import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderingScreen from "@/components/OrderingScreen";
import { SavedMeal } from "@/lib/types";

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
    .select("id, user_id, restaurant, name, main_ingredients, price, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load saved meals: ${error.message}`);
  }

  const meals: SavedMeal[] = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    restaurant: row.restaurant,
    name: row.name,
    mainIngredients: row.main_ingredients ?? [],
    price: Number(row.price),
    createdAt: row.created_at,
  }));

  return <OrderingScreen initialMeals={meals} userEmail={user.email ?? ""} />;
}
