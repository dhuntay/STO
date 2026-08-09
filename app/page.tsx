"use client";

import { useMemo, useState } from "react";
import HeroMealCard from "@/components/HeroMealCard";
import ThumbnailRail from "@/components/ThumbnailRail";
import MoreInfoSheet from "@/components/MoreInfoSheet";
import SwipeToOrder from "@/components/SwipeToOrder";
import { savedMeals } from "@/lib/meals";

export default function Home() {
  const [selectedId, setSelectedId] = useState(savedMeals[0].id);
  const [moreOpen, setMoreOpen] = useState(false);

  const selectedMeal = useMemo(
    () => savedMeals.find((m) => m.id === selectedId) ?? savedMeals[0],
    [selectedId]
  );

  function handleSwipeComplete() {
    // Wired to the mock auth + confirmation flow next.
    console.log("swipe complete for", selectedMeal.id);
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-50 px-4 pb-4 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center justify-between pb-3">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">
          SwipeOrder
        </h1>
        <span className="text-xs text-zinc-400">Pickup</span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="min-h-0 flex-1">
          <HeroMealCard meal={selectedMeal} onMoreClick={() => setMoreOpen(true)} />
        </div>

        <ThumbnailRail
          meals={savedMeals}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <SwipeToOrder onSwipeComplete={handleSwipeComplete} />
      </main>

      <MoreInfoSheet
        meal={selectedMeal}
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
      />
    </div>
  );
}
