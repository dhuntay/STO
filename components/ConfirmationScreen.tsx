"use client";

import { useEffect, useState } from "react";
import { SavedMeal, formatCurrency } from "@/lib/types";
import { mealVisual, estimatePickupMinutes } from "@/lib/mealVisuals";

type Props = {
  meal: SavedMeal;
  orderNumber: string;
  onNewOrder: () => void;
};

type PickupStatus = "sent" | "preparing" | "ready";

const STATUS_LABEL: Record<PickupStatus, string> = {
  sent: "Sent to restaurant",
  preparing: "Preparing your order",
  ready: "Ready for pickup",
};

export default function ConfirmationScreen({
  meal,
  orderNumber,
  onNewOrder,
}: Props) {
  const [status, setStatus] = useState<PickupStatus>("sent");
  const { emoji, gradient } = mealVisual(meal.id);
  const etaMinutes = estimatePickupMinutes(meal.id);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStatus("preparing"), 1200);
    const t2 = window.setTimeout(() => setStatus("ready"), 1200 + etaMinutes * 150);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [etaMinutes]);

  const steps: PickupStatus[] = ["sent", "preparing", "ready"];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
        ✓
      </div>

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Order confirmed</h1>
        <p className="mt-1 text-sm text-zinc-500">Order #{orderNumber}</p>
      </div>

      <div className="w-full max-w-xs rounded-2xl bg-zinc-50 p-4 text-left">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${gradient}`}
          >
            {emoji}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {meal.name}
            </p>
            <p className="truncate text-xs text-zinc-500">{meal.restaurant}</p>
          </div>
          <p className="ml-auto flex-shrink-0 text-sm font-semibold text-zinc-900">
            {formatCurrency(meal.price)}
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          {steps.map((step, i) => (
            <span
              key={step}
              className={i <= currentIndex ? "font-semibold text-emerald-600" : ""}
            >
              {STATUS_LABEL[step]}
            </span>
          ))}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Estimated pickup in {etaMinutes} min at {meal.restaurant}
        </p>
      </div>

      <button
        onClick={onNewOrder}
        className="mt-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white"
      >
        Place another order
      </button>
    </div>
  );
}
