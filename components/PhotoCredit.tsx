"use client";

import { SavedMeal } from "@/lib/types";

type Props = {
  meal: SavedMeal;
  className?: string;
};

/** "Photo by [name] on Unsplash" — both link back to Unsplash, per their
 * API attribution guidelines. Renders nothing if the meal has no
 * Unsplash-sourced photo (i.e. it's using the emoji/gradient fallback). */
export default function PhotoCredit({ meal, className = "" }: Props) {
  if (!meal.imageUrl || !meal.imagePhotographerName) return null;

  return (
    <p className={`truncate text-[10px] leading-tight text-zinc-400 ${className}`}>
      Photo by{" "}
      <a
        href={meal.imagePhotographerUrl ?? "https://unsplash.com"}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-zinc-600"
      >
        {meal.imagePhotographerName}
      </a>{" "}
      on{" "}
      <a
        href={meal.imageUnsplashUrl ?? "https://unsplash.com"}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-zinc-600"
      >
        Unsplash
      </a>
    </p>
  );
}
