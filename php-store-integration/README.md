# Selling AI Ads Generator access through the sleukchak.site store

Makes the AI Ads Generator a product in your existing digital store, using
the same manual-payment pattern as your other products (buyer pays by
QR/bank transfer, you verify it yourself, click "Mark paid"), but instead of
granting Google Drive access, fulfillment generates a one-time access code
the buyer enters in the app.

**This is now the exact diff for your real files** — I've seen your actual
`admin/orders.php`, `admin/products.php`, and `includes/store-functions.php`
and based these on them directly, not a generic template. I tested the new
logic three ways before sending this: a PHP test harness (SQLite in-memory,
mirroring your real schema) running both the existing Drive flow and the new
AI Ads flow through the actual functions below — 14/14 checks passed,
including that the existing Drive path is completely untouched; a
side-by-side PHP vs. Node computation confirming both produce byte-identical
codes for the same order id and secret; and confirming a PHP-generated code
for a realistic numeric order id (matching your auto-increment `orders.id`)
verifies correctly against the actual Node verifier function.

## What's changing

- **New DB columns**: `products.fulfillment_type` (`'drive'` or
  `'ai_ads_access'`, defaults to `'drive'` — every existing product keeps
  working exactly as it does now, untouched) and `orders.ai_ads_access_code`
  / `orders.ai_ads_access_error` (mirrors your existing
  `drive_access_granted` / `drive_access_error` pattern).
- **New file**: `includes/ai_ads_access.php` (already covered in the parent
  folder's README — the HMAC code generator).
- **New function** in `store-functions.php`: `grant_ai_ads_access_for_order()`,
  written to match `grant_drive_access_for_order()`'s conventions exactly
  (never throws, never touches `orders.status`, records outcome on the order
  row for a persistent admin-visible status + retry).
- **`admin/orders.php`**: the paid-order handler now checks the product's
  `fulfillment_type` and branches to either the existing Drive grant or the
  new code generation. Added a matching `retry_ai_ads` action and alert
  banners. The "Drive access" column becomes "Fulfillment" (shows the right
  thing per product type — Drive status for Drive products, the generated
  code for AI Ads Generator orders).
- **`admin/products.php`**: adds a "Fulfillment method" dropdown to the
  product form and a column to the products table. For an AI Ads Generator
  product, put the app's public URL (e.g. `https://ads.sleukchak.site`) in
  the existing "Real download link" field — no schema/behavior change needed
  there, it's already hidden until paid.

## Setup steps

**1. Run the migration.** `migration-ai-ads-access.sql` — via Hostinger's
phpMyAdmin, against the live database. Safe to run any time; it only adds
columns with sensible defaults, nothing existing changes.

**2. Add the shared secret.** Generate one (e.g. `openssl rand -hex 32`),
add to `config.php`:

```php
define('AI_ADS_ACCESS_SECRET', 'paste-your-long-random-string-here');
```

Set the **exact same string** as `ACCESS_SECRET` on the Node app's Render
service (Environment tab). A single differing character makes every code
fail to verify.

**3. Add the helper file.** Copy `../ai_ads_access.php` (one level up from
this folder) into `includes/`.

**4. Replace three files** using your normal workflow (paste into Hostinger
File Manager's editor, click Replace) — the complete updated contents are in
`updated-files/` in this folder:

- `includes/store-functions.php`
- `admin/orders.php`
- `admin/products.php`

Each is the exact original file you shared, plus only the additions
described above — nothing else was reformatted or reordered, so a diff
against what's currently live should show just the new lines.

**5. Create the product.** In `admin/products.php`, add a new product,
choose "AI Ads Generator access code" as the fulfillment method, and put
`https://ads.sleukchak.site` (or wherever it ends up deployed) as the "Real
download link." Set your price.

**6. Test with one real order.** Place a test order, mark it paid, confirm
a code appears in the Orders table under "Fulfillment," and confirm that
code actually unlocks the live app when entered there.

## Notes

- **No expiry, no usage limit** — matches "one-time purchase, unlimited
  use." A code works forever once issued.
- **No per-buyer revocation** — verification is stateless (no shared
  database between PHP and Node), so there's no way to revoke one buyer's
  code without rotating the secret for everyone. Fine for a small, manual,
  trust-based store; worth knowing if that ever needs to change.
- **Retry is safe to click repeatedly** — code generation is deterministic
  (same order id + secret = same code every time), so "Retry code
  generation" can't accidentally issue a buyer two different codes.
- Testing without touching the live store: `backend/scripts/gen-code.js`
  (in the main project) generates a code the same way, so you can test the
  Node app's gate end-to-end before wiring up the PHP side.
