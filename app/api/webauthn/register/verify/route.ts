import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { webauthnParty, WEBAUTHN_CHALLENGE_COOKIE } from "@/lib/webauthn";

// Second step of the "set up Face ID" ceremony: verifies the attestation
// the browser produced against the challenge issued by
// register/options/route.ts, then stores only the resulting *public* key.
// See the webauthn_credentials migration comment -- this is not biometric
// data, and STO never sees the actual Face ID/fingerprint check, which
// happens entirely inside the device's secure hardware.
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
      { error: "This setup attempt expired. Please try again." },
      { status: 400 }
    );
  }

  let response: Parameters<typeof verifyRegistrationResponse>[0]["response"];
  try {
    response = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { rpID, origin } = webauthnParty(request);

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed." },
      { status: 400 }
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Couldn't verify this device." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("webauthn_credentials").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports ?? null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const res = NextResponse.json({ verified: true });
  res.cookies.delete(WEBAUTHN_CHALLENGE_COOKIE);
  return res;
}
