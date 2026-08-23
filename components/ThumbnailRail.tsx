"use client";

import { useState } from "react";
import Image from "next/image";
import { SavedMeal } from "@/lib/types";
import { mealVisual } from "@/lib/mealVisuals";

type Props = {
  meals: SavedMeal[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddMeal: () => void;
  onRemove: (id: string) => Promise<void>;
};

export default function ThumbnailRail({
  meals,
  selectedId,
  onSelect,
  onAddMeal,
  onRemove,
}: Props) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(meal: SavedMeal) {
    if (!confirm(`Remove "${meal.name}" from your saved meals?`)) return;
    setRemovingId(meal.id);
    try {
      await onRemove(meal.id);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex flex-shrink-0 gap-2 overflow-x-auto py-1">
      {meals.map((meal) => {
        const isSelected = meal.id === selectedId;
        const isRemoving = removingId === meal.id;
        const { emoji, gradient } = mealVisual(meal.id);
        return (
          // A plain <button> can't contain another <button>, so the
          // select action and the remove "x" are siblings positioned over
          // each other here rather than nested -- see HeroMealCard's
          // "More..." button for the other (pre-existing) way to remove a
          // saved meal, via the info sheet's confirm dialog.
          <div key={meal.id} className="relative flex-shrink-0">
            <button
              onClick={() => onSelect(meal.id)}
              aria-pressed={isSelected}
              aria-label={`${meal.name} from ${meal.restaurant}`}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-transparent bg-zinc-100 hover:bg-zinc-200"
              }`}
            >
              {meal.imageUrl ? (
                <span className="relative flex h-11 w-11 overflow-hidden rounded-xl bg-zinc-200">
                  <Image
                    src={meal.imageUrl}
                    alt={meal.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${gradient}`}
                >
                  {emoji}
                </span>
              )}
              <span className="max-w-[72px] truncate text-[11px] font-medium text-zinc-700">
                {meal.name}
              </span>
            </button>

            <button
              type="button"
              disabled={isRemoving}
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(meal);
              }}
              aria-label={`Remove ${meal.name} from saved meals`}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/80 text-[11px] font-bold leading-none text-white shadow transition hover:bg-red-600 disabled:opacity-50"
            >
              {isRemoving ? (
                <span aria-hidden>&hellip;</span>
              ) : (
                <span aria-hidden>&times;</span>
              )}
            </button>
          </div>
        );
      })}

      <button
        onClick={onAddMeal}
        aria-label="Add a saved meal"
        className="flex flex-shrink-0 flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-zinc-300 px-3 py-2 text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-500"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-50 text-2xl">
          +
        </span>
        <span className="max-w-[72px] truncate text-[11px] font-medium">
          Add meal
        </span>
      </button>
    </div>
  );
}
