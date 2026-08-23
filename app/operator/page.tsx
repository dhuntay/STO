import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateTruckForm from "@/components/CreateTruckForm";
import OperatorDashboard from "@/components/OperatorDashboard";
import { Truck, TruckRow, MenuItemRow, mapTruckRow } from "@/lib/trucks";

const TRUCK_COLUMNS =
  "id, name, cuisine, description, photo_url, current_location_label, " +
  "current_lat, current_lng, opens_at, closes_at, is_open, accepting_pickup, " +
  "menu_items(id, truck_id, name, price, main_ingredients, photo_url, is_available_today, is_sold_out)";

// The truck's own control surface (context doc Section 5, Food Truck
// Operator/Admin Web UI). One truck per owner in MVP -- see the 0005
// migration's comments on trucks/profiles.role. A signed-in user who
// doesn't have a truck yet lands on the create-truck onboarding form
// instead of the dashboard; RLS ("Owners can view their own truck")
// already scopes this query to the caller, so there's nothing else to
// authorize here beyond being signed in.
export default async function OperatorPage() {
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
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load your truck: ${error.message}`);
  }

  if (!data) {
    return <CreateTruckForm userId={user.id} />;
  }

  const truck: Truck = mapTruckRow(
    data as unknown as TruckRow & { menu_items: MenuItemRow[] }
  );

  return <OperatorDashboard truck={truck} />;
}
