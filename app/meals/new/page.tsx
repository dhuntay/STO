import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddMealForm from "@/components/AddMealForm";
import { Truck, TruckRow, MenuItemRow, mapTruckRow } from "@/lib/trucks";

const TRUCK_COLUMNS =
  "id, name, cuisine, description, photo_url, current_location_label, " +
  "current_lat, current_lng, opens_at, closes_at, is_open, accepting_pickup, " +
  "pos_connected, square_application_id, square_location_id, square_environment, " +
  "menu_items(id, truck_id, name, price, main_ingredients, photo_url, is_available_today, is_sold_out, is_removed)";

export default async function NewMealPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // The "Find food truck" field searches real trucks (added by owners in
  // the Operator UI), the same open+accepting-pickup set /trucks shows --
  // see STO_Consolidated_Context.md, "Truck Search & Menu Selection UX".
  const { data, error } = await supabase
    .from("trucks")
    .select(TRUCK_COLUMNS)
    .eq("is_active", true)
    .eq("is_open", true)
    .eq("accepting_pickup", true);

  if (error) {
    throw new Error(`Failed to load food trucks: ${error.message}`);
  }

  const trucks: Truck[] = (data ?? []).map((row) =>
    mapTruckRow(row as unknown as TruckRow & { menu_items: MenuItemRow[] })
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-50 px-4 pb-4 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center gap-3 pb-3">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600"
          aria-label="Back to ordering screen"
        >
          &larr; Back
        </Link>
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">
          Add a saved meal
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto pb-6">
        <div className="w-full max-w-sm pt-2">
          <AddMealForm trucks={trucks} />
        </div>
      </main>
    </div>
  );
}
