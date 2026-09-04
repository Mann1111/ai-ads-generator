// Thin fetch wrapper around the backend API. Centralizing this here means
// swapping the backend base URL (e.g. for a deployed environment) is a
// one-line change.
const BASE = "";
const ACCESS_CODE_KEY = "aiAdsGenerator.accessCode";

export function getStoredAccessCode() {
  try {
    return localStorage.getItem(ACCESS_CODE_KEY) || "";
  } catch {
    return "";
  }
}

export function storeAccessCode(code) {
  try {
    localStorage.setItem(ACCESS_CODE_KEY, code);
  } catch {
    // localStorage unavailable (private browsing etc.) — code just won't
    // persist across reloads; redeem() below still works for the session.
  }
}

async function request(path, options = {}) {
  const code = getStoredAccessCode();
  const headers = { ...(options.headers || {}) };
  if (code) headers["x-access-code"] = code;

  const res = await fetch(BASE + path, { ...options, headers });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export function getAccessStatus() {
  return request("/api/access/status");
}

export async function redeemCode(code) {
  const result = await request("/api/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  storeAccessCode(code);
  return result;
}

export function getMeta() {
  return request("/api/meta");
}

export async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file);
  return request("/api/upload", { method: "POST", body: form });
}

export function generateAds(payload) {
  return request("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getJob(jobId) {
  return request(`/api/jobs/${jobId}`);
}

export function getPaymentsConfig() {
  return request("/api/payments/config");
}

export function createPayment() {
  return request("/api/payments/create", { method: "POST" });
}

export function getPaymentStatus(paymentId) {
  return request(`/api/payments/${paymentId}/status`);
}

// --- Admin panel (brand + payment-method logo uploads) ---------------------
// Kept separate from request() above: these calls send the admin secret
// (x-admin-secret), never the buyer access code, and the secret lives only
// in the AdminPanel component's own state, entered fresh each visit.

async function adminRequest(path, secret, options = {}) {
  const headers = { ...(options.headers || {}), "x-admin-secret": secret };
  const res = await fetch(BASE + path, { ...options, headers });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export function adminLogin(secret) {
  return adminRequest("/api/admin/login", secret, { method: "POST" });
}

export function getAdminSettings(secret) {
  return adminRequest("/api/admin/settings", secret);
}

export function saveBranding(secret, { name, logoFile }) {
  const form = new FormData();
  if (name != null) form.append("name", name);
  if (logoFile) form.append("logo", logoFile);
  return adminRequest("/api/admin/branding", secret, { method: "POST", body: form });
}

export function clearBrandLogo(secret) {
  return adminRequest("/api/admin/branding/logo", secret, { method: "DELETE" });
}

export function savePaymentLogo(secret, method, logoFile) {
  const form = new FormData();
  form.append("logo", logoFile);
  return adminRequest(`/api/admin/payment-logo/${encodeURIComponent(method)}`, secret, { method: "POST", body: form });
}

export function clearPaymentLogo(secret, method) {
  return adminRequest(`/api/admin/payment-logo/${encodeURIComponent(method)}`, secret, { method: "DELETE" });
}
