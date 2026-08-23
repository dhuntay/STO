// Row types mirror the `trucks` / `menu_items` tables from
// 0005_create_food_truck_platform_schema.sql (plus the Square config
// columns added in trucks_public_square_config_columns). Domain types +
// mappers follow the same pattern as SavedMealRow/SavedMeal/mapMealRow in
// lib/types.ts.

export type TruckRow = {
  id: string;
  name: string;
  cuisine: string | null;
  description: string | null;
  photo_url: string | null;
  current_location_label: string | null;
  current_lat: number | null;
  current_lng: number | null;
  opens_at: string | null;
  closes_at: string | null;
  is_open: boolean;
  accepting_pickup: boolean;
  /** Whether this truck has a Square connection saved. The connection's
   * secrets live only in truck_pos_connections, which no client role can
   * read -- customers use this flag to know whether checkout is even
   * possible, and the operator dashboard uses it to show connected/not. */
  pos_connected: boolean;
  /** Non-secret Square config, duplicated here from truck_pos_connections
   * so the customer-facing Web Payments SDK can initialize straight from
   * the truck data already being fetched, without its own API round trip. */
  square_application_id: string | null;
  square_location_id: string | null;
  square_environment: string | null;
};

export type MenuItemRow = {
  id: string;
  truck_id: string;
  name: string;
  price: number;
  main_ingredients: string[];
  photo_url: string | null;
  is_available_today: boolean;
  is_sold_out: boolean;
  /** Soft-delete flag -- menu_items can't be hard-deleted once a real
   * order references them (order_items.menu_item_id is a not-null FK), so
   * "Remove" in the Operator dashboard sets this instead. Every query that
   * embeds menu_items(...) must select this column, or a removed item
   * will incorrectly look present here (see mapTruckRow's filter below). */
  is_removed: boolean;
};

export type MenuItem = {
  id: string;
  truckId: string;
  name: string;
  price: number;
  mainIngredients: string[];
  photoUrl: string | null;
  isAvailableToday: boolean;
  isSoldOut: boolean;
};

export type Truck = {
  id: string;
  name: string;
  cuisine: string | null;
  description: string | null;
  photoUrl: string | null;
  locationLabel: string | null;
  lat: number | null;
  lng: number | null;
  opensAt: string | null;
  closesAt: string | null;
  isOpen: boolean;
  acceptingPickup: boolean;
  menuItems: MenuItem[];
  posConnected: boolean;
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnvironment: "sandbox" | "production" | null;
};

export function mapMenuItemRow(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    truckId: row.truck_id,
    name: row.name,
    price: row.price,
    mainIngredients: row.main_ingredients ?? [],
    photoUrl: row.photo_url,
    isAvailableToday: row.is_available_today,
    isSoldOut: row.is_sold_out,
  };
}

export function mapTruckRow(
  row: TruckRow & { menu_items?: MenuItemRow[] }
): Truck {
  return {
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    description: row.description,
    photoUrl: row.photo_url,
    locationLabel: row.current_location_label,
    lat: row.current_lat,
    lng: row.current_lng,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isOpen: row.is_open,
    acceptingPickup: row.accepting_pickup,
    // Removed items never surface anywhere -- operator dashboard,
    // truck discovery, or "Find food truck" menu selection.
    menuItems: (row.menu_items ?? [])
      .filter((item) => !item.is_removed)
      .map(mapMenuItemRow),
    posConnected: row.pos_connected,
    squareApplicationId: row.square_application_id,
    squareLocationId: row.square_location_id,
    squareEnvironment:
      row.square_environment === "production"
        ? "production"
        : row.square_environment === "sandbox"
          ? "sandbox"
          : null,
  };
}

// Haversine distance in miles between two lat/lng points. Client-side
// distance sort is fine at MVP scale (a handful of trucks); a Postgres RPC
// can replace this later if the truck list grows large enough to need
// server-side "nearby" filtering.
export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// STO is nationwide -- trucks in another state are never relevant to a
// customer's search, so "nearby" is a hard cutoff, not just a sort order.
// See STO_Consolidated_Context.md, "Truck Search & Menu Selection UX".
export const MAX_TRUCK_SEARCH_RADIUS_MILES = 10;

// Filters (not just sorts) trucks down to those within `radiusMiles` of the
// given coordinates. A truck with no recorded location is excluded, since
// there's no way to confirm it's actually nearby. When `coords` is null
// (location denied/unavailable), every truck is returned unfiltered --
// callers should surface that as a "showing all trucks" state rather than
// silently pretending the radius was applied.
export function trucksWithinRadius(
  trucks: Truck[],
  coords: { lat: number; lng: number } | null,
  radiusMiles: number = MAX_TRUCK_SEARCH_RADIUS_MILES
): Truck[] {
  if (!coords) return trucks;
  return trucks.filter((t) => {
    if (t.lat == null || t.lng == null) return false;
    return (
      distanceMiles(coords.lat, coords.lng, t.lat, t.lng) <= radiusMiles
    );
  });
}

// Does this truck match a "Find food truck" search query by truck name,
// cuisine, or any of its menu item names? See STO_Consolidated_Context.md,
// "Truck Search & Menu Selection UX".
export function truckMatchesQuery(truck: Truck, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (truck.name.toLowerCase().includes(q)) return true;
  if (truck.cuisine?.toLowerCase().includes(q)) return true;
  return truck.menuItems.some((item) => item.name.toLowerCase().includes(q));
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
