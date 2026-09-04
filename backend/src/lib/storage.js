import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/storage — local disk storage driver. Swap this module for an S3 (or
// other object storage) implementation in production; every other module
// only imports STORAGE_DIR / ensureDirs from here, so that's the one seam
// that needs to change.
export const STORAGE_DIR = path.resolve(__dirname, "../../storage");

export function ensureDirs() {
  for (const sub of ["uploads", "generated", "branding"]) {
    const dir = path.join(STORAGE_DIR, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
