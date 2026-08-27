import crypto from "node:crypto";

/**
 * Per-purchase access codes, verified statelessly via HMAC — no shared
 * database or network call between the PHP store (sleukchak.site) and this
 * Node app. The PHP side generates a code the same way (see
 * php-store-integration/README.md) using the same secret; this app just
 * recomputes the signature and checks it matches. That means:
 *   - No syncing an "orders"/"codes" table between two different hosts.
 *   - Codes never expire or get "used up" (matches one-time-purchase,
 *     unlimited-use — see PROJECT_MEMORY-informed decision).
 *   - Revoking a specific buyer isn't possible this way (only rotating the
 *     shared secret, which invalidates ALL codes) — acceptable for a manual,
 *     trust-based store where every sale is a human admin action anyway.
 *
 * Code shape: ADS-<orderId>-<8-char signature>
 * Signature: first 8 hex chars of HMAC-SHA256(orderId, ACCESS_SECRET), uppercased.
 */

const SECRET = process.env.ACCESS_SECRET || "";

export function isAccessGateEnabled() {
  return Boolean(SECRET);
}

export function generateAccessCode(orderId) {
  if (!SECRET) throw new Error("ACCESS_SECRET is not set — cannot generate access codes.");
  const cleanOrderId = String(orderId).trim();
  if (!cleanOrderId) throw new Error("orderId is required.");
  const sig = sign(cleanOrderId);
  return `ADS-${cleanOrderId}-${sig}`;
}

export function verifyAccessCode(code) {
  if (!SECRET) return { valid: false, reason: "Access gate is not configured on this server." };
  if (!code || typeof code !== "string") return { valid: false, reason: "No code provided." };

  // Case-insensitive match, but do NOT normalize case before matching — the
  // order id's original case must be preserved for re-signing, since
  // generateAccessCode() signs it as-is. (An earlier version upper-cased the
  // whole string first, which silently changed mixed-case order ids and made
  // every such code fail verification.) Only the signature half is
  // case-insensitive by design (hex, always emitted upper-case).
  const match = code.trim().match(/^ads-([a-z0-9_-]+)-([a-f0-9]{8})$/i);
  if (!match) return { valid: false, reason: "That doesn't look like a valid access code." };

  const [, orderId, providedSig] = match;
  const expectedSig = sign(orderId);
  const providedSigUpper = providedSig.toUpperCase();

  const ok =
    providedSigUpper.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(providedSigUpper), Buffer.from(expectedSig));

  return ok ? { valid: true, orderId } : { valid: false, reason: "Invalid or tampered code." };
}

function sign(orderId) {
  return crypto.createHmac("sha256", SECRET).update(orderId).digest("hex").slice(0, 8).toUpperCase();
}
