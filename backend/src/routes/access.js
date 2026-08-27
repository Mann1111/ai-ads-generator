import { Router } from "express";
import { verifyAccessCode, isAccessGateEnabled } from "../lib/accessCode.js";

const router = Router();

// Lets the frontend check up front whether a code is even required (e.g. for
// local dev / testing where ACCESS_SECRET is unset, the whole gate is
// skipped so you're not blocked while building).
router.get("/access/status", (_req, res) => {
  res.json({ gateEnabled: isAccessGateEnabled() });
});

router.post("/redeem", (req, res) => {
  const { code } = req.body || {};
  const result = verifyAccessCode(code);
  if (!result.valid) {
    return res.status(401).json({ error: result.reason || "Invalid code." });
  }
  res.json({ ok: true, orderId: result.orderId });
});

export default router;

/**
 * Middleware: require a valid access code on the 'x-access-code' header.
 * Applied to the routes that actually cost compute (upload, generate) — not
 * to /api/meta, so style/format browsing can stay open for marketing.
 * A no-op (always allows) when ACCESS_SECRET isn't set, so local dev never
 * needs a code.
 */
export function requireAccessCode(req, res, next) {
  if (!isAccessGateEnabled()) return next();

  const code = req.header("x-access-code");
  const result = verifyAccessCode(code);
  if (!result.valid) {
    return res.status(401).json({ error: "A valid access code is required. " + (result.reason || "") });
  }
  next();
}
