// Shared server-side WebAuthn config: the "Relying Party" identity every
// registration/authentication ceremony is scoped to. Derived per-request
// from the request's own URL rather than hardcoded, since STO is reachable
// from more than one Vercel hostname (production domain + preview URLs) --
// a mismatched rpID/origin makes the browser refuse the ceremony outright.
export function webauthnParty(request: Request) {
  const url = new URL(request.url);
  return {
    rpID: url.hostname,
    rpName: "Slide to Order",
    origin: url.origin,
  };
}

// Short-lived cookie carrying the challenge between the "options" and
// "verify" steps of a single ceremony. httpOnly/secure/sameSite=strict --
// nothing but this server ever needs to read it, and it's never exposed to
// client JS. 120s is generous for "look at your phone and confirm" but
// still short enough that a stale/replayed challenge can't be reused
// later.
export const WEBAUTHN_CHALLENGE_COOKIE = "sto_webauthn_challenge";
export const WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS = 120;

// Cookies only carry `secure` in production -- local `next dev` over plain
// http would silently fail to set/read the cookie otherwise, breaking the
// ceremony before it can even reach a device to test against.
export const WEBAUTHN_COOKIE_SECURE = process.env.NODE_ENV === "production";
