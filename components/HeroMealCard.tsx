"use client";

import { SavedMeal, formatCurrency, mealTotal } from "@/lib/types";

type Props = {
  meal: SavedMeal;
  onMoreClick: () => void;
};

export default function HeroMealCard({ meal, onMoreClick }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-black/5">
      <div
        className={`relative flex flex-[3] min-h-0 items-center justify-center bg-gradient-to-br ${meal.gradient}`}
      >
        <span
          className="select-none text-[6rem] leading-none drop-shadow-sm sm:text-[8rem]"
          role="img"
          aria-label={meal.name}
        >
          {meal.emoji}
        </span>
        <button
          onClick={onMoreClick}
          className="absolute right-3 top-3 rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/40"
        >
          More &#8230;
        </button>
      </div>

      <div className="flex flex-[2] min-h-0 flex-col justify-between gap-2 px-5 py-4">
        <div className="min-h-0">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            {meal.restaurant}
          </p>
          <h1 className="truncate text-xl font-semibold text-zinc-900 sm:text-2xl">
            {meal.name}
          </h1>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {meal.mainIngredients.join(" · ")}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              Total incl. tax
            </p>
            <p className="text-2xl font-bold text-zinc-900">
              {formatCurrency(mealTotal(meal))}
            </p>
          </div>
          <p className="text-xs text-zinc-400">Pickup only</p>
        </div>
      </div>
    </div>
  );
}
