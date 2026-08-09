"use client";

import Image from "next/image";
import { SavedMeal } from "@/lib/types";
import { mealVisual } from "@/lib/mealVisuals";

type Props = {
  meals: SavedMeal[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddMeal: () => void;
};

export default function ThumbnailRail({
  meals,
  selectedId,
  onSelect,
  onAddMeal,
}: Props) {
  return (
    <div className="flex flex-shrink-0 gap-2 overflow-x-auto py-1">
      {meals.map((meal) => {
        const isSelected = meal.id === selectedId;
        const { emoji, gradient } = mealVisual(meal.id);
        return (
          <button
            key={meal.id}
            onClick={() => onSelect(meal.id)}
            aria-pressed={isSelected}
            aria-label={`${meal.name} from ${meal.restaurant}`}
            className={`flex flex-shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition ${
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
