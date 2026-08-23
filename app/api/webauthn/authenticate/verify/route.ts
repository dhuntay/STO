import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { webauthnParty, WEBAUTHN_CHALLENGE_COOKIE } from "@/lib/webauthn";

// Second step of the fresh, live per-swipe Face ID/fingerprint re-check.
// A WebAuthn assertion has no memory across calls by spec -- every single
// call here is a brand-new challenge-response that the phone's secure
// hardware has to answer right then, regardless of whether the phone
// happens to already be unlocked or whether Apple Pay/Google Pay would
// have skipped their own prompt. Nothing downstream (order creation,
// tokenize, charge -- see WalletCharge.tsx) runs unless this returns
// verified: true.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json(
      { error: "That check expired -- please swipe again." },
      { status: 400 }
    );
  }

  let response: Parameters<typeof verifyAuthenticationResponse>[0]["response"];
  try {
    response = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: cred, error: credError } = await admin
    .from("webauthn_credentials")
    .select("id, credential_id, public_key, counter, transports")
    .eq("user_id", user.id)
    .eq("credential_id", response.id)
    .maybeSingle();

  if (credError) {
    return NextResponse.json({ error: credError.message }, { status: 500 });
  }
  if (!cred) {
    return NextResponse.json(
      { error: "This device isn't registered for Face ID." },
      { status: 404 }
    );
  }

  const { rpID, origin } = webauthnParty(request);

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credential_id,
        publicKey: Buffer.from(cred.public_key, "base64url"),
        counter: Number(cred.counter),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transports: (cred.transports ?? undefined) as any,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed." },
      { status: 400 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "That didn't match." }, { status: 401 });
  }

  await admin
    .from("webauthn_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", cred.id);

  const res = NextResponse.json({ verified: true });
  res.cookies.delete(WEBAUTHN_CHALLENGE_COOKIE);
  return res;
}
