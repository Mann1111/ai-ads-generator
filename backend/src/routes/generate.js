import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { STORAGE_DIR } from "../lib/storage.js";
import { buildImagePrompt, buildVideoPrompt } from "../lib/promptEngine.js";
import { MockImageAdProvider } from "../providers/imageAdProvider.js";
import { MockVideoAdProvider } from "../providers/videoAdProvider.js";
import { ANGLES } from "../lib/angles.js";
import { createJob, runJob, getJob } from "../lib/jobQueue.js";
import { requireAccessCode } from "./access.js";

const router = Router();

// Provider selection point: in production this would branch on
// process.env.IMAGE_PROVIDER / VIDEO_PROVIDER to pick a real implementation.
// Both classes satisfy the same interface (see providers/*.js) so nothing
// else in this file needs to change when you plug in a real API.
const imageProvider = new MockImageAdProvider();
const videoProvider = new MockVideoAdProvider();

/**
 * POST /api/generate
 * body: {
 *   imageId, category, mode: 'product-only' | 'with-model', addModel: bool,
 *   style: string, outputTypes: ('image'|'video')[], formats: string[]
 * }
 *
 * Static images are generated synchronously (fast). For every requested
 * format, if 'video' was requested, 5 video jobs are kicked off — one per
 * fixed marketing angle (see lib/angles.js) — from the generated static
 * image, and their ids are returned for polling — mirroring how a real
 * video-generation API (slow, async) would be integrated. A single request
 * with, say, 2 formats + video selected produces 2 static images and 10
 * video variants (2 formats × 5 angles).
 */
router.post("/generate", requireAccessCode, async (req, res) => {
  const { imageId, category, mode, addModel, style, outputTypes = [], formats = [] } = req.body || {};

  if (!imageId) return res.status(400).json({ error: "imageId is required — upload an image first." });
  if (!style) return res.status(400).json({ error: "style is required." });
  if (!formats.length) return res.status(400).json({ error: "At least one output format must be selected." });
  if (!outputTypes.length) return res.status(400).json({ error: "Select at least one output type (image and/or video)." });

  const sourceImagePath = path.join(STORAGE_DIR, "uploads", imageId);
  if (!fs.existsSync(sourceImagePath)) {
    return res.status(404).json({ error: "Uploaded image not found. Please re-upload." });
  }

  try {
    const results = [];

    for (const formatId of formats) {
      const entry = { formatId, style, image: null, videos: [] };

      if (outputTypes.includes("image")) {
        const imgPrompt = buildImagePrompt({ category, mode, addModel, style, formatId });
        const imageResult = await imageProvider.generate({
          sourceImagePath,
          prompt: imgPrompt,
          styleId: style,
          formatId,
          category,
        });
        entry.image = imageResult;
      }

      if (outputTypes.includes("video")) {
        // Video is generated FROM the static ad image when available (so the
        // video visually matches the approved static creative); otherwise
        // from the raw upload.
        const videoSource = entry.image ? entry.image.filePath : sourceImagePath;

        entry.videos = ANGLES.map((angle, angleIndex) => {
          const vidPrompt = buildVideoPrompt({ category, mode, addModel, style, formatId, angleId: angle.id });
          const job = createJob("video", { formatId, style, angleId: angle.id });

          // Fire and don't await — client polls /api/jobs/:id. We
          // intentionally don't block the response on this since real video
          // providers can take much longer than a request timeout would
          // allow, and here we're kicking off up to 5 jobs per format.
          runJob(job, async (onProgress) => {
            onProgress(30);
            const result = await videoProvider.generate({
              sourceImagePath: videoSource,
              prompt: vidPrompt,
              styleId: style,
              formatId,
              angleId: angle.id,
              angleIndex,
            });
            onProgress(90);
            return result;
          });

          return { angleId: angle.id, angleLabel: angle.label, videoJobId: job.id };
        });
      }

      results.push(entry);
    }

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: "Generation failed: " + e.message });
  }
});

router.get("/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json(job);
});

export default router;
