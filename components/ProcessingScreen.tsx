"use client";

import { useEffect, useState } from "react";

type Props = {
  onDone: () => void;
};

const STEPS = [
  "Authorizing payment via device wallet...",
  "Sending order to restaurant...",
];

export default function ProcessingScreen({ onDone }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) {
      const doneTimer = window.setTimeout(onDone, 700);
      return () => window.clearTimeout(doneTimer);
    }
    const stepTimer = window.setTimeout(() => setStepIndex((i) => i + 1), 700);
    return () => window.clearTimeout(stepTimer);
  }, [stepIndex, onDone]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      <p className="text-sm font-medium text-zinc-700">{STEPS[stepIndex]}</p>
      <p className="text-xs text-zinc-400">
        No SwipeOrder fee. Your card never leaves your device wallet.
      </p>
    </div>
  );
}
