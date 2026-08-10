"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserLocation } from "@/lib/googleMaps";

export type SelectedPlace = {
  name: string;
  address: string | null;
  placeId: string;
  types: string[];
};

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: SelectedPlace) => void;
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

export default function RestaurantAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
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

  // Keep the latest callbacks in refs so the debounced search effect doesn't
  // need them as dependencies (they're recreated on every parent render).
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
    onChangeRef.current = onChange;
  });

  // Ask for location once, lazily, to bias results toward nearby places.
  const ensureLocation = useCallback(async () => {
    if (locationRequested.current) return;
    locationRequested.current = true;
    coordsRef.current = await getBrowserLocation();
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      // The value change came from selecting a suggestion, not typing.
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
        const body: Record<string, unknown> = {
          input: query,
          includedPrimaryTypes: ["restaurant"],
        };
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
              "Restaurant suggestions are unavailable right now."
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
          setErrorMessage("Restaurant suggestions are unavailable right now.");
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

  // Close the dropdown when clicking outside.
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
    onChangeRef.current(suggestion.mainText);

    let types: string[] = [];
    let address: string | null = suggestion.secondaryText || null;

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${suggestion.placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey ?? "",
            "X-Goog-FieldMask": "types,formattedAddress,displayName",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.types)) types = data.types;
        if (data.formattedAddress) address = data.formattedAddress;
      }
    } catch {
      // Cuisine/address enrichment is a bonus — fall back to the prediction.
    }

    onPlaceSelectedRef.current({
      name: suggestion.mainText,
      address,
      placeId: suggestion.placeId,
      types,
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id="restaurant"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={ensureLocation}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={
          apiKey ? "Start typing a restaurant name…" : "Tony's Pizzeria"
        }
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
      />

      {loading && (
        <span className="absolute right-3 top-3 text-[11px] text-zinc-400">
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
          {errorMessage} You can still type the restaurant name.
        </p>
      )}

      {!apiKey && (
        <p className="mt-1 text-[11px] text-zinc-400">
          Type the restaurant name — nearby search suggestions aren&apos;t
          configured.
        </p>
      )}
    </div>
  );
}
