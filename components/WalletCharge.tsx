"use client";

import { useEffect, useRef } from "react";
import { SavedMeal } from "@/lib/types";
import { SquarePaymentMethod } from "@/lib/square-client";

type Props = {
  meal: SavedMeal;
  method: SquarePaymentMethod;
  onSuccess: (orderNumber: string) => void;
  onFallback: () => void;
};

type OrderInfo = { orderId: string; orderNumber: string };

// Mounted the instant a pre-warmed swipe completes (see useSquareWallet +
// OrderingScreen). Creates the real order and asks the already-ready Apple
// Pay/Google Pay instance for a token *in parallel* -- so the OS-level Face
// ID/fingerprint/Google Pay sheet appears immediately off the swipe
// gesture itself, with no separate tap in between. This is the "one swipe,
// one automatic device authentication" path from the product spec.
//
// If anything here fails -- wallet turns out not to be usable after all,
// the customer cancels the Face ID/Google Pay prompt, tokenize() is
// rejected -- this hands off to the existing card-first SquarePaymentModal
// rather than dead-ending the order. That fallback still needs a tap,
// which is unavoidable for a typed card (there's no biometric equivalent
// for manual card entry).
export default function WalletCharge({ meal, method, onSuccess, onFallback }: Props) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;

    async function run() {
      try {
        const [orderResult, tokenResult] = await Promise.all([
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
        if (tokenResult.status !== "OK" || !tokenResult.token) {
          throw new Error(tokenResult.errors?.[0]?.message ?? "Payment wasn't approved.");
        }

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
        onFallback();
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
