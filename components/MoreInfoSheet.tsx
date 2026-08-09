"use client";

import { SavedMeal } from "@/lib/types";

type Props = {
  meal: SavedMeal;
  open: boolean;
  onClose: () => void;
};

export default function MoreInfoSheet({ meal, open, onClose }: Props) {
  return (
    <div
      className={`fixed inset-0 z-30 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[80%] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-200" />
        <h2 className="text-lg font-semibold text-zinc-900">{meal.name}</h2>
        <p className="mb-4 text-sm text-zinc-500">{meal.restaurant}</p>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-zinc-700">Calories</dt>
            <dd className="text-zinc-500">{meal.calories} kcal</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Full ingredients</dt>
            <dd className="text-zinc-500">{meal.fullIngredients.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Dietary information</dt>
            <dd className="text-zinc-500">{meal.dietary.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Allergens</dt>
            <dd className="text-zinc-500">{meal.allergens.join(", ")}</dd>
          </div>
        </dl>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-zinc-900 py-3 text-sm font-medium text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
