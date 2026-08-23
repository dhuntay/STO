"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TruckAutocompleteInput from "@/components/TruckAutocompleteInput";
import { Truck, MenuItem } from "@/lib/trucks";

const OTHER_OPTION = "__other__";

type Props = {
  trucks: Truck[];
};

export default function AddMealForm({ trucks }: Props) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState<string | null>(null);
  const [cuisineType, setCuisineType] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [autoFilled, setAutoFilled] = useState(false);

  // Which real truck/menu item (if any) this meal is linked to. Both are
  // what let a later swipe on this meal create a real order + go through
  // Square (see POST /api/orders, which requires both to be non-null) --
  // a meal typed freehand, or where the customer picked "Other" instead of
  // a real menu item, falls back to the legacy simulated flow instead.
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [useCustomName, setUseCustomName] = useState(true);
  const [hasSelectedTruck, setHasSelectedTruck] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTruckSelected(truck: Truck) {
    setRestaurant(truck.name);
    setRestaurantAddress(truck.locationLabel);
    setCuisineType(truck.cuisine);
    setHasSelectedTruck(true);
    setSelectedTruckId(truck.id);

    const available = truck.menuItems.filter(
      (item) => item.isAvailableToday && !item.isSoldOut
    );
    setMenuItems(available);

    if (available.length > 0) {
      setUseCustomName(false);
      applyMenuItem(available[0]);
    } else {
      setUseCustomName(true);
      setName("");
      setIngredients("");
      setPrice("");
      setAutoFilled(false);
      setSelectedMenuItemId(null);
    }
  }

  /** Selecting a real menu item fills in what the truck owner set for it, so
   * the customer isn't retyping it. Both stay editable -- editing them
   * afterwards doesn't unlink the meal from the item, since it's still the
   * same order-able thing, just described slightly differently. */
  function applyMenuItem(item: MenuItem | undefined) {
    if (!item) return;
    setName(item.name);
    setIngredients(item.mainIngredients.join(", "));
    setPrice(item.price.toFixed(2));
    setAutoFilled(true);
    setSelectedMenuItemId(item.id);
  }

  function handleRestaurantTyped(value: string) {
    setRestaurant(value);
    // Once the user edits the truck name away from what autocomplete filled
    // in, the previously matched truck/menu no longer applies.
    setRestaurantAddress(null);
    setCuisineType(null);
    setMenuItems([]);
    setUseCustomName(true);
    setHasSelectedTruck(false);
    setAutoFilled(false);
    setSelectedTruckId(null);
    setSelectedMenuItemId(null);
  }

  function handleNameSelectChange(value: string) {
    if (value === OTHER_OPTION) {
      setUseCustomName(true);
      setName("");
      setIngredients("");
      setPrice("");
      setAutoFilled(false);
      // Still a real truck (selectedTruckId stays set) -- just not a real
      // menu item, so this meal can't go through the Square flow.
      setSelectedMenuItemId(null);
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
        restaurantPlaceId: null,
        cuisineType,
        truckId: selectedTruckId,
        menuItemId: selectedMenuItemId,
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
          Find food truck
        </label>
        <TruckAutocompleteInput
          trucks={trucks}
          value={restaurant}
          onChange={handleRestaurantTyped}
          onTruckSelected={handleTruckSelected}
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
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value={OTHER_OPTION}>Other (type my own)…</option>
            </select>
            <p className="mt-1 text-[11px] text-zinc-400">
              {restaurant}&apos;s menu today — added by the truck owner.
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
        {hasSelectedTruck && menuItems.length === 0 && (
          <p className="mt-1 text-[11px] text-zinc-400">
            This truck hasn&apos;t listed any available items right now —
            type the meal name yourself.
          </p>
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
            ? "From the truck's menu — edit if yours differs."
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
            Price set by the truck owner — edit to match what you actually
            pay.
          </p>
        )}
      </div>

      {autoFilled && (
        <p className="rounded-xl bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
          Ingredients and price were filled in from {restaurant}&apos;s menu,
          as set by the truck owner.
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
