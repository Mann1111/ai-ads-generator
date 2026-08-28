import { Router } from "express";
import { STYLES } from "../lib/styles.js";
import { FORMATS } from "../lib/formats.js";
import { ANGLES } from "../lib/angles.js";

const router = Router();

// Returns the style + format + angle catalogs the frontend renders as
// pickable cards (styles, formats) or informational badges (angles — the 5
// video angles are fixed, not user-selectable, but the frontend shows what
// they are before generating).
router.get("/meta", (_req, res) => {
  res.json({ styles: STYLES, formats: FORMATS, angles: ANGLES });
});

export default router;
