"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserLocation } from "@/lib/googleMaps";
import {
  Truck,
  distanceMiles,
  trucksWithinRadius,
  truckMatchesQuery,
  MAX_TRUCK_SEARCH_RADIUS_MILES,
} from "@/lib/trucks";

type Props = {
  trucks: Truck[];
  value: string;
  onChange: (value: string) => void;
  onTruckSelected: (truck: Truck) => void;
};

const MIN_CHARS = 1;

// Replaces the old Google Places restaurant autocomplete on this form: the
// "Restaurant" field is now "Find food truck", searching the app's own
// `trucks` table (added by truck owners in the Operator UI) instead of an
// external API -- so there's nothing here that can 403. Results are hard
// -filtered to within MAX_TRUCK_SEARCH_RADIUS_MILES, not just sorted by
// distance: a customer in TX has no use for a truck in NC. See
// STO_Consolidated_Context.md, "Truck Search & Menu Selection UX".
export default function TruckAutocompleteInput({
  trucks,
  value,
  onChange,
  onTruckSelected,
}: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationDenied, setLocationDenied] = useState(false);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const locationRequested = useRef(false);

  // Ask for location once, lazily, so results can be filtered to nearby
  // trucks -- same lazy-on-focus pattern the old Places input used.
  const ensureLocation = useCallback(async () => {
    if (locationRequested.current) return;
    locationRequested.current = true;
    const position = await getBrowserLocation();
    if (position) {
      setCoords({ lat: position.latitude, lng: position.longitude });
    } else {
      setLocationDenied(true);
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const query = value.trim();
  const nearby = trucksWithinRadius(trucks, coords);
  const results =
    query.length < MIN_CHARS
      ? nearby
      : nearby.filter((t) => truckMatchesQuery(t, query));

  const sorted = coords
    ? [...results].sort((a, b) => {
        if (a.lat == null || a.lng == null) return 1;
        if (b.lat == null || b.lng == null) return -1;
        return (
          distanceMiles(coords.lat, coords.lng, a.lat, a.lng) -
          distanceMiles(coords.lat, coords.lng, b.lat, b.lng)
        );
      })
    : results;

  function handleSelect(truck: Truck) {
    setOpen(false);
    onChange(truck.name);
    onTruckSelected(truck);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id="restaurant"
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          ensureLocation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Start typing a food truck name…"
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
      />

      {locationDenied && (
        <p className="mt-1 text-[11px] text-zinc-400">
          Location unavailable — showing all food trucks.
        </p>
      )}

      {open && sorted.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
          {sorted.map((truck) => (
            <li key={truck.id}>
              <button
                type="button"
                onClick={() => handleSelect(truck)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-zinc-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-zinc-900">
                    {truck.name}
                  </span>
                  {(truck.cuisine || truck.locationLabel) && (
                    <span className="block truncate text-[11px] text-zinc-400">
                      {[truck.cuisine, truck.locationLabel]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </span>
                {coords && truck.lat != null && truck.lng != null && (
                  <span className="flex-shrink-0 text-[11px] text-zinc-400">
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

      {open && query.length >= MIN_CHARS && sorted.length === 0 && (
        <p className="mt-1 text-[11px] text-amber-600">
          No open food trucks within {MAX_TRUCK_SEARCH_RADIUS_MILES} miles
          match &ldquo;{query}&rdquo;. You can still type the name yourself.
        </p>
      )}
    </div>
  );
}
