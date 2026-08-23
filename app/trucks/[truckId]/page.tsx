import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TruckMenuScreen from "@/components/TruckMenuScreen";
import { Truck, TruckRow, MenuItemRow, mapTruckRow } from "@/lib/trucks";

const TRUCK_COLUMNS =
  "id, name, cuisine, description, photo_url, current_location_label, " +
  "current_lat, current_lng, opens_at, closes_at, is_open, accepting_pickup, " +
  "menu_items(id, truck_id, name, price, main_ingredients, photo_url, is_available_today, is_sold_out)";

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
