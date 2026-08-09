"use client";

import { useState } from "react";
import { SavedMeal, formatCurrency } from "@/lib/types";

type Props = {
  meal: SavedMeal;
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => Promise<void>;
};

export default function MoreInfoSheet({ meal, open, onClose, onRemove }: Props) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!confirm(`Remove "${meal.name}" from your saved meals?`)) return;
    setRemoving(true);
    try {
      await onRemove(meal.id);
      onClose();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-30 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[80%] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-200" />
        <h2 className="text-lg font-semibold text-zinc-900">{meal.name}</h2>
        <p className="mb-4 text-sm text-zinc-500">{meal.restaurant}</p>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-zinc-700">Main ingredients</dt>
            <dd className="text-zinc-500">{meal.mainIngredients.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Total price</dt>
            <dd className="text-zinc-500">{formatCurrency(meal.price)}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-700">Saved on</dt>
            <dd className="text-zinc-500">
              {new Date(meal.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-zinc-900 py-3 text-sm font-medium text-white"
          >
            Close
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full rounded-full border border-red-200 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove from saved meals"}
          </button>
        </div>
      </div>
    </div>
  );
}
