"use client";

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

export type FaceCheckResult =
  | { ok: true }
  | { ok: false; reason: "not_registered" | "cancelled" | "error"; message: string };

function isCancelledError(err: unknown): boolean {
  // @simplewebauthn/browser throws a WebAuthnError (a DOMException-like
  // object) named "NotAllowedError" both when the person cancels/dismisses
  // the prompt and when it times out -- there's no separate signal to tell
  // those apart, so both are treated the same way: quietly go back to the
  // pre-swipe screen, matching how a cancelled/timed-out wallet attempt is
  // already handled (see WalletCharge.tsx).
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "NotAllowedError"
  );
}

// One-time device registration: asks the browser for a credential from
// this device's own platform authenticator -- the same Face
// ID/fingerprint/Touch ID hardware the phone's lock screen itself uses --
// and stores its *public* key server-side. See the webauthn_credentials
// migration for why that's not biometric data.
export async function registerFaceId(): Promise<FaceCheckResult> {
  try {
    const optionsRes = await fetch("/api/webauthn/register/options");
    const options = await optionsRes.json().catch(() => null);
    if (!optionsRes.ok) {
      return { ok: false, reason: "error", message: options?.error ?? "Couldn't start setup." };
    }

    const attestation = await startRegistration({ optionsJSON: options });

    const verifyRes = await fetch("/api/webauthn/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attestation),
    });
    const verifyBody = await verifyRes.json().catch(() => null);
    if (!verifyRes.ok || !verifyBody?.verified) {
      return {
        ok: false,
        reason: "error",
        message: verifyBody?.error ?? "Couldn't confirm this device.",
      };
    }

    return { ok: true };
  } catch (err) {
    return isCancelledError(err)
      ? { ok: false, reason: "cancelled", message: "Setup cancelled." }
      : { ok: false, reason: "error", message: "Face ID setup isn't available on this device." };
  }
}

// Forces a fresh, live biometric check -- no memory of any earlier check,
// no grace window, independent of whatever trust behavior Apple
// Pay/Google Pay use internally and independent of whether the phone
// happens to already be unlocked. Call this immediately before every
// truck-linked wallet charge (see WalletCharge.tsx) so a phone left
// unlocked on a table can't be used to place an order without the actual
// account holder's face/fingerprint answering a live challenge right
// then.
export async function verifyFaceId(): Promise<FaceCheckResult> {
  try {
    const optionsRes = await fetch("/api/webauthn/authenticate/options");
    if (optionsRes.status === 404) {
      return {
        ok: false,
        reason: "not_registered",
        message: "Set up Face ID to keep ordering this way.",
      };
    }
    const options = await optionsRes.json().catch(() => null);
    if (!optionsRes.ok) {
      return { ok: false, reason: "error", message: options?.error ?? "Couldn't start the check." };
    }

    const assertion = await startAuthentication({ optionsJSON: options });

    const verifyRes = await fetch("/api/webauthn/authenticate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assertion),
    });
    const verifyBody = await verifyRes.json().catch(() => null);
    if (!verifyRes.ok || !verifyBody?.verified) {
      return { ok: false, reason: "error", message: verifyBody?.error ?? "That didn't match." };
    }

    return { ok: true };
  } catch (err) {
    return isCancelledError(err)
      ? { ok: false, reason: "cancelled", message: "Cancelled." }
      : { ok: false, reason: "error", message: "Face ID check isn't available on this device." };
  }
}
