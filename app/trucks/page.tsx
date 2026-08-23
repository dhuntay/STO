import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TruckDiscoveryScreen from "@/components/TruckDiscoveryScreen";
import { Truck, TruckRow, MenuItemRow, mapTruckRow } from "@/lib/trucks";

const TRUCK_COLUMNS =
  "id, name, cuisine, description, photo_url, current_location_label, " +
  "current_lat, current_lng, opens_at, closes_at, is_open, accepting_pickup, " +
  "menu_items(id, truck_id, name, price, main_ingredients, photo_url, is_available_today, is_sold_out, is_removed)";

// Truck discovery: the "Discover -> Select truck" entry point (context doc
// Section 3). Only trucks currently open and accepting pickup are shown --
// a closed/inactive truck simply doesn't appear rather than being greyed
// out, matching "is this truck real, present, open, stocked, and able to
// take another order right now" from Section 5.
export default async function TrucksPage() {
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
    .eq("is_active", true)
    .eq("is_open", true)
    .eq("accepting_pickup", true);

  if (error) {
    throw new Error(`Failed to load trucks: ${error.message}`);
  }

  const trucks: Truck[] = (data ?? []).map((row) =>
    mapTruckRow(row as unknown as TruckRow & { menu_items: MenuItemRow[] })
  );

  return <TruckDiscoveryScreen trucks={trucks} />;
}
