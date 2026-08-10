"use client";

import { useEffect, useState } from "react";

type Props = {
  onDone: () => void;
};

const STEPS = [
  "Authorizing payment via device wallet…",
  "Sending order to restaurant…",
];

// Each step holds long enough to actually read it.
const STEP_MS = 2000;

export default function ProcessingScreen({ onDone }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) {
      const doneTimer = window.setTimeout(onDone, STEP_MS);
      return () => window.clearTimeout(doneTimer);
    }
    const stepTimer = window.setTimeout(
      () => setStepIndex((i) => i + 1),
      STEP_MS
    );
    return () => window.clearTimeout(stepTimer);
  }, [stepIndex, onDone]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />

      <p
        className="text-sm font-medium text-zinc-700"
        role="status"
        aria-live="polite"
      >
        {STEPS[stepIndex]}
      </p>

      {/* Step dots so the two stages are visibly distinct. */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => (
          <span
            key={step}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= stepIndex ? "w-6 bg-emerald-500" : "w-1.5 bg-zinc-200"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-zinc-400">
        No Swipe2Order fee. Your card never leaves your device wallet.
      </p>
    </div>
  );
}
