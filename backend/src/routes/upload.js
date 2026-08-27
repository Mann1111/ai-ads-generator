import { Router } from "express";
import multer from "multer";
import path from "node:path";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { STORAGE_DIR } from "../lib/storage.js";
import { requireAccessCode } from "./access.js";

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(STORAGE_DIR, "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `upload-${nanoid(10)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Unsupported file type. Please upload a JPG, PNG, or WEBP image."), ok);
  },
});

router.post("/upload", requireAccessCode, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image file received." });
    }

    try {
      // Very lightweight "image analysis" stand-in: dimensions + dominant
      // color, used to sanity-check the upload and to seed default choices
      // in the UI. A real pipeline could swap this for a vision-model call
      // to detect product category / whether a person is already present.
      const meta = await sharp(req.file.path).metadata();
      const stats = await sharp(req.file.path).stats();
      const dominant = stats.dominant; // { r, g, b }

      res.json({
        imageId: req.file.filename,
        publicPath: `/assets/uploads/${req.file.filename}`,
        width: meta.width,
        height: meta.height,
        dominantColor: `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`,
      });
    } catch (e) {
      res.status(500).json({ error: "Could not process the uploaded image: " + e.message });
    }
  });
});

export default router;
