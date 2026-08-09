"use client";

import { useEffect, useState } from "react";
import { SavedMeal, formatCurrency, mealTotal } from "@/lib/types";

type Props = {
  meal: SavedMeal;
  onSuccess: () => void;
  onCancel: () => void;
};

type Method = "face" | "fingerprint";
type Phase = "scanning" | "success";

export default function AuthModal({ meal, onSuccess, onCancel }: Props) {
  const [method, setMethod] = useState<Method>("face");
  const [phase, setPhase] = useState<Phase>("scanning");

  useEffect(() => {
    const scanTimer = window.setTimeout(() => setPhase("success"), 1200);
    return () => window.clearTimeout(scanTimer);
  }, [method]);

  useEffect(() => {
    if (phase !== "success") return;
    const doneTimer = window.setTimeout(onSuccess, 500);
    return () => window.clearTimeout(doneTimer);
  }, [phase, onSuccess]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-3xl bg-zinc-900 p-6 text-center text-white shadow-2xl">
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          Confirm purchase
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          {meal.name} &middot; {formatCurrency(mealTotal(meal))}
        </p>

        <div className="my-8 flex flex-col items-center gap-4">
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-full border-2 text-4xl transition-colors ${
              phase === "success"
                ? "border-emerald-400 text-emerald-400"
                : "animate-pulse border-white/40 text-white/80"
            }`}
            aria-hidden
          >
            {phase === "success" ? "✓" : method === "face" ? "\u{1F464}" : "\u{1F446}"}
          </div>
          <p className="text-sm font-medium">
            {phase === "success"
              ? "Authenticated"
              : method === "face"
                ? "Scanning face..."
                : "Scanning fingerprint..."}
          </p>
          <p className="max-w-[220px] text-xs text-zinc-400">
            One device authentication confirms your order and authorizes
            payment through your wallet. This is a demo simulation &mdash; no
            real biometric data is captured.
          </p>
        </div>

        {phase === "scanning" && (
          <div className="flex flex-col gap-2">
            {method === "face" && (
              <button
                onClick={() => setMethod("fingerprint")}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                Use fingerprint instead
              </button>
            )}
            <button
              onClick={onCancel}
              className="mt-2 rounded-full border border-white/20 py-2 text-xs font-medium text-white/80 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
