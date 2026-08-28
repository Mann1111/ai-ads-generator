import crypto from "node:crypto";
import { nanoid } from "nanoid";

/**
 * ABA PayWay (KHQR) auto-payment integration.
 *
 * This follows the unofficial, scrape-based flow described in the client's
 * ABA auto-payment workflow spec (originally written for a different app,
 * adapted here for ai-ads-generator's single-product access-code model):
 *
 *   1. GET the merchant's public PayWay payment-link page and scrape the
 *      `aba_data` / `request_time` values it embeds for its own checkout JS.
 *   2. Build an `additional_fields` JSON blob and sign
 *      hash = sha512(request_time + aba_data + additional_fields)  (plain
 *      SHA-512, NOT HMAC — this is what ABA's own page JS does).
 *   3. POST that to ABA's `list-payment-options` endpoint to get back a KHQR
 *      string, which we render as a scannable QR image.
 *   4. Poll ABA's `check-payment-status` endpoint (signed the same way, with
 *      a per-session `device_id` and hash2 = sha512(client_id+device_id+
 *      request_time)) until `data.action === "approved"`.
 *
 * ⚠️ Known fragility (flagged, not hidden): this is not a documented
 * merchant API — it's reverse-engineered from ABA's own checkout page.
 * ABA's payment-link endpoint has previously returned HTTP 403 for requests
 * from Hostinger's shared-hosting IP ranges (see PROJECT_MEMORY for
 * sleukchak.site — the same issue killed an earlier attempt at this for the
 * PHP store). ai-ads-generator's backend runs on Render, which is a
 * different IP range, but there's no guarantee ABA isn't blocking by
 * behavior/UA rather than pure IP range — this needs a real end-to-end test
 * against the live ABA_PAYMENT_URL before you rely on it in production.
 *
 * ABA_MOCK lets you build/test the whole purchase flow (QR → poll → paid →
 * access code issued → unlock) without any real ABA credentials — it's on
 * by default whenever ABA_PAYMENT_URL isn't set, and can be forced on/off
 * explicitly for local testing even with a URL configured.
 */

const ABA_PAYMENT_URL = process.env.ABA_PAYMENT_URL || "";
const ABA_CLIENT_ID = process.env.ABA_CLIENT_ID || "";

// The PDF spec this was adapted from assumed pwapp.ababank.com, but the real
// payment link's own embedded Nuxt state (checked against a live link on
// 2026-08-28) reports its API base as pw-paygateway.ababank.com instead —
// that's what's used below. The exact endpoint *paths* under that base are
// still a best guess (ABA doesn't publish this contract), so both full URLs
// are overridable via env vars in case a live test turns up different ones.
const ABA_API_BASE = process.env.ABA_API_BASE || "https://pw-paygateway.ababank.com/api";
const LIST_OPTIONS_URL = process.env.ABA_LIST_OPTIONS_URL || `${ABA_API_BASE}/payment-link/list-payment-options`;
const CHECK_STATUS_URL = process.env.ABA_CHECK_STATUS_URL || `${ABA_API_BASE}/payment-link/check-payment-status`;

function mockForced() {
  if (process.env.ABA_MOCK === "false") return false;
  if (process.env.ABA_MOCK === "true") return true;
  return !ABA_PAYMENT_URL; // default: mock unless a real payment link is configured
}

export function isAbaConfigured() {
  return Boolean(ABA_PAYMENT_URL) || mockForced();
}

export function isMockMode() {
  return mockForced();
}

function sha512(input) {
  return crypto.createHash("sha512").update(input, "utf8").digest("hex");
}

/**
 * Scrape ABA's public payment-link page for the `aba_data` / `request_time`
 * values its own checkout JS embeds. These field names/patterns come from
 * the client's spec, not a stable published contract — if ABA changes their
 * page markup this regex-based extraction is the first thing to re-check.
 */
async function scrapePaymentLinkPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ai-ads-generator/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(
      `ABA payment-link page returned HTTP ${res.status}. If this is 403, it's likely an IP/UA block on ` +
        `ABA's side (see the fragility note in abaPayway.js) rather than a bug in this integration.`
    );
  }
  const html = await res.text();

  const abaData = extractField(html, "aba_data");
  const requestTime = extractField(html, "request_time");
  if (!abaData || !requestTime) {
    throw new Error(
      "Could not find aba_data / request_time on the ABA payment-link page — the page markup may have " +
        "changed since this integration was written."
    );
  }
  return { abaData, requestTime };
}

function extractField(html, name) {
  // Matches both `aba_data="...";`/`aba_data:"...",` style JS assignments
  // inside the page's embedded Nuxt SSR state (confirmed against a real
  // payment link on 2026-08-28 — that's a `key:"value"` object-literal
  // style, not `var key = "value"`) and `id="aba_data" value="..."`
  // hidden-input style markup, in case a different link type renders that
  // way instead.
  const jsMatch = html.match(new RegExp(`${name}\\s*[:=]\\s*["']([^"']+)["']`));
  if (jsMatch) return unescapeJsString(jsMatch[1]);
  const inputMatch = html.match(
    new RegExp(`(?:id|name)=["']${name}["'][^>]*value=["']([^"']*)["']|value=["']([^"']*)["'][^>]*(?:id|name)=["']${name}["']`)
  );
  if (inputMatch) return unescapeJsString(inputMatch[1] || inputMatch[2]);
  return null;
}

// The embedded state escapes forward slashes as / (and may use other
// \uXXXX / \n-style escapes) since it's a JSON-serialized string sitting
// inside a <script> tag. Decoding it matters here, not just cosmetically —
// the hash ABA checks is computed over the *actual* string value, so
// signing the still-escaped text would produce a hash ABA's server won't
// recognize.
function unescapeJsString(raw) {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw; // not valid JSON-string-escaping — use it as-is rather than fail the whole request
  }
}

/**
 * Kick off a payment session: scrape the page, sign the request, ask ABA
 * for payment options, and pull the KHQR string out of the response.
 */
export async function createAbaSession({ orderId, amount, currency }) {
  if (mockForced()) {
    return {
      mock: true,
      deviceId: nanoid(16),
      requestTime: String(Date.now()),
      qrString: `MOCK-KHQR|order=${orderId}|amount=${amount}|currency=${currency}`,
    };
  }

  if (!ABA_PAYMENT_URL) {
    throw new Error("ABA_PAYMENT_URL is not configured on this server.");
  }

  const { abaData, requestTime } = await scrapePaymentLinkPage(ABA_PAYMENT_URL);

  // `additional_fields` mirrors what ABA's own checkout JS sends alongside
  // aba_data — tran_id ties the payment back to our orderId so the status
  // check (and the eventual access code) can be matched to this purchase.
  const additionalFields = JSON.stringify({ tran_id: orderId, amount, currency });
  const hash = sha512(`${requestTime}${abaData}${additionalFields}`);

  const res = await fetch(LIST_OPTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aba_data: abaData,
      request_time: requestTime,
      additional_fields: additionalFields,
      hash,
    }),
  });
  if (!res.ok) {
    throw new Error(`ABA list-payment-options returned HTTP ${res.status}.`);
  }
  const body = await res.json();
  const qrString = body?.data?.qr_string || body?.data?.qrString || body?.qr_string;
  if (!qrString) {
    throw new Error("ABA response did not include a KHQR string (response shape may have changed).");
  }

  const deviceId = nanoid(16);
  return { mock: false, deviceId, requestTime, abaData, qrString };
}

/**
 * Poll ABA for the current status of a session created above. Returns
 * "approved" | "pending" | "failed".
 */
export async function checkAbaStatus({ deviceId, requestTime, abaData, orderId, createdAt }) {
  if (mockForced()) {
    // Deterministic fake approval so the full purchase flow (QR → poll →
    // paid → access code) is testable end-to-end without real credentials:
    // approve once ~8s have elapsed since the session was created.
    const elapsed = Date.now() - (createdAt || 0);
    return elapsed > 8000 ? "approved" : "pending";
  }

  if (!ABA_CLIENT_ID) {
    throw new Error("ABA_CLIENT_ID is not configured on this server.");
  }

  const hash2 = sha512(`${ABA_CLIENT_ID}${deviceId}${requestTime}`);
  const res = await fetch(CHECK_STATUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: ABA_CLIENT_ID,
      device_id: deviceId,
      request_time: requestTime,
      aba_data: abaData,
      tran_id: orderId,
      hash: hash2,
    }),
  });
  if (!res.ok) {
    throw new Error(`ABA check-payment-status returned HTTP ${res.status}.`);
  }
  const body = await res.json();
  const action = body?.data?.action;
  if (action === "approved") return "approved";
  if (action === "declined" || action === "cancelled" || action === "failed") return "failed";
  return "pending";
}
