/**
 * Cloudflare Pages Function — POST /api/subscribe
 *
 * Receives { email } from the browser, hands it to Buttondown using the
 * BUTTONDOWN_API_KEY environment variable (set as an encrypted Secret in
 * Pages → Settings → Variables and Secrets — never shipped to the browser).
 *
 * Returns:
 *   200 { ok: true, status: "subscribed" | "already_subscribed" }
 *   400 { error: "..." }   — invalid email or known client error
 *   502 { error: "..." }   — Buttondown unreachable / unexpected response
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUTTONDOWN_ENDPOINT = "https://api.buttondown.com/v1/subscribers";

export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse and validate the body.
  let email = "";
  try {
    const body = await request.json();
    email = String(body.email || "").trim().toLowerCase();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  if (!email || !EMAIL_RE.test(email)) {
    return jsonError("Please enter a valid email address.", 400);
  }

  if (!env.BUTTONDOWN_API_KEY) {
    return jsonError("Server is misconfigured.", 500);
  }

  // Forward to Buttondown.
  let bdRes;
  try {
    bdRes = await fetch(BUTTONDOWN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Token ${env.BUTTONDOWN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        tags: ["founding-100"],
        referrer_url: request.headers.get("referer") || "https://shaggy.dog",
      }),
    });
  } catch (err) {
    return jsonError("Could not reach the mailing list — please try again.", 502);
  }

  // 201 Created — new subscriber.
  if (bdRes.status === 201 || bdRes.status === 200) {
    return Response.json({ ok: true, status: "subscribed" });
  }

  // Buttondown often returns 400 with a body that contains "already" for
  // duplicate signups. Treat that as a soft success — the user's intent
  // (be on the list) is satisfied.
  if (bdRes.status === 400 || bdRes.status === 409) {
    const text = await bdRes.text().catch(() => "");
    if (text.toLowerCase().includes("already")) {
      return Response.json({ ok: true, status: "already_subscribed" });
    }
    return jsonError("Could not subscribe — please check the email and try again.", 400);
  }

  // Anything else (auth failure, 5xx, etc.) → log and surface a generic error.
  // The full Buttondown response stays in Cloudflare's logs, never the browser.
  console.error("Buttondown returned", bdRes.status, await bdRes.text().catch(() => ""));
  return jsonError("Could not subscribe — please try again in a moment.", 502);
}

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}
