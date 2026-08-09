"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeroMealCard from "@/components/HeroMealCard";
import ThumbnailRail from "@/components/ThumbnailRail";
import MoreInfoSheet from "@/components/MoreInfoSheet";
import SwipeToOrder from "@/components/SwipeToOrder";
import AuthModal from "@/components/AuthModal";
import ProcessingScreen from "@/components/ProcessingScreen";
import ConfirmationScreen from "@/components/ConfirmationScreen";
import SignOutButton from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/client";
import { SavedMeal } from "@/lib/types";

type Stage = "idle" | "authenticating" | "processing" | "confirmed";

type Props = {
  initialMeals: SavedMeal[];
  userEmail: string;
};

function generateOrderNumber() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function OrderingScreen({ initialMeals, userEmail }: Props) {
  const router = useRouter();
  const [meals, setMeals] = useState(initialMeals);
  const [selectedId, setSelectedId] = useState(initialMeals[0]?.id ?? "");
  const [moreOpen, setMoreOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [orderNumber, setOrderNumber] = useState("");

  const selectedMeal = useMemo(
    () => meals.find((m) => m.id === selectedId) ?? meals[0],
    [meals, selectedId]
  );

  function handleSwipeComplete() {
    setStage("authenticating");
  }

  function handleAuthSuccess() {
    setStage("processing");
  }

  function handleAuthCancel() {
    setStage("idle");
  }

  function handleProcessingDone() {
    setOrderNumber(generateOrderNumber());
    setStage("confirmed");
  }

  function handleNewOrder() {
    setStage("idle");
  }

  async function handleRemoveMeal(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("saved_meals").delete().eq("id", id);
    if (error) {
      alert(`Couldn't remove meal: ${error.message}`);
      return;
    }
    setMeals((prev) => {
      const next = prev.filter((m) => m.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-50 px-4 pb-4 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center justify-between pb-3">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">
          SwipeOrder
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/meals/new"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            + Add meal
          </Link>
          <span className="text-zinc-200">|</span>
          <span className="max-w-[120px] truncate text-xs text-zinc-400">
            {userEmail}
          </span>
          <SignOutButton />
        </div>
      </header>

      {stage === "idle" && selectedMeal && (
        <main className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <HeroMealCard
              meal={selectedMeal}
              onMoreClick={() => setMoreOpen(true)}
            />
          </div>

          <ThumbnailRail
            meals={meals}
            selectedId={selectedMeal.id}
            onSelect={setSelectedId}
            onAddMeal={() => router.push("/meals/new")}
          />

          <SwipeToOrder onSwipeComplete={handleSwipeComplete} />
        </main>
      )}

      {stage === "idle" && !selectedMeal && (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-4xl">🍽️</p>
          <div>
            <p className="text-lg font-semibold text-zinc-900">
              No saved meals yet
            </p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Save the meal you always order so you can reorder it in one
              swipe.
            </p>
          </div>
          <Link
            href="/meals/new"
            className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white"
          >
            Add your first meal
          </Link>
        </main>
      )}

      {selectedMeal && (
        <MoreInfoSheet
          meal={selectedMeal}
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          onRemove={handleRemoveMeal}
        />
      )}

      {stage === "authenticating" && selectedMeal && (
        <AuthModal
          meal={selectedMeal}
          onSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
        />
      )}

      {stage === "processing" && <ProcessingScreen onDone={handleProcessingDone} />}

      {stage === "confirmed" && selectedMeal && (
        <ConfirmationScreen
          meal={selectedMeal}
          orderNumber={orderNumber}
          onNewOrder={handleNewOrder}
        />
      )}
    </div>
  );
}
