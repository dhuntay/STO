"use client";

import { useState } from "react";
import { registerFaceId } from "@/lib/webauthnClient";

type Props = {
  onRegistered: () => void;
};

// Shown above the swipe card to a signed-in customer whose account has no
// WebAuthn credential registered yet. A truck-linked wallet order requires
// a fresh Face ID/fingerprint check on every swipe (see WalletCharge.tsx
// and lib/webauthnClient.ts's verifyFaceId) -- this is the one-time setup
// ceremony that has to happen once, on each device, before that check can
// succeed there.
export default function FaceIdSetupBanner({ onRegistered }: Props) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSetUp() {
    setStatus("working");
    setMessage(null);
    const result = await registerFaceId();
    if (result.ok) {
      onRegistered();
      return;
    }
    // A cancelled setup attempt isn't an error worth showing -- the
    // person can just tap "Set up" again when ready.
    setStatus(result.reason === "cancelled" ? "idle" : "error");
    if (result.reason !== "cancelled") setMessage(result.message);
  }

  return (
    <div className="flex flex-shrink-0 items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-900">
          Set up Face ID for one-swipe ordering
        </p>
        <p className="mt-0.5 text-xs text-emerald-700">
          Confirms it&apos;s really you on every order, right on your device.
        </p>
        {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
      </div>
      <button
        type="button"
        onClick={handleSetUp}
        disabled={status === "working"}
        className="flex-shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {status === "working" ? "Setting up…" : "Set up"}
      </button>
    </div>
  );
}
