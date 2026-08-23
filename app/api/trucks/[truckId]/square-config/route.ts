import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public, read-only Square config for a truck. None of these fields are
// secret -- application id and location id are meant to be used
// client-side, and this same data already rides along in POST
// /api/orders' response once an order exists.
//
// This route exists so useSquareWallet can start pre-warming Apple
// Pay/Google Pay for a truck-linked meal the moment the customer selects
// it -- well before they swipe -- instead of waiting for an order to be
// created first. See useSquareWallet.ts for why that timing matters.
type TruckSquareConfigRow = {
  id: string;
  pos_connected: boolean;
  square_application_id: string | null;
  square_location_id: string | null;
  square_environment: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ truckId: string }> }
) {
  const { truckId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("trucks")
    .select("id, pos_connected, square_application_id, square_location_id, square_environment")
    .eq("id", truckId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const truck = data as unknown as TruckSquareConfigRow | null;
  if (!truck) {
    return NextResponse.json({ error: "Truck not found." }, { status: 404 });
  }

  return NextResponse.json({
    connected: truck.pos_connected,
    applicationId: truck.square_application_id,
    locationId: truck.square_location_id,
    environment: truck.square_environment === "production" ? "production" : "sandbox",
  });
}
