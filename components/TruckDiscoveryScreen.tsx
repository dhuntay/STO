"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  distanceMiles,
  trucksWithinRadius,
  truckMatchesQuery,
  MAX_TRUCK_SEARCH_RADIUS_MILES,
} from "@/lib/trucks";

type Props = {
  trucks: Truck[];
};

// The "Find food truck" search field from STO_Consolidated_Context.md,
// "Truck Search & Menu Selection UX": location-aware, matches by truck
// name/cuisine/menu content, and the customer picks from what's surfaced
// rather than typing a free-text business name. STO is nationwide, so
// results are hard-filtered to MAX_TRUCK_SEARCH_RADIUS_MILES -- not just
// sorted by distance -- once we know where the customer is.
export default function TruckDiscoveryScreen({ trucks }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationDenied(true),
      { timeout: 8000 }
    );
  }, []);

  const results = useMemo(() => {
    const nearby = trucksWithinRadius(trucks, coords);
    const matched = nearby.filter((t) => truckMatchesQuery(t, query));

    if (!coords) return matched;

    return [...matched].sort((a, b) => {
      if (a.lat == null || a.lng == null) return 1;
      if (b.lat == null || b.lng == null) return -1;
      const da = distanceMiles(coords.lat, coords.lng, a.lat, a.lng);
      const db = distanceMiles(coords.lat, coords.lng, b.lat, b.lng);
      return da - db;
    });
  }, [trucks, query, coords]);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-50 px-4 pb-4 pt-3 sm:px-6">
      <header className="flex flex-shrink-0 items-center justify-between pb-3">
        <h1 className="text-lg font-bold tracking-tight text-zinc-900">
          Slide to Order
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/operator"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-700"
          >
            Own a truck?
          </Link>
          <span className="text-xs text-zinc-400">Pickup</span>
        </div>
      </header>

      <label className="mb-4 flex-shrink-0">
        <span className="mb-1 block text-sm font-medium text-zinc-700">
          Find food truck
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by truck, cuisine, or dish..."
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
        />
        {locationDenied && (
          <span className="mt-1 block text-xs text-zinc-400">
            Location unavailable — showing all open trucks.
          </span>
        )}
        {!locationDenied && coords && (
          <span className="mt-1 block text-xs text-zinc-400">
            Showing trucks within {MAX_TRUCK_SEARCH_RADIUS_MILES} miles.
          </span>
        )}
      </label>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <p className="pt-8 text-center text-sm text-zinc-400">
            {coords
              ? `No open trucks within ${MAX_TRUCK_SEARCH_RADIUS_MILES} miles match “${query}” right now.`
              : `No open trucks match “${query}” right now.`}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {results.map((truck) => (
              <li key={truck.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/trucks/${truck.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300"
                >
                  <div
                    className="h-14 w-14 flex-shrink-0 rounded-lg bg-zinc-100 bg-cover bg-center"
                    style={
                      truck.photoUrl
                        ? { backgroundImage: `url(${truck.photoUrl})` }
                        : undefined
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {truck.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {truck.cuisine ?? "Food truck"}
                      {truck.locationLabel ? ` · ${truck.locationLabel}` : ""}
                    </p>
                  </div>
                  {coords && truck.lat != null && truck.lng != null && (
                    <span className="flex-shrink-0 text-xs text-zinc-400">
                      {distanceMiles(
                        coords.lat,
                        coords.lng,
                        truck.lat,
                        truck.lng
                      ).toFixed(1)}{" "}
                      mi
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
