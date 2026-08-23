import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  webauthnParty,
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS,
  WEBAUTHN_COOKIE_SECURE,
} from "@/lib/webauthn";

// First step of the one-time "set up Face ID" ceremony (see
// FaceIdSetupBanner.tsx): asks the browser's platform authenticator --
// literally the same Face ID/fingerprint/Touch ID hardware as the phone's
// own lock screen -- to create a new credential, and hands back the
// challenge/options it needs to do that. The credential itself never
// leaves the device; only its public key comes back to
// register/verify/route.ts afterward.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { rpID, rpName } = webauthnParty(request);
  const admin = createAdminClient();

  const { data: existing, error } = await admin
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email ?? user.id,
    attestationType: "none",
    // Already-registered devices are excluded so re-running setup on the
    // same phone doesn't create a redundant credential for it.
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transports: (c.transports ?? undefined) as any,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      // Restrict to the device's own built-in authenticator (Face
      // ID/fingerprint/Touch ID) -- not a security key or another phone --
      // since the whole point is re-checking the account holder's own
      // biometric right there on the device placing the order.
      authenticatorAttachment: "platform",
    },
  });

  const res = NextResponse.json(options);
  res.cookies.set(WEBAUTHN_CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: WEBAUTHN_COOKIE_SECURE,
    sameSite: "strict",
    maxAge: WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
