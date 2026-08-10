"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RestaurantAutocompleteInput, {
  SelectedPlace,
} from "@/components/RestaurantAutocompleteInput";
import { resolveCuisineMenu, MenuItem } from "@/lib/cuisineMenu";

const OTHER_OPTION = "__other__";

export default function AddMealForm() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState<string | null>(null);
  const [restaurantPlaceId, setRestaurantPlaceId] = useState<string | null>(null);
  const [cuisineType, setCuisineType] = useState<string | null>(null);
  const [cuisineLabel, setCuisineLabel] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [autoFilled, setAutoFilled] = useState(false);

  const [name, setName] = useState("");
  const [useCustomName, setUseCustomName] = useState(true);
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePlaceSelected(place: SelectedPlace) {
    setRestaurant(place.name);
    setRestaurantAddress(place.address);
    setRestaurantPlaceId(place.placeId);

    const { cuisineType, label, items } = resolveCuisineMenu(place.types);
    setCuisineType(cuisineType);
    setCuisineLabel(label);
    setMenuItems(items);
    setUseCustomName(false);
    applyMenuItem(items[0]);
  }

  /** Selecting a known menu item fills in what that dish normally contains
   * and typically costs, so the customer isn't retyping it. Both stay
   * editable. */
  function applyMenuItem(item: MenuItem | undefined) {
    if (!item) return;
    setName(item.name);
    setIngredients(item.ingredients.join(", "));
    setPrice(item.price.toFixed(2));
    setAutoFilled(true);
  }

  function handleRestaurantTyped(value: string) {
    setRestaurant(value);
    // Once the user edits the restaurant name away from what autocomplete
    // filled in, the previously matched place/cuisine no longer applies.
    setRestaurantAddress(null);
    setRestaurantPlaceId(null);
    setCuisineType(null);
    setCuisineLabel(null);
    setMenuItems([]);
    setUseCustomName(true);
    setAutoFilled(false);
  }

  function handleNameSelectChange(value: string) {
    if (value === OTHER_OPTION) {
      setUseCustomName(true);
      setName("");
      setIngredients("");
      setPrice("");
      setAutoFilled(false);
      return;
    }
    applyMenuItem(menuItems.find((item) => item.name === value));
  }

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
    if (!name.trim()) {
      setError("Enter a meal name.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant: restaurant.trim(),
        name: name.trim(),
        mainIngredients,
        price: parsedPrice,
        restaurantAddress,
        restaurantPlaceId,
        cuisineType,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong saving this meal.");
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
        <RestaurantAutocompleteInput
          value={restaurant}
          onChange={handleRestaurantTyped}
          onPlaceSelected={handlePlaceSelected}
        />
        {restaurantAddress && (
          <p className="mt-1 truncate text-[11px] text-zinc-400">
            {restaurantAddress}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-xs font-medium text-zinc-600"
        >
          Meal name
        </label>

        {!useCustomName && menuItems.length > 0 ? (
          <>
            <select
              id="name"
              value={name}
              onChange={(e) => handleNameSelectChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              {menuItems.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value={OTHER_OPTION}>Other (type my own)…</option>
            </select>
            <p className="mt-1 text-[11px] text-zinc-400">
              Common {cuisineLabel?.toLowerCase()} items — not {restaurant}
              &apos;s confirmed menu.
            </p>
          </>
        ) : (
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday Pepperoni Pizza"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        )}
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
        <p className="mt-1 text-[11px] text-zinc-400">
          {autoFilled
            ? "Typical ingredients for this dish — edit if yours differs."
            : "Separate with commas."}
        </p>
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
        {autoFilled && (
          <p className="mt-1 text-[11px] text-zinc-400">
            Typical price for this dish — edit to match what you actually pay.
          </p>
        )}
      </div>

      {autoFilled && (
        <p className="rounded-xl bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
          Ingredients and price were filled in from a typical{" "}
          {cuisineLabel?.toLowerCase()} order. Once a restaurant is connected
          through its POS, these will come from the real menu instead.
        </p>
      )}

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
