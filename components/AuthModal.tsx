"use client";

import { useEffect, useState } from "react";
import { SavedMeal, formatCurrency } from "@/lib/types";

type Props = {
  meal: SavedMeal;
  onSuccess: () => void;
  onCancel: () => void;
};

type Method = "face" | "fingerprint";
type Phase = "scanning" | "success";

// Deliberately unhurried: a real wallet/device prompt takes a beat, and the
// customer should be able to see what they're authorizing before it clears.
const SCAN_MS = 2500;
const SUCCESS_HOLD_MS = 1200;

export default function AuthModal({ meal, onSuccess, onCancel }: Props) {
  const [method, setMethod] = useState<Method>("face");
  const [phase, setPhase] = useState<Phase>("scanning");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Kick the progress bar on the next tick so the CSS transition runs.
    const startTimer = window.setTimeout(() => setProgress(100), 50);
    const scanTimer = window.setTimeout(() => setPhase("success"), SCAN_MS);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(scanTimer);
    };
  }, [method]);

  useEffect(() => {
    if (phase !== "success") return;
    const doneTimer = window.setTimeout(onSuccess, SUCCESS_HOLD_MS);
    return () => window.clearTimeout(doneTimer);
  }, [phase, onSuccess]);

  function switchToFingerprint() {
    setProgress(0);
    setPhase("scanning");
    setMethod("fingerprint");
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-3xl bg-zinc-900 p-6 text-center text-white shadow-2xl">
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          Confirm purchase
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          {meal.name} &middot; {formatCurrency(meal.price)}
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

          <p className="text-sm font-medium" role="status" aria-live="polite">
            {phase === "success"
              ? "Authenticated"
              : method === "face"
                ? "Scanning face…"
                : "Scanning fingerprint…"}
          </p>

          {phase === "scanning" && (
            <div className="h-1 w-32 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 ease-linear"
                style={{
                  width: `${progress}%`,
                  transitionProperty: "width",
                  transitionDuration: `${SCAN_MS}ms`,
                }}
              />
            </div>
          )}

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
                onClick={switchToFingerprint}
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
