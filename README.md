# AI Ads Generator

Upload one product photo — with or without a model — and get back ready-to-use
**static image ads** and **short video ads**, batch-generated across multiple
ad formats/platforms. Works across any product category (apparel, beauty,
electronics, jewelry, home goods, food & beverage, supplements, footwear,
toys, general e-commerce) without category-specific setup.

Every video output is actually **5 video ads** — one per fixed marketing
angle (Problem → Solution, Social Proof, Feature Highlight, Urgency/Offer,
Lifestyle) — and every angle's on-screen dialogue (hook / body / CTA) is
written directly in **natural Khmer**, correctly shaped (subscript
consonants, vowel reordering) when burned into the video. See "Video ad
angles & Khmer dialogue" below.

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
   feed). Every format you select is generated in the same batch. Selecting
   video shows the 5 fixed marketing angles that will be generated for
   *each* format.
4. **Generate** — static images render synchronously; videos render as
   background jobs, 5 per format (the UI polls and shows progress per
   angle, since real video-generation APIs are slow and asynchronous — and
   a batch fans out into a lot of jobs at once, see the concurrency note
   below).
5. **Review & export** — results are grouped by format; each group shows the
   static image plus its 5 angle videos (with the Khmer dialogue burned in
   and shown as text under each clip), all individually downloadable.

## Video ad angles & Khmer dialogue

`src/lib/angles.js` defines 5 fixed angles, each with its own hook/body/CTA
line written directly in Khmer (not a translated template — mixing an
arbitrary English category string into a Khmer sentence reads as broken
code-switching, so the angle copy stays fully Khmer regardless of what the
user types as a product category). `src/routes/generate.js` generates one
video per angle per selected format, so 2 formats + video output = 10
videos in one batch.

`src/providers/videoAdProvider.js`'s mock renderer burns the 3-beat dialogue
in as timed captions using ffmpeg's `subtitles` filter (libass, shaped
through HarfBuzz) rather than `drawtext` — `drawtext` renders glyphs in raw
codepoint order with no complex-script shaping, which mangles Khmer
(misplaced vowel signs, broken subscript consonants); libass shapes it
correctly. The Khmer font (`backend/assets/fonts/NotoSansKhmer-Variable.ttf`,
Google's Noto Sans Khmer) is bundled directly in the repo and pointed to via
ffmpeg's `fontsdir` option, so this works with zero OS-level font setup on
any host, Render included.

A real video-generation provider should treat the angle's Khmer lines as the
required on-screen text (or spoken voiceover script, if it generates audio)
— `buildVideoPrompt()` in `src/lib/promptEngine.js` already folds them into
the generation prompt verbatim, with an explicit instruction that all
on-screen/spoken copy must stay in natural Khmer.

## Project structure

```
backend/    Express API — upload handling, prompt engine, provider interfaces,
            mock providers, async job queue, local asset storage
frontend/   React + Tailwind app implementing the step-by-step flow above
```

Key backend files:

- `src/lib/promptEngine.js` — turns (category, mode, style, format, angle)
  into the actual prompt text sent to a generation provider.
- `src/lib/styles.js` / `src/lib/formats.js` / `src/lib/angles.js` — the
  style, format, and video-angle catalogs; the styles/formats are shown in
  the UI as pickable cards, angles are fixed (shown as info badges, not
  user-selectable) — add/edit entries in any of them to change what's
  offered.
- `src/providers/imageAdProvider.js` / `src/providers/videoAdProvider.js` —
  the provider **interfaces**, each with a `Mock*Provider` implementation.
  **This is the swap point for real AI generation** (see below).
- `src/lib/jobQueue.js` — in-memory async job queue used for video
  generation, standing in for a real queue (e.g. BullMQ+Redis) or the
  provider's own webhook. Also caps how many video jobs run at once
  (`MAX_CONCURRENT_VIDEO_JOBS`, default 3) — a batch can kick off up to
  (formats × 5 angles) jobs simultaneously, which would otherwise try to run
  that many ffmpeg processes at once on a small instance.
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
- **Video ads**: a *real*, playable `.mp4` per angle is rendered locally via
  `ffmpeg` — a Ken Burns pan/zoom (alternating zoom-in/zoom-out by angle)
  over the generated static image, with that angle's 3-beat Khmer dialogue
  burned in as timed captions. It's not AI-generated video, but it is a
  genuine working video pipeline end-to-end (upload → 5× job queue per
  format → polling → download) with real, correctly-shaped Khmer text.

## Swapping in real AI generation

Both provider interfaces are intentionally small:

```js
// ImageAdProvider
async generate({ sourceImagePath, prompt, styleId, formatId, category })
  // → { filePath, publicPath, width, height, promptUsed }

// VideoAdProvider — called once per angle (angleId is one of the 5 ids in
// lib/angles.js; angleIndex is its position, handy for visual variation)
async generate({ sourceImagePath, prompt, styleId, formatId, angleId, angleIndex })
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

### Paying in-app with ABA PayWay

On top of the manual code entry above, buyers can also pay right inside the
app and get unlocked automatically — no admin step, no waiting for an order
email. This is the `AccessGate` screen's "Pay with ABA PayWay" tab, backed
by `src/lib/abaPayway.js`, `src/lib/paymentsStore.js`, and `src/routes/payments.js`.

**How it works:** the app scrapes ABA's public PayWay payment-link page for
the KHQR session data their own checkout page uses, signs a request the same
way their page's JS does (`sha512(request_time + aba_data + additional_fields)`),
and gets back a KHQR string it renders as a QR image. The buyer scans it with
their ABA Mobile app; the backend polls ABA's status endpoint every few
seconds and, once approved, generates the same kind of access code the
manual/store flow produces and hands it to the frontend — the app unlocks
itself, no page reload needed.

**⚠️ Read before relying on this in production:** this is not ABA's
documented merchant API — it's reverse-engineered from their own checkout
page's front-end JavaScript, adapted from a client-supplied integration
spec. Two real risks come with that:

- **It can break silently** if ABA changes that page's markup or field
  names, since there's no versioned contract to depend on.
- **ABA has previously blocked this exact style of request (HTTP 403) from
  Hostinger's shared-hosting IP ranges** — that's documented history from
  sleukchak.site's own store, which is why *that* store abandoned automatic
  ABA payments for a manual QR + admin "mark paid" flow instead. This app is
  built to run on Render, a different IP range, but that's not a guarantee
  ABA won't block it too — the only way to know is to test
  `POST /api/payments/create` against your real `ABA_PAYMENT_URL` once it's
  live and watch the backend logs for a 403.

**Setup:**

1. In the ABA merchant portal, create a PayWay payment link (an "open
   amount" one — where a person visiting it directly would type in their
   own amount — works fine; the app supplies the amount itself with every
   request, from `ACCESS_PRICE_USD`, so it doesn't depend on the link
   having a price baked in) and copy its public URL.
2. Set `ABA_PAYMENT_URL` in `backend/.env`. No API key / client ID is
   needed — `client_id` comes back from ABA's own response and is used
   as-is, exactly per the custom SOP this was built to.
3. Leave `ABA_MOCK` unset/blank — it only matters as an override; without
   `ABA_PAYMENT_URL` set, mock mode is already on automatically.
4. To change the price later, just change `ACCESS_PRICE_USD` — no need to
   touch the ABA link itself.

**Testing without real credentials:** with `ABA_PAYMENT_URL` unset, the whole
flow runs in mock mode — a fake KHQR image is generated and the payment
auto-approves itself after ~8 seconds, so you can exercise create → poll →
paid → unlocked end-to-end (and see the exact same UI the buyer will) before
you have a live ABA payment link to test against. The panel shows a small
"Test mode" badge whenever mock mode is active, so it's never mistaken for a
real charge.

If ABA's endpoint ends up blocked from wherever this is deployed, the
"Enter code" tab (manual, store-fulfilled codes) keeps working exactly as
before — ABA PayWay is additive, not a replacement for it.

### Admin panel — brand + payment-method logos

The payment receipt (the branded card with the QR code) shows a brand
name/logo and a footer of accepted-payment-method badges. Both are editable
without touching any code, from a small admin page at `/admin` on your
deployed site (e.g. `https://your-app.onrender.com/admin`).

**Turning it on:** set `ADMIN_SECRET` in `backend/.env` (or Render's
Environment tab) to a long random string — the page is fully disabled
(every admin request is rejected) until this is set. This is separate from
`ACCESS_SECRET`; buyers never see or need it. Open `/admin`, enter that
secret once, and it's remembered for the rest of that browser tab.

**What you can change:**

- **Brand name** — replaces the hardcoded "AI Ads Generator" text in the
  receipt header. `ACCESS_BRAND_NAME` in `.env` sets a fallback used only
  until a name is saved here; the admin-panel value always wins once set.
- **Brand logo** — replaces the plain letter tile in the header. Recommended:
  square, at least 256×256px, PNG with a transparent background. Uploads are
  automatically resized to fit, so it doesn't need to be pixel-perfect.
- **Payment-method logos** — one image per method (ABA, ACLEDA, Wing,
  TrueMoney, VISA, Mastercard, UnionPay), replacing that method's plain text
  badge with the real logo. Recommended: a wide image, roughly 200×64px, PNG
  with a transparent background. A method with no logo uploaded just keeps
  showing its text badge — never a broken image.

Uploaded logos are stored under `backend/storage/branding/` (created
automatically) and served at `/assets/branding/...`, the same static-file
pattern already used for uploaded product photos and generated ads.

### Store proxy — powering sleukchak.site's main-store ABA checkout too

ABA blocks requests from Hostinger's shared-hosting IPs, so sleukchak.site's
main PHP store (`checkout.php`) can't call ABA directly to auto-generate a
QR for its own orders. This app already has a working, non-blocked
connection to ABA (via `ABA_PAYMENT_URL` above) — so the PHP store's
`includes/aba_payway.php` calls two routes here instead of ABA itself:

- `POST /api/store-proxy/create-session` — `{ amount }` → a fresh KHQR
  session (same shape `createAbaSession()` already returns internally).
- `POST /api/store-proxy/check-status` — `{ deviceId, clientId, requestTime }`
  → `{ action: "approved" | "pending" | "failed" }`.

Both require an `x-store-proxy-secret` header matching `STORE_PROXY_SECRET`
(see `.env.example`) — fully disabled (503 on every request) until that's
set. Set the exact same value as `STORE_PROXY_SECRET` in the PHP store's
`config.php`. This has nothing to do with this app's own purchase flow
(`/api/payments/*`) — it's a second, independent caller of the same
underlying ABA connection.

## Notes on scaling to a full catalog

The generate endpoint already accepts multiple `formats` per request and
loops through them, so batching a catalog is a matter of calling
`POST /api/generate` once per product (or extending it to accept multiple
`imageId`s) and letting the same prompt-template + provider pipeline run
per item. For real catalog scale, swap `src/lib/jobQueue.js` for a durable
queue so jobs survive a backend restart, and `src/lib/storage.js` for S3 (or
similar) so generated assets aren't tied to a single server's disk.
