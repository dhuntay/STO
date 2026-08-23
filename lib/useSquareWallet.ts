"use client";

import { useEffect, useRef, useState } from "react";
import { SquarePaymentMethod, getSquarePayments } from "@/lib/square-client";

type WalletStatus = "idle" | "checking" | "ready" | "unavailable";

type MealForWallet = {
  id: string;
  truckId: string | null;
  price: number;
  restaurant: string;
};

type WalletInfo = {
  status: WalletStatus;
  applePay: SquarePaymentMethod | null;
  googlePay: SquarePaymentMethod | null;
};

// Pre-warms Apple Pay/Google Pay for the customer's currently-selected,
// truck-linked meal *before* they swipe.
//
// Why this has to happen ahead of time rather than after the swipe: Apple
// Pay/Google Pay's native wallet sheet (the actual Face ID/fingerprint
// prompt) only opens from a call made close to a genuine, still-live user
// gesture. Loading the Square SDK and asking the browser to set up a
// wallet payment method both take real, unpredictable time -- and so does
// creating the order. Doing all of that *after* the swipe (which is what
// the original build did) meant the swipe's gesture had usually gone
// stale by the time tokenize() was finally called, so the UI fell back to
// showing a button the customer had to tap a second time.
//
// This hook instead starts warming the wallet the moment a truck-linked
// meal is selected -- while the customer is still just looking at it, well
// before any swipe -- so that by the time they do swipe, the Apple
// Pay/Google Pay instance is already sitting there ready, and the swipe's
// own release event (see WalletCharge.tsx) can call tokenize() on it
// directly with no intervening tap.
//
// If neither wallet is available on this device/browser (or pre-warming
// hasn't finished by the time the customer swipes), OrderingScreen falls
// back to the existing card-first SquarePaymentModal flow -- identical to
// how the app already worked before this hook existed.
export function useSquareWallet(meal: MealForWallet | null): WalletInfo {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const applePayRef = useRef<SquarePaymentMethod | null>(null);
  const googlePayRef = useRef<SquarePaymentMethod | null>(null);

  useEffect(() => {
    applePayRef.current = null;
    googlePayRef.current = null;
    setStatus(meal?.truckId ? "checking" : "idle");

    if (!meal || !meal.truckId) return;

    const truckId = meal.truckId;
    const price = meal.price;
    const restaurant = meal.restaurant;
    let cancelled = false;

    async function setUp() {
      try {
        const configRes = await fetch(`/api/trucks/${truckId}/square-config`);
        const config = await configRes.json().catch(() => null);
        if (cancelled) return;
        if (
          !configRes.ok ||
          !config?.connected ||
          !config?.applicationId ||
          !config?.locationId
        ) {
          setStatus("unavailable");
          return;
        }

        const environment = config.environment === "production" ? "production" : "sandbox";
        const payments = await getSquarePayments(
          environment,
          config.applicationId,
          config.locationId
        );
        if (cancelled) return;

        const paymentRequest = payments.paymentRequest({
          countryCode: "US",
          currencyCode: "USD",
          total: { amount: price.toFixed(2), label: restaurant },
        });

        let anyReady = false;

        try {
          const applePay = await payments.applePay(paymentRequest);
          if (cancelled) {
            applePay.destroy().catch(() => {});
          } else {
            applePayRef.current = applePay;
            anyReady = true;
          }
        } catch {
          // Not available on this device/browser -- card fallback covers it.
        }

        try {
          const googlePay = await payments.googlePay(paymentRequest);
          if (cancelled) {
            googlePay.destroy().catch(() => {});
          } else {
            googlePayRef.current = googlePay;
            anyReady = true;
          }
        } catch {
          // Not available on this device/browser -- card fallback covers it.
        }

        if (!cancelled) setStatus(anyReady ? "ready" : "unavailable");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    }

    setUp();
    return () => {
      cancelled = true;
      applePayRef.current?.destroy().catch(() => {});
      googlePayRef.current?.destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal?.id, meal?.truckId, meal?.price, meal?.restaurant]);

  return { status, applePay: applePayRef.current, googlePay: googlePayRef.current };
}
