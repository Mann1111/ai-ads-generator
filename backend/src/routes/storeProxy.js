import { Router } from "express";
import { createAbaSession, checkAbaStatus } from "../lib/abaPayway.js";

const router = Router();

const STORE_PROXY_SECRET = process.env.STORE_PROXY_SECRET || "";

// Lets sleukchak.site's PHP store create/poll ABA PayWay sessions through
// this already-working Node service, instead of calling ABA directly from
// Hostinger's shared-hosting IPs (which ABA's WAF blocks with a 403). Reuses
// the exact same ABA_PAYMENT_URL / abaPayway.js logic this app already uses
// for its own purchases — this is just a second caller of it.
//
// Fully disabled (every request 503s) until STORE_PROXY_SECRET is set, same
// pattern as ADMIN_SECRET in routes/admin.js. This secret is shared only
// between this Node app and the PHP store's own config — it is NOT an ABA
// API key, and buyers never see or need it.
function requireStoreProxy(req, res, next) {
  if (!STORE_PROXY_SECRET) {
    return res.status(503).json({ error: "Store proxy is not enabled on this server. Set STORE_PROXY_SECRET." });
  }
  const provided = req.header("x-store-proxy-secret") || "";
  const ok = provided.length === STORE_PROXY_SECRET.length && provided === STORE_PROXY_SECRET;
  if (!ok) return res.status(401).json({ error: "Invalid store proxy secret." });
  next();
}

// Mirrors createAbaSession()'s return shape closely so the PHP caller can
// map it 1:1 onto its own orders table columns (qr_string/tran_id/client_id/
// device_id/request_time/hash).
router.post("/store-proxy/create-session", requireStoreProxy, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: "amount must be a positive number." });
  }
  try {
    const session = await createAbaSession({ amount });
    res.json({
      ok: true,
      tranId: session.tranId,
      qrString: session.qrString,
      clientId: session.clientId,
      deviceId: session.deviceId,
      requestTime: session.requestTime,
      hash: session.hash,
      mock: Boolean(session.mock),
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

// hash isn't required here — checkAbaStatus() recomputes it fresh from
// clientId/deviceId/requestTime every call, per the spec, so the PHP side
// doesn't need to send its stored one. Response is just {ok, action} —
// action is one of "approved" | "pending" | "failed", matching exactly
// what aba_check_payment_status() on the PHP side already expects to
// return to its own callers.
router.post("/store-proxy/check-status", requireStoreProxy, async (req, res) => {
  const { deviceId, clientId, requestTime } = req.body || {};
  if (!deviceId || !clientId || !requestTime) {
    return res.status(400).json({ ok: false, error: "deviceId, clientId, and requestTime are required." });
  }
  try {
    const action = await checkAbaStatus({ deviceId, clientId, requestTime, createdAt: 0 });
    res.json({ ok: true, action });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

export default router;
