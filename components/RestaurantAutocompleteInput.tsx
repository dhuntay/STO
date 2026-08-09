"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, getBrowserLocation } from "@/lib/googleMaps";

export type SelectedPlace = {
  name: string;
  address: string | null;
  placeId: string;
  types: string[];
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: SelectedPlace) => void;
};

export default function RestaurantAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    const mapsPromise =
      loadGoogleMaps() ?? Promise.reject(new Error("Google Maps API key not configured"));

    mapsPromise
      .then(async (googleMaps) => {
        if (cancelled || !inputRef.current) return;

        const autocomplete = new googleMaps.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ["restaurant"],
            fields: ["place_id", "name", "formatted_address", "geometry"],
          }
        );

        // Bias (not restrict) results toward the user's location, if they
        // grant permission. Falls back to unbiased search otherwise.
        const coords = await getBrowserLocation();
        if (!cancelled && coords) {
          const center = new googleMaps.maps.LatLng(
            coords.latitude,
            coords.longitude
          );
          const circle = new googleMaps.maps.Circle({ center, radius: 8000 });
          const bounds = circle.getBounds();
          if (bounds) autocomplete.setBounds(bounds);
        }

        autocomplete.addListener("place_changed", async () => {
          const place = autocomplete.getPlace();
          if (!place.place_id || !place.name) return;

          onChange(place.name);

          // The legacy Autocomplete widget's `types` field only returns
          // broad categories (e.g. "restaurant"). To get a specific cuisine
          // (e.g. "pizza_restaurant") we look the place back up against
          // Places API (New), which has a much richer type taxonomy.
          let types: string[] = [];
          try {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
            const res = await fetch(
              `https://places.googleapis.com/v1/places/${place.place_id}`,
              {
                headers: {
                  "X-Goog-Api-Key": apiKey,
                  "X-Goog-FieldMask": "types",
                },
              }
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.types)) types = data.types;
            }
          } catch {
            // Cuisine lookup is a bonus, not required — ignore failures.
          }

          onPlaceSelected({
            name: place.name,
            address: place.formatted_address ?? null,
            placeId: place.place_id,
            types,
          });
        });

        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [onChange, onPlaceSelected]);

  return (
    <div>
      <input
        ref={inputRef}
        id="restaurant"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing a restaurant name…"
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
      />
      {status === "unavailable" && (
        <p className="mt-1 text-[11px] text-zinc-400">
          Type the restaurant name — nearby search suggestions aren&apos;t
          available right now.
        </p>
      )}
    </div>
  );
}
