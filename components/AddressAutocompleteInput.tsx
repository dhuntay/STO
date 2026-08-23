"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserLocation } from "@/lib/googleMaps";

export type SelectedAddress = {
  address: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
};

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: SelectedAddress) => void;
  placeholder?: string;
};

const MIN_CHARS = 3;
const DEBOUNCE_MS = 250;

// Address-search counterpart to RestaurantAutocompleteInput -- same
// debounced Places Autocomplete (New) pattern, but unrestricted by place
// type (a truck's "where you're parked" spot might be a street address, an
// intersection, or a named lot, not just a listed business) and it
// additionally resolves lat/lng from Place Details, so the Operator
// dashboard's Location card no longer needs the operator to type
// coordinates by hand -- see LocationCard in OperatorDashboard.tsx.
export default function AddressAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<GeolocationCoordinates | null>(null);
  const locationRequested = useRef(false);
  // Set when the user picks a suggestion, so the resulting value change
  // doesn't immediately trigger a fresh search for what we just filled in.
  const skipNextSearch = useRef(false);

  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
    onChangeRef.current = onChange;
  });

  const ensureLocation = useCallback(async () => {
    if (locationRequested.current) return;
    locationRequested.current = true;
    coordsRef.current = await getBrowserLocation();
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (skipNextSearch.current) {
        skipNextSearch.current = false;
        return;
      }

      const query = value.trim();
      if (query.length < MIN_CHARS) {
        setSuggestions([]);
        setOpen(false);
        setErrorMessage(null);
        return;
      }

      setLoading(true);
      try {
        const body: Record<string, unknown> = { input: query };
        const coords = coordsRef.current;
        if (coords) {
          body.locationBias = {
            circle: {
              center: {
                latitude: coords.latitude,
                longitude: coords.longitude,
              },
              radius: 10000,
            },
          };
        }

        const res = await fetch(
          "https://places.googleapis.com/v1/places:autocomplete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
            },
            body: JSON.stringify(body),
          }
        );

        if (cancelled) return;

        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          setSuggestions([]);
          setOpen(false);
          setErrorMessage(
            detail?.error?.message ??
              "Address suggestions are unavailable right now."
          );
          return;
        }

        const data = await res.json();
        const parsed: Suggestion[] = (data.suggestions ?? [])
          .filter((s: unknown) => (s as { placePrediction?: unknown }).placePrediction)
          .map((s: {
            placePrediction: {
              placeId: string;
              text?: { text?: string };
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
            };
          }) => ({
            placeId: s.placePrediction.placeId,
            mainText:
              s.placePrediction.structuredFormat?.mainText?.text ??
              s.placePrediction.text?.text ??
              "",
            secondaryText:
              s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
          }));

        setErrorMessage(null);
        setSuggestions(parsed);
        setOpen(parsed.length > 0);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setOpen(false);
          setErrorMessage("Address suggestions are unavailable right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, apiKey]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSelect(suggestion: Suggestion) {
    skipNextSearch.current = true;
    setOpen(false);
    setSuggestions([]);

    const fallbackAddress =
      [suggestion.mainText, suggestion.secondaryText].filter(Boolean).join(", ") ||
      suggestion.mainText;
    onChangeRef.current(fallbackAddress);

    let address = fallbackAddress;
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${suggestion.placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey ?? "",
            "X-Goog-FieldMask": "formattedAddress,displayName,location",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.formattedAddress) address = data.formattedAddress;
        if (data.location?.latitude != null && data.location?.longitude != null) {
          lat = data.location.latitude;
          lng = data.location.longitude;
        }
      }
    } catch {
      // Coordinates are a bonus on top of the typed address -- if this
      // fails, "Use my current location" still covers lat/lng.
    }

    onChangeRef.current(address);
    onPlaceSelectedRef.current({ address, placeId: suggestion.placeId, lat, lng });
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={ensureLocation}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={
          placeholder ?? (apiKey ? "Start typing an address…" : "Corner of 5th & Main")
        }
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
      />

      {loading && (
        <span className="absolute right-3 top-2.5 text-[11px] text-zinc-400">
          Searching…
        </span>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full px-3 py-2 text-left transition hover:bg-zinc-50"
              >
                <span className="block truncate text-sm text-zinc-900">
                  {s.mainText}
                </span>
                {s.secondaryText && (
                  <span className="block truncate text-[11px] text-zinc-400">
                    {s.secondaryText}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {errorMessage && (
        <p className="mt-1 text-[11px] text-amber-600">
          {errorMessage} You can still type the address manually.
        </p>
      )}

      {!apiKey && (
        <p className="mt-1 text-[11px] text-zinc-400">
          Type the address — autocomplete suggestions aren&apos;t configured.
        </p>
      )}
    </div>
  );
}
