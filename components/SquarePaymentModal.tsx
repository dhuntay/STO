"use client";

import { useEffect, useRef, useState } from "react";
import { SavedMeal, formatCurrency } from "@/lib/types";

type Props = {
  meal: SavedMeal;
  onSuccess: (orderNumber: string) => void;
  onCancel: () => void;
};

// Minimal shape of what we actually call on the Web Payments SDK -- there's
// no official @types package, and pulling the `square` npm SDK just for
// types would touch package.json/package-lock.json for no runtime benefit.
// See lib/square.ts for the equivalent note on the server side.
type SquarePaymentMethod = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy: () => Promise<void>;
};
type SquarePayments = {
  card: () => Promise<SquarePaymentMethod>;
  applePay: (request: unknown) => Promise<SquarePaymentMethod>;
  googlePay: (request: unknown) => Promise<SquarePaymentMethod>;
  paymentRequest: (options: Record<string, unknown>) => unknown;
};
declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

type OrderInfo = {
  orderId: string;
  orderNumber: string;
  total: number;
  square: {
    connected: boolean;
    applicationId: string | null;
    locationId: string | null;
    environment: "sandbox" | "production";
  };
};

type Stage =
  | "creating-order"
  | "loading-sdk"
  | "ready"
  | "paying"
  | "not-connected"
  | "error";

function sdkUrl(environment: "sandbox" | "production"): string {
  return environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
}

// Loads the Web Payments SDK script at most once per page, even if the
// modal mounts/unmounts multiple times across an order attempt.
function loadSquareScript(environment: "sandbox" | "production"): Promise<void> {
  if (window.Square) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>("script[data-square-sdk]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Square.")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = sdkUrl(environment);
    script.dataset.squareSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Square."));
    document.head.appendChild(script);
  });
}

// The truck-linked counterpart to AuthModal: instead of simulating a
// biometric scan, a real wallet/device authentication (Apple Pay/Google
// Pay via Square's Web Payments SDK, with a card fallback) both confirms
// the order and authorizes payment in one step -- see
// STO_Consolidated_Context.md, "one authentication" principle. STO never
// sees or stores the card itself; Square hands back a one-time token.
export default function SquarePaymentModal({ meal, onSuccess, onCancel }: Props) {
  const [stage, setStage] = useState<Stage>("creating-order");
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  const paymentsRef = useRef<SquarePayments | null>(null);
  const cardRef = useRef<SquarePaymentMethod | null>(null);
  const applePayRef = useRef<SquarePaymentMethod | null>(null);
  const googlePayRef = useRef<SquarePaymentMethod | null>(null);
  const [hasApplePay, setHasApplePay] = useState(false);
  const [hasGooglePay, setHasGooglePay] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cardRef.current?.destroy().catch(() => {});
      applePayRef.current?.destroy().catch(() => {});
      googlePayRef.current?.destroy().catch(() => {});
    };
  }, []);

  // Step 1: create the real order (see POST /api/orders) so there's
  // something for Square to attach a payment to, and so we know which
  // truck's Square config to initialize the SDK with.
  useEffect(() => {
    let cancelled = false;
    setStage("creating-order");
    setError(null);

    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedMealId: meal.id }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Couldn't start this order.");
        return body as OrderInfo;
      })
      .then((info) => {
        if (cancelled) return;
        setOrder(info);
        if (!info.square.connected || !info.square.applicationId || !info.square.locationId) {
          setStage("not-connected");
          return;
        }
        setStage("loading-sdk");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setStage("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal.id, attempt]);

  // Step 2: once we have an order + the truck's public Square config, load
  // the SDK and set up whichever payment methods are actually available in
  // this browser -- Apple Pay/Google Pay are feature-detected, card always
  // works as the universal fallback.
  useEffect(() => {
    if (stage !== "loading-sdk" || !order?.square.applicationId || !order.square.locationId) {
      return;
    }
    let cancelled = false;

    async function setUp() {
      try {
        await loadSquareScript(order!.square.environment);
        if (cancelled || !window.Square) return;

        const payments = await window.Square.payments(
          order!.square.applicationId!,
          order!.square.locationId!
        );
        if (cancelled) return;
        paymentsRef.current = payments;

        const paymentRequest = payments.paymentRequest({
          countryCode: "US",
          currencyCode: "USD",
          total: {
            amount: order!.total.toFixed(2),
            label: meal.restaurant,
          },
        });

        const card = await payments.card();
        await card.attach("#square-card-container");
        if (cancelled) {
          await card.destroy();
          return;
        }
        cardRef.current = card;

        try {
          const applePay = await payments.applePay(paymentRequest);
          if (!cancelled) {
            applePayRef.current = applePay;
            setHasApplePay(true);
          }
        } catch {
          // Not available on this device/browser -- card fallback covers it.
        }

        try {
          const googlePay = await payments.googlePay(paymentRequest);
          await googlePay.attach("#square-google-pay-button");
          if (cancelled) {
            await googlePay.destroy();
          } else {
            googlePayRef.current = googlePay;
            setHasGooglePay(true);
          }
        } catch {
          // Not available on this device/browser -- card fallback covers it.
        }

        if (!cancelled) setStage("ready");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load Square.");
          setStage("error");
        }
      }
    }

    setUp();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, order]);

  async function charge(method: SquarePaymentMethod) {
    if (!order) return;
    setStage("paying");
    setError(null);

    try {
      const result = await method.tokenize();
      if (result.status !== "OK" || !result.token) {
        throw new Error(result.errors?.[0]?.message ?? "Payment wasn't approved.");
      }

      const res = await fetch("/api/payments/square", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, sourceId: result.token }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Payment failed.");

      if (!mountedRef.current) return;
      onSuccess(order.orderNumber);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Payment failed.");
      setStage("ready");
    }
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cardRef.current) await charge(cardRef.current);
  }

  // Square's card/Google Pay forms render INTO whatever DOM element these
  // ids point at -- attach() runs as soon as the SDK loads (stage
  // "loading-sdk"), which is before the ready-stage UI below ever mounts.
  // These containers have to exist in the DOM from the very first render
  // so attach() always finds them; only their visibility is stage-gated.
  const showPaymentUi = stage === "ready" || stage === "paying";

  function retryFromScratch() {
    setError(null);
    setAttempt((a) => a + 1);
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

        {(stage === "creating-order" || stage === "loading-sdk") && (
          <div className="my-8 flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
            <p className="text-sm text-zinc-300">
              {stage === "creating-order" ? "Starting your order…" : "Loading payment…"}
            </p>
          </div>
        )}

        {stage === "not-connected" && (
          <div className="my-8 flex flex-col items-center gap-3">
            <p className="text-sm text-amber-300">
              {meal.restaurant} hasn&apos;t connected Square yet, so this
              order can&apos;t be paid for right now.
            </p>
            <p className="text-xs text-zinc-400">
              Your order was started (#{order?.orderNumber}) but not charged
              &mdash; check back once the truck finishes setting up payments.
            </p>
          </div>
        )}

        {stage === "error" && (
          <div className="my-8 flex flex-col items-center gap-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={retryFromScratch}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Try again
            </button>
          </div>
        )}

        <div className={showPaymentUi ? "my-6 flex flex-col gap-3" : "hidden"}>
          {error && <p className="text-xs text-red-400">{error}</p>}

          {hasApplePay && (
            <button
              type="button"
              disabled={stage === "paying"}
              onClick={() => applePayRef.current && charge(applePayRef.current)}
              className="rounded-full bg-white py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              Pay with Apple Pay
            </button>
          )}

          <div
            id="square-google-pay-button"
            className={hasGooglePay ? "block" : "hidden"}
          />

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
            <span className="h-px flex-1 bg-white/10" />
            {hasApplePay || hasGooglePay ? "or pay with card" : "Pay with card"}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleCardSubmit} className="flex flex-col gap-3">
            <div id="square-card-container" className="rounded-xl bg-white p-2" />
            <button
              type="submit"
              disabled={stage === "paying"}
              className="rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {stage === "paying" ? "Processing…" : `Pay ${formatCurrency(meal.price)}`}
            </button>
          </form>

          <p className="max-w-[220px] self-center text-xs text-zinc-500">
            Your card stays in your device wallet &mdash; STO never sees or
            stores it.
          </p>
        </div>

        <button
          onClick={onCancel}
          disabled={stage === "paying"}
          className="mt-2 rounded-full border border-white/20 py-2 text-xs font-medium text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
