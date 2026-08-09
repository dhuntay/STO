// Server-only. UNSPLASH_ACCESS_KEY must never be exposed to the browser, so
// this module is only ever imported from Server Components / Route Handlers.

export type MealPhoto = {
  imageUrl: string;
  photographerName: string;
  photographerProfileUrl: string;
  unsplashUrl: string;
};

const APP_NAME = "swipeorder";

function withUtm(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", APP_NAME);
  u.searchParams.set("utm_medium", "referral");
  return u.toString();
}

/**
 * Search Unsplash for a photo matching `query` (a meal name). Returns null
 * if the key isn't configured, the search returns no results, or the
 * request fails — callers should fall back to the deterministic
 * emoji/gradient placeholder in that case.
 */
export async function searchMealPhoto(query: string): Promise<MealPhoto | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !query.trim()) return null;

  let res: Response;
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", `${query} food dish`);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      // Photo search results for a given meal name rarely change; avoid
      // burning API rate limits on every request.
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.results?.[0];
  if (!result) return null;

  // Unsplash API guidelines: ping download_location whenever a photo is
  // put to use (not just displayed after a user-initiated download).
  // Fire-and-forget — never let this block or fail the caller.
  if (result.links?.download_location) {
    fetch(result.links.download_location, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }).catch(() => {});
  }

  return {
    imageUrl: result.urls?.regular ?? result.urls?.small,
    photographerName: result.user?.name ?? "Unknown photographer",
    photographerProfileUrl: withUtm(
      result.user?.links?.html ?? "https://unsplash.com"
    ),
    unsplashUrl: withUtm("https://unsplash.com"),
  };
}
