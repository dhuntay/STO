// Row types mirror the `trucks` / `menu_items` tables from
// 0005_create_food_truck_platform_schema.sql. Domain types + mappers follow
// the same pattern as SavedMealRow/SavedMeal/mapMealRow in lib/types.ts.

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
    menuItems: (row.menu_items ?? []).map(mapMenuItemRow),
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
