import path from "node:path";
import fs from "node:fs";
import { STORAGE_DIR } from "./storage.js";

// Site-wide, admin-editable settings (brand name/logo + a logo per payment
// method shown on the ABA PayWay receipt) — a single small JSON file, same
// pattern as paymentsStore.js. No database needed for a handful of fields
// that change rarely and are edited by one admin.

const FILE = path.join(STORAGE_DIR, "settings.json");

// The fixed set of payment methods the receipt footer can show a logo for.
// Keeping this as the source of truth here (not just in the frontend) so
// the upload route can validate :method against exactly this list.
export const PAYMENT_METHODS = ["ABA", "ACLEDA", "Wing", "TrueMoney", "VISA", "Mastercard", "UnionPay"];

function defaults() {
  return { brandName: "", brandLogoFilename: "", paymentLogos: {} };
}

function load() {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { ...defaults(), ...parsed, paymentLogos: { ...(parsed.paymentLogos || {}) } };
  } catch {
    return defaults();
  }
}

function save(settings) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(settings, null, 2));
}

let cache = load();

export function getSettings() {
  return cache;
}

export function setBrand({ name, logoFilename } = {}) {
  if (typeof name === "string") cache.brandName = name.trim();
  if (typeof logoFilename === "string") cache.brandLogoFilename = logoFilename;
  save(cache);
  return cache;
}

export function clearBrandLogo() {
  cache.brandLogoFilename = "";
  save(cache);
  return cache;
}

export function setPaymentLogo(method, filename) {
  if (!PAYMENT_METHODS.includes(method)) throw new Error(`Unknown payment method: ${method}`);
  cache.paymentLogos[method] = filename;
  save(cache);
  return cache;
}

export function clearPaymentLogo(method) {
  if (!PAYMENT_METHODS.includes(method)) throw new Error(`Unknown payment method: ${method}`);
  delete cache.paymentLogos[method];
  save(cache);
  return cache;
}
