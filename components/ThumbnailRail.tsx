"use client";

import { SavedMeal } from "@/lib/types";

type Props = {
  meals: SavedMeal[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function ThumbnailRail({ meals, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-shrink-0 gap-2 overflow-x-auto py-1">
      {meals.map((meal) => {
        const isSelected = meal.id === selectedId;
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
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${meal.gradient}`}
            >
              {meal.emoji}
            </span>
            <span className="max-w-[72px] truncate text-[11px] font-medium text-zinc-700">
              {meal.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
