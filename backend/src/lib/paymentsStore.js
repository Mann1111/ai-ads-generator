import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { STORAGE_DIR } from "./storage.js";

// Payments — JSON-file-backed, matching this project's "no database" style
// (see storage.js). Volume here is inherently tiny (one purchase = one
// record, single product), so a flat file with an in-memory mirror is
// simpler and more honest than pulling in a real DB for it.
const FILE = path.join(STORAGE_DIR, "payments.json");

const PENDING_TTL_MS = 15 * 60 * 1000; // 15 minutes to pay before the QR expires

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}

/**
 * Create a new pending payment. `orderId` is what gets embedded in the
 * eventual access code (see accessCode.js) and reported to ABA as the
 * transaction reference — it must be unique per attempt.
 */
export function createPayment({ amount, currency }) {
  const db = load();
  const paymentId = nanoid(24); // acts as the opaque bearer token for polling — see routes/payments.js
  const orderId = `ABA${nanoid(10).replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
  const now = Date.now();
  const record = {
    paymentId,
    orderId,
    amount,
    currency,
    status: "pending", // pending | paid | expired | failed
    createdAt: now,
    expiresAt: now + PENDING_TTL_MS,
    accessCode: null,
    aba: null, // provider-specific session data (device id, request time, ...)
  };
  db[paymentId] = record;
  persist();
  return record;
}

export function getPayment(paymentId) {
  const db = load();
  return db[paymentId] || null;
}

export function updatePayment(paymentId, patch) {
  const db = load();
  const existing = db[paymentId];
  if (!existing) return null;
  db[paymentId] = { ...existing, ...patch };
  persist();
  return db[paymentId];
}

/**
 * Idempotent activation: only the FIRST caller to observe an "approved" ABA
 * status actually generates and stores the access code. Every later poll
 * (or a duplicate webhook/notification, if that's ever added) just returns
 * the code that's already on the record instead of minting a second one or
 * re-running the side effect. Node is single-threaded and this project has
 * no worker pool, so a plain re-check-then-write is enough here — no row
 * locking needed the way a multi-process/DB-backed setup would.
 */
export function markPaidIfPending(paymentId, accessCode) {
  const db = load();
  const existing = db[paymentId];
  if (!existing) return null;
  if (existing.status === "paid") return existing; // already activated — no-op
  db[paymentId] = { ...existing, status: "paid", accessCode, paidAt: Date.now() };
  persist();
  return db[paymentId];
}

export function expireIfPast(paymentId) {
  const db = load();
  const existing = db[paymentId];
  if (!existing) return null;
  if (existing.status === "pending" && Date.now() > existing.expiresAt) {
    db[paymentId] = { ...existing, status: "expired" };
    persist();
  }
  return db[paymentId];
}
