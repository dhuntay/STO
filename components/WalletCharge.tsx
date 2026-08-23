"use client";

import { useEffect, useRef } from "react";
import { SavedMeal } from "@/lib/types";
import { SquarePaymentMethod } from "@/lib/square-client";
import { createClient } from "@/lib/supabase/client";

type Props = {
  meal: SavedMeal;
  method: SquarePaymentMethod;
  onSuccess: (orderNumber: string) => void;
  onAbort: () => void;
};

type OrderInfo = { orderId: string; orderNumber: string };

// Mounted the instant a pre-warmed swipe completes (see useSquareWallet +
// OrderingScreen). Creates the real order and asks the already-ready Apple
// Pay/Google Pay instance for a token *in parallel* -- so the OS-level Face
// ID/fingerprint/Google Pay sheet appears immediately off the swipe
// gesture itself, with no separate tap in between.
//
// If the wallet sheet is cancelled, times out, or the charge fails for any
// reason, this must leave no charge and no order sitting in an ambiguous
// state (see STO_Consolidated_Context.md payment rules) -- so on any
// failure it cancels whatever order it created (RLS lets a customer cancel
// their own still-"created", never-charged order -- see the "Customers
// can cancel their own unpaid orders" policy) and hands back to
// OrderingScreen, which returns to the pre-swipe idle screen exactly as it
// was. Order creation and tokenize() are tracked with allSettled rather
// than Promise.all specifically so a failure on *either* side still lets
// us find and cancel the order if it was in fact created.
export default function WalletCharge({ meal, method, onSuccess, onAbort }: Props) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    let createdOrderId: string | null = null;

    async function abort() {
      if (createdOrderId) {
        const supabase = createClient();
        try {
          await supabase
            .from("orders")
            .update({ status: "cancelled_refunded" })
            .eq("id", createdOrderId)
            .eq("status", "created");
        } catch {
          // Best-effort cleanup. Worst case the order is left at
          // "created" with nothing ever charged against it -- no money
          // moved, no ambiguity about payment, just an uncharged row.
        }
      }
      if (!cancelled) onAbort();
    }

    async function run() {
      const [orderSettled, tokenSettled] = await Promise.allSettled([
        fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedMealId: meal.id }),
        }).then(async (res) => {
          const body = await res.json().catch(() => null);
          if (!res.ok) throw new Error(body?.error ?? "Couldn't start this order.");
          return body as OrderInfo;
        }),
        method.tokenize(),
      ]);

      if (cancelled) return;

      const orderResult = orderSettled.status === "fulfilled" ? orderSettled.value : null;
      if (orderResult) createdOrderId = orderResult.orderId;

      const tokenResult = tokenSettled.status === "fulfilled" ? tokenSettled.value : null;

      if (!orderResult || !tokenResult || tokenResult.status !== "OK" || !tokenResult.token) {
        await abort();
        return;
      }

      try {
        const chargeRes = await fetch("/api/payments/square", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: orderResult.orderId, sourceId: tokenResult.token }),
        });
        const chargeBody = await chargeRes.json().catch(() => null);
        if (!chargeRes.ok) throw new Error(chargeBody?.error ?? "Payment failed.");

        if (cancelled) return;
        onSuccess(orderResult.orderNumber);
      } catch {
        if (cancelled) return;
        await abort();
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-zinc-900 p-8 text-center text-white shadow-2xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
        <p className="text-sm text-zinc-300">
          Confirm with Face ID, fingerprint, or your device passcode&hellip;
        </p>
      </div>
    </div>
  );
}
