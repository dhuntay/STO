"use client";

import { useEffect, useRef, useState } from "react";
import { SavedMeal } from "@/lib/types";
import { SquarePaymentMethod } from "@/lib/square-client";
import { createClient } from "@/lib/supabase/client";
import { verifyFaceId } from "@/lib/webauthnClient";

type Props = {
  meal: SavedMeal;
  method: SquarePaymentMethod;
  onSuccess: (orderNumber: string) => void;
  onAbort: (message?: string) => void;
  onNeedsFaceSetup: () => void;
};

type OrderInfo = { orderId: string; orderNumber: string };

// Mounted the instant a pre-warmed swipe completes (see useSquareWallet +
// OrderingScreen). Before touching anything else, this runs a fresh, live
// Face ID/fingerprint re-check of its own (verifyFaceId, via WebAuthn) --
// independent of whatever trust/grace-window behavior Apple Pay/Google
// Pay use internally, and independent of whether the phone happens to
// already be unlocked (see STO_Consolidated_Context.md: this re-check is
// the core business model, not a nice-to-have). Only once that passes
// does it create the real order and ask the already-ready Apple
// Pay/Google Pay instance for a token *in parallel* -- so the wallet's own
// native sheet appears immediately off the back of that check, with no
// separate tap in between.
//
// If the Face ID check is cancelled/fails, the wallet sheet is cancelled,
// times out, or the charge fails for any reason, this must leave no
// charge and no order sitting in an ambiguous state (see
// STO_Consolidated_Context.md payment rules) -- so on any failure it
// cancels whatever order it created (RLS lets a customer cancel their own
// still-"created", never-charged order -- see the "Customers can cancel
// their own unpaid orders" policy) and hands back to OrderingScreen, which
// returns to the pre-swipe idle screen exactly as it was. Order creation
// and tokenize() are tracked with allSettled rather than Promise.all
// specifically so a failure on *either* side still lets us find and
// cancel the order if it was in fact created.
export default function WalletCharge({
  meal,
  method,
  onSuccess,
  onAbort,
  onNeedsFaceSetup,
}: Props) {
  const ranRef = useRef(false);
  const [stage, setStage] = useState<"checking" | "authorizing">("checking");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    let createdOrderId: string | null = null;

    async function abort(message?: string) {
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
      if (!cancelled) onAbort(message);
    }

    async function run() {
      const faceCheck = await verifyFaceId();
      if (cancelled) return;

      if (!faceCheck.ok) {
        if (faceCheck.reason === "not_registered") {
          // No order was created yet -- nothing to clean up. Send the
          // customer back to set up their device instead of retrying a
          // check that can't succeed.
          onNeedsFaceSetup();
          return;
        }
        // Cancelled/timed-out stays silent, same as a cancelled wallet
        // attempt always has -- a genuine error gets a message so it
        // doesn't look identical to just changing your mind.
        await abort(faceCheck.reason === "cancelled" ? undefined : faceCheck.message);
        return;
      }

      if (cancelled) return;
      setStage("authorizing");

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
          {stage === "checking"
            ? "Confirm it's you with Face ID, fingerprint, or your device passcode…"
            : "Confirm with Face ID, fingerprint, or your device passcode…"}
        </p>
      </div>
    </div>
  );
}
