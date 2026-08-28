import { Router } from "express";
import QRCode from "qrcode";
import { createAbaSession, checkAbaStatus, isAbaConfigured, isMockMode } from "../lib/abaPayway.js";
import { createPayment, getPayment, updatePayment, markPaidIfPending, expireIfPast } from "../lib/paymentsStore.js";
import { generateAccessCode, isAccessGateEnabled } from "../lib/accessCode.js";

const router = Router();

const ACCESS_PRICE_USD = Number(process.env.ACCESS_PRICE_USD || "9");
const ACCESS_CURRENCY = process.env.ACCESS_CURRENCY || "USD";

// Lets the frontend decide whether to show the "Pay with ABA PayWay" panel
// at all — hidden entirely if the server has neither a real ABA payment
// link nor mock mode explicitly usable, so there's never a dead-end button.
router.get("/payments/config", (_req, res) => {
  res.json({
    enabled: isAbaConfigured() && isAccessGateEnabled(),
    mock: isMockMode(),
    amount: ACCESS_PRICE_USD,
    currency: ACCESS_CURRENCY,
  });
});

router.post("/payments/create", async (_req, res) => {
  if (!isAccessGateEnabled()) {
    return res.status(400).json({ error: "Access codes are not configured on this server." });
  }
  if (!isAbaConfigured()) {
    return res.status(400).json({ error: "ABA PayWay is not configured on this server." });
  }

  const payment = createPayment({ amount: ACCESS_PRICE_USD, currency: ACCESS_CURRENCY });

  try {
    const session = await createAbaSession({
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
    });
    const qrImage = await QRCode.toDataURL(session.qrString, { margin: 1, width: 320 });

    const updated = updatePayment(payment.paymentId, {
      aba: { deviceId: session.deviceId, requestTime: session.requestTime, abaData: session.abaData || null },
    });

    res.json({
      paymentId: updated.paymentId,
      qrImage,
      amount: updated.amount,
      currency: updated.currency,
      expiresAt: updated.expiresAt,
      mock: Boolean(session.mock),
    });
  } catch (err) {
    res.status(502).json({ error: `Could not start an ABA PayWay session: ${err.message}` });
  }
});

// Ownership check for polling is the paymentId itself — a 24-char random
// token nobody but the buyer's browser has, generated server-side and never
// guessable/enumerable. That's enough for this single-product, no-login
// storefront; it's the same trust model the manual access codes already use.
router.get("/payments/:paymentId/status", async (req, res) => {
  const { paymentId } = req.params;
  let payment = getPayment(paymentId);
  if (!payment) return res.status(404).json({ error: "Unknown payment." });

  if (payment.status === "paid") {
    return res.json({ status: "paid", accessCode: payment.accessCode });
  }

  payment = expireIfPast(paymentId) || payment;
  if (payment.status === "expired") return res.json({ status: "expired" });
  if (payment.status === "failed") return res.json({ status: "failed" });

  try {
    const action = await checkAbaStatus({
      deviceId: payment.aba?.deviceId,
      requestTime: payment.aba?.requestTime,
      abaData: payment.aba?.abaData,
      orderId: payment.orderId,
      createdAt: payment.createdAt,
    });

    if (action === "approved") {
      // generateAccessCode() is a pure function of orderId — calling it
      // twice (e.g. two overlapping polls) yields the identical code, and
      // markPaidIfPending() only writes/activates once either way, so this
      // is safe without any extra locking.
      const code = generateAccessCode(payment.orderId);
      const activated = markPaidIfPending(paymentId, code);
      return res.json({ status: "paid", accessCode: activated.accessCode });
    }
    if (action === "failed") {
      updatePayment(paymentId, { status: "failed" });
      return res.json({ status: "failed" });
    }
    return res.json({ status: "pending" });
  } catch (err) {
    // A transient ABA error mid-poll shouldn't kill the whole purchase —
    // report "pending" with a warning so the frontend keeps polling instead
    // of dead-ending the buyer.
    return res.json({ status: "pending", warning: err.message });
  }
});

export default router;
