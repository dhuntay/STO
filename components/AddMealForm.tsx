"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddMealForm() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState("");
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Enter a valid price.");
      return;
    }

    const mainIngredients = ingredients
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    if (mainIngredients.length === 0) {
      setError("List at least one main ingredient.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("saved_meals").insert({
      restaurant: restaurant.trim(),
      name: name.trim(),
      main_ingredients: mainIngredients,
      price: parsedPrice,
    });
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5"
    >
      <div>
        <label
          htmlFor="restaurant"
          className="mb-1 block text-xs font-medium text-zinc-600"
        >
          Restaurant
        </label>
        <input
          id="restaurant"
          required
          value={restaurant}
          onChange={(e) => setRestaurant(e.target.value)}
          placeholder="Tony's Pizzeria"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-xs font-medium text-zinc-600"
        >
          Meal name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday Pepperoni Pizza"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <div>
        <label
          htmlFor="ingredients"
          className="mb-1 block text-xs font-medium text-zinc-600"
        >
          Main ingredients
        </label>
        <input
          id="ingredients"
          required
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Pepperoni, Mozzarella, San Marzano Sauce"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <p className="mt-1 text-[11px] text-zinc-400">Separate with commas.</p>
      </div>

      <div>
        <label
          htmlFor="price"
          className="mb-1 block text-xs font-medium text-zinc-600"
        >
          Price (total, incl. tax)
        </label>
        <input
          id="price"
          required
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="14.50"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save meal"}
      </button>
    </form>
  );
}
