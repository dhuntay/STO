"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Truck, formatCurrency } from "@/lib/trucks";

type Props = {
  truck: Truck;
};

export default function TruckMenuScreen({ truck }: Props) {
  // Only items the owner has marked available today and not sold out ever
  // reach this dropdown -- see "Menu item creation" in
  // STO_Consolidated_Context.md Section 5.
  const orderableItems = useMemo(
    () => truck.menuItems.filter((i) => i.isAvailableToday && !i.isSoldOut),
    [truck.menuItems]
  );
  const [selectedId, setSelectedId] = useState(orderableItems[0]?.id ?? "");
  const selected = orderableItems.find((i) => i.id === selectedId);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-50 px-4 pb-4 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center gap-2 pb-3">
        <Link href="/trucks" className="text-sm text-zinc-400">
          &larr; Back
        </Link>
      </header>

      <div className="flex-shrink-0 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
          {truck.cuisine ?? "Food truck"}
        </p>
        <h1 className="text-xl font-bold text-zinc-900">{truck.name}</h1>
        {truck.locationLabel && (
          <p className="mt-1 text-sm text-zinc-500">{truck.locationLabel}</p>
        )}
      </div>

      {orderableItems.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Nothing available from this truck right now.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <label className="flex-shrink-0">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Menu item
            </span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            >
              {orderableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {formatCurrency(item.price)}
                </option>
              ))}
            </select>
          </label>

          {selected && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-base font-semibold text-zinc-900">
                {selected.name}
              </p>
              {selected.mainIngredients.length > 0 && (
                <p className="mt-1 text-sm text-zinc-500">
                  {selected.mainIngredients.join(", ")}
                </p>
              )}
              <p className="mt-3 text-lg font-bold text-zinc-900">
                {formatCurrency(selected.price)}
              </p>
            </div>
          )}

          {/* Pickup-window selection, swipe-to-order, and payment come
              next -- this screen currently stops at item selection. */}
        </div>
      )}
    </div>
  );
}
