import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Whether the signed-in customer has a registered Face ID device yet --
// drives FaceIdSetupBanner in OrderingScreen.tsx. This is a UX nicety
// only: the actual gate that blocks a charge without a fresh check lives
// in app/api/webauthn/authenticate/* (see WalletCharge.tsx), not here.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("webauthn_credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ registered: (count ?? 0) > 0 });
}
