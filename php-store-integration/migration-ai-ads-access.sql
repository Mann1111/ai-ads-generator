-- Run once against the sleukchak.site database (e.g. via Hostinger's
-- phpMyAdmin) before deploying the updated PHP files below.
--
-- Adds:
--   products.fulfillment_type — 'drive' (existing behavior, default — every
--     current product keeps working exactly as-is) or 'ai_ads_access' (new:
--     generates a per-order access code instead of granting Drive access).
--   orders.ai_ads_access_code / orders.ai_ads_access_error — mirrors the
--     existing drive_access_granted/drive_access_error pattern, so the
--     admin UI can show a persistent status + retry, not just a one-time
--     flash message.

ALTER TABLE products
  ADD COLUMN fulfillment_type ENUM('drive', 'ai_ads_access') NOT NULL DEFAULT 'drive';

ALTER TABLE orders
  ADD COLUMN ai_ads_access_code VARCHAR(40) NULL DEFAULT NULL,
  ADD COLUMN ai_ads_access_error VARCHAR(255) NULL DEFAULT NULL;
