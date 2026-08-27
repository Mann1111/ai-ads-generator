# AI Ads Generator

Upload one product photo — with or without a model — and get back ready-to-use
**static image ads** and **short video ads**, batch-generated across multiple
ad formats/platforms. Works across any product category (apparel, beauty,
electronics, jewelry, home goods, food & beverage, supplements, footwear,
toys, general e-commerce) without category-specific setup.

Sold as a product through the [sleukchak.site](https://sleukchak.site) digital
store — see `php-store-integration/` for how purchases unlock the app.

## How it works

```
Enter access code → Upload photo → Choose mode/style → Choose output types & formats
                                 → Generate → Review & export
```

If `ACCESS_SECRET` isn't set (the default — see `.env.example`), the access
code step is skipped entirely, which is what you want for local development.
Set it in production and codes purchased through the store are required
before upload/generate will work — see "Selling access through the store"
below.

1. **Upload** — drag/drop a JPG/PNG/WEBP product photo.
2. **Mode & style** — tell it whether the photo already has a model in it
   (or ask it to add one), pick a product category, and choose an ad style
   (minimalist, lifestyle, seasonal/promotional, UGC-style, bold sale banner).
3. **Formats** — pick static image and/or video, and one or more aspect
   ratios (Instagram feed, Stories/Reels/TikTok, 16:9 display/YouTube, 4:5
   feed). Every format you select is generated in the same batch.
4. **Generate** — static images render synchronously; video ads render as
   background jobs (the UI polls and shows progress, since real
   video-generation APIs are slow and asynchronous).
5. **Review & export** — preview every generated asset and download it
   individually.

## Project structure

```
backend/    Express API — upload handling, prompt engine, provider interfaces,
            mock providers, async job queue, local asset storage
frontend/   React + Tailwind app implementing the step-by-step flow above
```

Key backend files:

- `src/lib/promptEngine.js` — turns (category, mode, style, format) into the
  actual prompt text sent to a generation provider.
- `src/lib/styles.js` / `src/lib/formats.js` — the style and format catalogs
  shown in the UI; add/edit entries here to change what's offered.
- `src/providers/imageAdProvider.js` / `src/providers/videoAdProvider.js` —
  the provider **interfaces**, each with a `Mock*Provider` implementation.
  **This is the swap point for real AI generation** (see below).
- `src/lib/jobQueue.js` — simple in-memory async job queue used for video
  generation, standing in for a real queue (e.g. BullMQ+Redis) or the
  provider's own webhook.
- `src/lib/storage.js` — local-disk storage driver; swap for an S3
  implementation by changing this one module.
- `src/lib/accessCode.js` / `src/routes/access.js` — the per-purchase access
  code gate (see "Selling access through the store" below).

## Running locally

Requires Node 18+. Two terminals:

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env      # defaults to mock providers, no keys needed
npm install
npm run dev                # http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173 and run through the flow. Everything works out of
the box with **mock providers** — no API keys required:

- **Static images**: composited locally (product photo + styled
  background + caption) via `sharp`. Looks like a placeholder ad layout, not
  a real AI-generated scene.
- **Video ads**: a *real*, playable `.mp4` is rendered locally via `ffmpeg` —
  a Ken Burns pan/zoom over the generated static image with a CTA text
  overlay in the last two seconds. It's not AI-generated video, but it is a
  genuine working video pipeline end-to-end (upload → job queue → polling →
  download).

## Swapping in real AI generation

Both provider interfaces are intentionally small:

```js
// ImageAdProvider
async generate({ sourceImagePath, prompt, styleId, formatId, category })
  // → { filePath, publicPath, width, height, promptUsed }

// VideoAdProvider
async generate({ sourceImagePath, prompt, styleId, formatId })
  // → { filePath, publicPath, durationSeconds, width, height, promptUsed }
```

To go live:

1. Implement a new class extending `ImageAdProvider` / `VideoAdProvider` in
   `src/providers/`, calling your chosen API with `prompt` (and
   `sourceImagePath` for image-to-image/reference-image calls).
2. In `src/routes/generate.js`, swap `new MockImageAdProvider()` /
   `new MockVideoAdProvider()` for your real classes (a simple
   `process.env.IMAGE_PROVIDER === "mock" ? new Mock...() : new Real...()`
   branch works well).
3. Add the provider's API key to `.env` (see `.env.example` —
   `IMAGE_PROVIDER_API_KEY`, `VIDEO_PROVIDER_API_KEY`).
4. Nothing else changes — the frontend, prompt engine, job queue, and
   storage layer are all provider-agnostic.

### Recommended real-world APIs to plug in

- **Image ad generation**: an image-to-image / reference-image generation
  API that can take the uploaded product photo as a conditioning input and
  place it into a generated scene (rather than generating a product from
  scratch, which risks changing its appearance). Look for providers whose
  docs specifically mention "product photography," "virtual try-on," or
  "reference image" support — that's the feature this app's `sourceImagePath`
  parameter is built to use.
- **Video ad generation**: an image-to-video generation API (take a still
  image and animate it with camera motion / subject motion) rather than a
  pure text-to-video API — this keeps the video visually locked to the
  approved static ad instead of generating an unrelated scene. Favor
  providers with an async submit + webhook/poll pattern, since
  `src/lib/jobQueue.js` and the frontend's polling are already built for
  that shape.
- **Optional — product/vision analysis**: a vision-capable model to replace
  the placeholder "image analysis" in `src/routes/upload.js` (currently just
  dimensions + dominant color) with real product-category detection and
  "is a person already present" detection, so the mode step can be
  pre-filled instead of asked.

## Selling access through the store

The app has a per-purchase access-code gate built in (`src/lib/accessCode.js`,
`src/routes/access.js`, `src/steps/AccessGate.jsx` on the frontend):

- With `ACCESS_SECRET` unset, the gate is completely bypassed — used for
  local dev so you're never blocked by it while building.
- With `ACCESS_SECRET` set, uploading and generating require a valid code
  (`x-access-code` header, checked via `requireAccessCode` middleware). The
  frontend shows a one-time "enter your code" screen, then stores the code
  in the browser (`localStorage`) so the buyer isn't asked again on that
  device.
- Codes are verified **statelessly** via HMAC-SHA256 — no shared database or
  network call between this app and the PHP store. Test codes locally with
  `node backend/scripts/gen-code.js <orderId>`.
- Codes never expire and aren't "used up" (matches one-time-purchase,
  unlimited-use). See `php-store-integration/README.md` for wiring this into
  the store's order-fulfillment flow — set the same `ACCESS_SECRET` in both
  places and a code generated by the PHP store verifies here automatically.

## Notes on scaling to a full catalog

The generate endpoint already accepts multiple `formats` per request and
loops through them, so batching a catalog is a matter of calling
`POST /api/generate` once per product (or extending it to accept multiple
`imageId`s) and letting the same prompt-template + provider pipeline run
per item. For real catalog scale, swap `src/lib/jobQueue.js` for a durable
queue so jobs survive a backend restart, and `src/lib/storage.js` for S3 (or
similar) so generated assets aren't tied to a single server's disk.
