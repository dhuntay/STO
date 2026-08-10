"use client";

/** Ask for the browser's geolocation to bias restaurant search to nearby
 * results. Resolves to null (never rejects) if permission is denied,
 * unsupported, or times out — callers should proceed without bias. */
export function getBrowserLocation(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => resolve(null),
      { timeout: 5000, maximumAge: 5 * 60 * 1000 }
    );
  });
}
