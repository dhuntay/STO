import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ConnectBody = {
  applicationId?: unknown;
  accessToken?: unknown;
  locationId?: unknown;
  environment?: unknown;
  webhookSignatureKey?: unknown;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Lets a truck owner paste their Square sandbox/production credentials from
// the Operator dashboard's Payments card. truck_pos_connections has no
// client-facing RLS policy at all (it holds the access token), so both the
// ownership check and the write happen here: the request-scoped client
// verifies the caller actually owns this truck, then the admin client does
// the actual upsert.
//
// application_id/location_id/environment are duplicated onto the public
// trucks row (added in the trucks_public_square_config_columns migration)
// so the customer-facing SquarePaymentModal can initialize the Web
// Payments SDK straight from the truck data it already fetches, without a
// dedicated "give me the public Square config" API route.
export async function POST(request: Request, { params }: { params: Promise<{ truckId: string }> }) {
  const { truckId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: truck, error: truckError } = await supabase
    .from("trucks")
    .select("id, owner_id")
    .eq("id", truckId)
    .maybeSingle();

  if (truckError) {
    return NextResponse.json({ error: truckError.message }, { status: 500 });
  }
  if (!truck || truck.owner_id !== user.id) {
    return NextResponse.json({ error: "Truck not found." }, { status: 404 });
  }

  let body: ConnectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const applicationId = str(body.applicationId);
  const accessToken = str(body.accessToken);
  const locationId = str(body.locationId);
  const environment = str(body.environment) === "production" ? "production" : "sandbox";
  const webhookSignatureKey = str(body.webhookSignatureKey);

  if (!applicationId || !accessToken || !locationId) {
    return NextResponse.json(
      { error: "Application ID, access token, and location ID are all required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // webhook_signature_key is deliberately left out of the payload (rather
  // than set to null) when the field was left blank -- it's usually added
  // in a second pass, after the owner finishes setting up the webhook in
  // Square's dashboard, and re-submitting the credentials fields alone
  // (e.g. rotating the access token) shouldn't wipe out a signing key that
  // was already saved. Omitting a key from an upsert's payload means
  // ON CONFLICT DO UPDATE leaves that column untouched.
  const { error: upsertError } = await admin.from("truck_pos_connections").upsert(
    {
      truck_id: truckId,
      provider: "square",
      environment,
      application_id: applicationId,
      location_id: locationId,
      access_token: accessToken,
      ...(webhookSignatureKey ? { webhook_signature_key: webhookSignatureKey } : {}),
    },
    { onConflict: "truck_id" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { error: truckUpdateError } = await admin
    .from("trucks")
    .update({
      pos_connected: true,
      square_application_id: applicationId,
      square_location_id: locationId,
      square_environment: environment,
    })
    .eq("id", truckId);

  if (truckUpdateError) {
    return NextResponse.json({ error: truckUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
