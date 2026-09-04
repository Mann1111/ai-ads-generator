import express from "express";
import cors from "cors";
import path from "node:path";
import "dotenv/config";
import { ensureDirs, STORAGE_DIR } from "./lib/storage.js";
import uploadRoutes from "./routes/upload.js";
import generateRoutes from "./routes/generate.js";
import metaRoutes from "./routes/meta.js";
import accessRoutes from "./routes/access.js";
import paymentsRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";

ensureDirs();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Serve uploaded + generated assets statically so the frontend can preview
// and download them directly.
app.use("/assets", express.static(STORAGE_DIR));

app.use("/api", uploadRoutes);
app.use("/api", generateRoutes);
app.use("/api", metaRoutes);
app.use("/api", accessRoutes);
app.use("/api", paymentsRoutes);
app.use("/api", adminRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// In production (single-service deploy) the built frontend is served
// directly by this same Express app, so there's only one service to host
// and no CORS/subdomain juggling between frontend and API. Locally, the
// Vite dev server (with its /api proxy) is used instead — see frontend/README.
const FRONTEND_DIST = path.resolve(process.cwd(), "../frontend/dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/assets")) return next();
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`AI Ads Generator backend listening on http://localhost:${PORT}`);
});
