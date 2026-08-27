import { Router } from "express";
import { STYLES } from "../lib/styles.js";
import { FORMATS } from "../lib/formats.js";

const router = Router();

// Returns the style + format catalogs the frontend renders as pickable cards.
router.get("/meta", (_req, res) => {
  res.json({ styles: STYLES, formats: FORMATS });
});

export default router;
