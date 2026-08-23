import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  webauthnParty,
  WEBAUTHN_CHALLENGE_COOKIE,
  WEBAUTHN_CHALLENGE_MAX_AGE_SECONDS,
  WEBAUTHN_COOKIE_SECURE,
} from "@/lib/webauthn";

// First step of the fresh, live per-swipe Face ID/fingerprint re-check
// (see WalletCharge.tsx / verifyFaceId in lib/webauthnClient.ts). A 404
// here means this account has no registered device yet -- the caller
// shows the "set up Face ID" banner instead of attempting a check that
// can't succeed.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { rpID } = webauthnParty(request);
  const admin = createAdminClient();

  const { data: creds, error } = await admin
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!creds || creds.length === 0) {
    return NextResponse.json(
      { error: "Set up Face ID to keep ordering this way." },
      { status: 404 }
    );
  }

  const options = await generateAuthenticationOptions({
    rpID,
    // Every ceremony call gets a brand-new random challenge with no
    // memory of any previous one -- this is the property that makes this
    // check fresh every single swipe, unlike a wallet's own trust window.
    userVerification: "required",
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transports: (c.transports ?? undefined) as any,
    })),
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
