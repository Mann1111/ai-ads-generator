import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { STORAGE_DIR } from "../lib/storage.js";
import {
  getSettings,
  setBrand,
  clearBrandLogo,
  setPaymentLogo,
  clearPaymentLogo,
  PAYMENT_METHODS,
} from "../lib/settingsStore.js";

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const BRANDING_DIR = path.join(STORAGE_DIR, "branding");

// Admin panel is fully disabled (not just open) until ADMIN_SECRET is set —
// unlike the buyer-facing access gate, there's no "safe to leave open"
// default here since these routes can overwrite site branding/logos.
function requireAdmin(req, res, next) {
  if (!ADMIN_SECRET) {
    return res.status(503).json({ error: "The admin panel isn't enabled on this server yet. Set ADMIN_SECRET." });
  }
  const provided = req.header("x-admin-secret") || "";
  const ok = provided.length === ADMIN_SECRET.length && provided === ADMIN_SECRET;
  if (!ok) return res.status(401).json({ error: "Invalid admin secret." });
  next();
}

// Uploads land in memory first (files are tiny logos) so sharp can resize +
// re-encode to PNG before writing — that way an admin can upload almost any
// reasonably-sized image and it still comes out a clean, consistently-sized
// logo, instead of needing pixel-perfect source art.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.mimetype);
    cb(ok ? null : new Error("Unsupported file type. Please upload a JPG, PNG, WEBP, or SVG image."), ok);
  },
});

router.post("/admin/login", requireAdmin, (_req, res) => {
  // The frontend just needs to know the secret it sent was accepted —
  // requireAdmin already rejected it otherwise.
  res.json({ ok: true });
});

router.get("/admin/settings", requireAdmin, (_req, res) => {
  res.json(publicSettings());
});

// Brand name + optional brand logo (multipart form: field "name", file field "logo").
router.post("/admin/branding", requireAdmin, (req, res) => {
  upload.single("logo")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      let logoFilename;
      if (req.file) {
        logoFilename = await saveLogo(req.file, { width: 256, height: 256 });
      }
      const settings = setBrand({ name: req.body?.name, logoFilename });
      res.json(publicSettings(settings));
    } catch (e) {
      res.status(500).json({ error: "Could not save branding: " + e.message });
    }
  });
});

router.delete("/admin/branding/logo", requireAdmin, (_req, res) => {
  const settings = clearBrandLogo();
  res.json(publicSettings(settings));
});

// One logo per named payment method (ABA, ACLEDA, Wing, ...), shown in the
// receipt footer instead of a plain text badge once uploaded.
router.post("/admin/payment-logo/:method", requireAdmin, (req, res) => {
  const { method } = req.params;
  if (!PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ error: `Unknown payment method "${method}".` });
  }
  upload.single("logo")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No logo file received." });
    try {
      // Badges render as a compact horizontal chip, so logos are normalized
      // to a short, wide box rather than a square.
      const filename = await saveLogo(req.file, { width: 200, height: 64 });
      const settings = setPaymentLogo(method, filename);
      res.json(publicSettings(settings));
    } catch (e) {
      res.status(500).json({ error: "Could not save that logo: " + e.message });
    }
  });
});

router.delete("/admin/payment-logo/:method", requireAdmin, (req, res) => {
  const { method } = req.params;
  if (!PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ error: `Unknown payment method "${method}".` });
  }
  const settings = clearPaymentLogo(method);
  res.json(publicSettings(settings));
});

async function saveLogo(file, { width, height }) {
  const filename = `logo-${nanoid(10)}.png`;
  fs.mkdirSync(BRANDING_DIR, { recursive: true });
  await sharp(file.buffer)
    .resize({ width, height, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRANDING_DIR, filename));
  return filename;
}

// Shapes the settings JSON into the {name/logoUrl-friendly} form both the
// admin page and (via payments.js) the public receipt consume.
export function publicSettings(settings = getSettings()) {
  return {
    brandName: settings.brandName || "",
    brandLogoUrl: settings.brandLogoFilename ? `/assets/branding/${settings.brandLogoFilename}` : "",
    paymentLogos: Object.fromEntries(
      PAYMENT_METHODS.map((m) => [m, settings.paymentLogos[m] ? `/assets/branding/${settings.paymentLogos[m]}` : ""])
    ),
    paymentMethods: PAYMENT_METHODS,
    recommendedSizes: {
      brandLogo: "Square, at least 256×256px, PNG with a transparent background.",
      paymentMethodLogo: "Wide, roughly 200×64px, PNG with a transparent background (auto-resized to fit).",
    },
  };
}

export default router;
