/**
 * Cloudflare Pages Function — GET /api/count
 *
 * Returns the number of founding-100 spots remaining by querying the
 * real Buttondown subscriber count (tagged "founding-100").
 *
 * Response is cached at the edge for 60 seconds so we don't hammer
 * Buttondown on every page load, while still staying reasonably fresh.
 *
 * Returns:
 *   200 { remaining: <number>, cap: 100 }
 *   502 { error: "..." }  — Buttondown unreachable
 */

const CAP = 100;
const BUTTONDOWN_ENDPOINT = "https://api.buttondown.com/v1/subscribers";

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.BUTTONDOWN_API_KEY) {
    // If the key isn't set, fall back gracefully to cap.
    return jsonOk(CAP);
  }

  try {
    // Buttondown v1 API: GET /v1/subscribers?tag=founding-100
    // The response is paginated; the `count` field in the response
    // tells us the total number of matching subscribers.
    const bdRes = await fetch(`${BUTTONDOWN_ENDPOINT}?tag=founding-100`, {
      headers: {
        Authorization: `Token ${env.BUTTONDOWN_API_KEY}`,
      },
    });

    if (!bdRes.ok) {
      console.error("Buttondown /subscribers returned", bdRes.status);
      return jsonOk(CAP); // Fail open — show full count rather than break the page.
    }

    const data = await bdRes.json();

    // Buttondown v1 paginated response: { count, next, previous, results }
    const claimed = typeof data.count === "number" ? data.count : (Array.isArray(data.results) ? data.results.length : 0);
    const remaining = Math.max(0, CAP - claimed);

    return new Response(JSON.stringify({ remaining, cap: CAP }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache at the edge for 60s so page loads are fast,
        // but the count stays reasonably current.
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (err) {
    console.error("Error fetching Buttondown count:", err);
    return jsonOk(CAP); // Fail open.
  }
}

function jsonOk(remaining) {
  return new Response(JSON.stringify({ remaining, cap: CAP }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
