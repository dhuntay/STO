import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TruckMenuScreen from "@/components/TruckMenuScreen";
import { Truck, TruckRow, MenuItemRow, mapTruckRow } from "@/lib/trucks";

const TRUCK_COLUMNS =
  "id, name, cuisine, description, photo_url, current_location_label, " +
  "current_lat, current_lng, opens_at, closes_at, is_open, accepting_pickup, " +
  "menu_items(id, truck_id, name, price, main_ingredients, photo_url, is_available_today, is_sold_out, is_removed)";

// trucks.id is a Postgres uuid column -- querying it with a malformed id
// (a stale link, a typo, a crawler probing random paths) makes Postgres
// return an "invalid input syntax for type uuid" error rather than an
// empty result. Left unhandled, that surfaced as a generic 500 crash page
// instead of a normal 404. Validate the shape up front so those requests
// take the same not-found path as a syntactically valid but nonexistent id.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "View menu -> Select items" (context doc Section 3). Item selection is a
// dropdown scoped to this truck's own owner-added, available-today items --
// never free text. Pickup-window selection, swipe-to-order, and payment are
// deliberately not wired up yet; this screen stops at item selection.
export default async function TruckMenuPage({
  params,
}: {
  params: Promise<{ truckId: string }>;
}) {
  const { truckId } = await params;

  if (!UUID_PATTERN.test(truckId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("trucks")
    .select(TRUCK_COLUMNS)
    .eq("id", truckId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load truck: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  const truck: Truck = mapTruckRow(
    data as unknown as TruckRow & { menu_items: MenuItemRow[] }
  );

  return <TruckMenuScreen truck={truck} />;
}
