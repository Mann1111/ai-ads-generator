import crypto from "node:crypto";
import { nanoid } from "nanoid";

/**
 * ABA PayWay (KHQR) auto-payment — built to the client's exact SOP
 * ("ABA PayWay Auto-Payment Workflow Specification", section 6, "ABA PayWay
 * internals" + "Master AI build prompt"). Followed literally, on purpose —
 * not ABA's official/documented merchant API, and not adapted or
 * "corrected" against anything else. Only one thing is needed to run it for
 * real: ABA_PAYMENT_URL (the merchant's public PayWay payment link). No API
 * key / client_id is configured — client_id comes back from ABA's own
 * response and is used as-is.
 *
 * The exact steps, per the spec:
 *   1. GET the public PayWay link page; un-escape /; regex out
 *      aba_data="..." and request_time:"...".
 *   2. Build additional_fields = {amount, remark, full_name, email, phone}.
 *   3. hash = sha512(request_time + aba_data + additional_fields) — a PLAIN
 *      SHA-512, NOT HMAC.
 *   4. POST {aba_data, request_time, additional_fields, hash} to
 *      /v1/payment/gateway/list-payment-options → returns qr_string,
 *      client_id, status.tran_id.
 *   5. device_id = random(10); hash2 = sha512(client_id + device_id +
 *      request_time). Persist device_id, client_id, request_time, hash —
 *      without all four the status can never be checked again.
 *   6. Poll /v1/payment-link/check-payment-status with those values;
 *      success when data.action === "approved".
 *
 * ABA_MOCK runs the whole purchase flow (QR → poll → paid → access code)
 * without touching ABA at all — on by default whenever ABA_PAYMENT_URL
 * isn't set, for building/testing without real credentials.
 */

const ABA_PAYMENT_URL = process.env.ABA_PAYMENT_URL || "";

const LIST_OPTIONS_URL = "https://pwapp.ababank.com/api/pw-app/v1/payment/gateway/list-payment-options";
const CHECK_STATUS_URL = "https://pwapp.ababank.com/api/pw-app/v1/payment-link/check-payment-status";

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
 * Step 1: GET the public PayWay link page and pull aba_data / request_time
 * out of its embedded JS. The page serves them JSON-escaped (e.g. /
 * for "/"), so each extracted value is un-escaped before use — the hash in
 * step 3 has to be computed over the real value, not the escaped text.
 */
async function fetchAbaDataAndRequestTime(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-ads-generator/1.0)", Accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`ABA payment-link page returned HTTP ${res.status}.`);
  }
  const html = await res.text();

  const abaData = extractQuoted(html, "aba_data");
  const requestTime = extractQuoted(html, "request_time");
  if (!abaData || !requestTime) {
    throw new Error("Could not find aba_data / request_time on the ABA payment-link page.");
  }
  return { abaData, requestTime };
}

function extractQuoted(html, name) {
  const match = html.match(new RegExp(`${name}\\s*[:=]\\s*["']([^"']+)["']`));
  return match ? unescapeJsString(match[1]) : null;
}

function unescapeJsString(raw) {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

/**
 * Steps 1-5: get a KHQR string + the device_id/client_id/request_time/hash
 * this payment needs to be polled later.
 */
export async function createAbaSession({ amount }) {
  if (mockForced()) {
    return {
      mock: true,
      qrString: `MOCK-KHQR|amount=${amount}`,
      clientId: "mock-client",
      deviceId: nanoid(10),
      requestTime: String(Date.now()),
      hash: "mock-hash",
      tranId: `MOCK-${nanoid(8)}`,
    };
  }

  if (!ABA_PAYMENT_URL) {
    throw new Error("ABA_PAYMENT_URL is not configured on this server.");
  }

  const { abaData, requestTime } = await fetchAbaDataAndRequestTime(ABA_PAYMENT_URL);

  // additional_fields — exact shape per the spec (amount, remark, full_name,
  // email, phone). This app doesn't collect buyer details at checkout, so
  // those stay empty strings.
  const additionalFields = JSON.stringify({ amount, remark: "", full_name: "", email: "", phone: "" });
  const hash = sha512(`${requestTime}${abaData}${additionalFields}`);

  const res = await fetch(LIST_OPTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aba_data: abaData, request_time: requestTime, additional_fields: additionalFields, hash }),
  });
  if (!res.ok) {
    throw new Error(`ABA list-payment-options returned HTTP ${res.status}.`);
  }
  const body = await res.json();

  const qrString = body?.qr_string || body?.data?.qr_string;
  const clientId = body?.client_id || body?.data?.client_id;
  const tranId = body?.status?.tran_id || body?.data?.status?.tran_id || null;
  if (!qrString || !clientId) {
    throw new Error("ABA response did not include qr_string / client_id (response shape may have changed).");
  }

  const deviceId = nanoid(10);
  return { mock: false, qrString, clientId, deviceId, requestTime, hash, tranId };
}

/**
 * Step 6: poll for payment status. Recomputes hash2 = sha512(client_id +
 * device_id + request_time) fresh on every call, per the spec, from the
 * four values persisted at session-creation time. Returns
 * "approved" | "pending" | "failed".
 */
export async function checkAbaStatus({ deviceId, clientId, requestTime, createdAt }) {
  if (mockForced()) {
    // Deterministic fake approval so the full purchase flow (QR → poll →
    // paid → access code) is testable end-to-end without real ABA
    // credentials: approve once ~8s have elapsed since session creation.
    const elapsed = Date.now() - (createdAt || 0);
    return elapsed > 8000 ? "approved" : "pending";
  }

  const hash2 = sha512(`${clientId}${deviceId}${requestTime}`);
  const res = await fetch(CHECK_STATUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: deviceId, client_id: clientId, request_time: requestTime, hash: hash2 }),
  });
  if (!res.ok) {
    throw new Error(`ABA check-payment-status returned HTTP ${res.status}.`);
  }
  const body = await res.json();
  const action = body?.data?.action ?? body?.action;
  if (action === "approved") return "approved";
  if (action === "declined" || action === "cancelled" || action === "failed") return "failed";
  return "pending";
}
