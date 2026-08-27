<?php
/**
 * AI Ads Generator — access code generation for the sleukchak.site store.
 *
 * Drop this file in includes/ (alongside includes/google-drive.php,
 * includes/gemini.php, etc.) and require it wherever you fulfill orders.
 *
 * This mirrors backend/src/lib/accessCode.js EXACTLY — same HMAC-SHA256
 * scheme, same code format. The two apps never talk to each other over the
 * network; a code generated here is verified purely by recomputing the same
 * signature on the Node side, using the same shared secret. That means:
 *
 *   1. Define AI_ADS_ACCESS_SECRET in config.php as a long random string.
 *   2. Set the EXACT same string as ACCESS_SECRET in the Node app's
 *      environment (Render dashboard → your service → Environment).
 *   3. Any code this function generates will then verify correctly on the
 *      Node app — no shared database, no API call between the two hosts.
 *
 * Rotating the secret invalidates every code ever issued — only do that if
 * you're OK re-issuing codes to past buyers too.
 */

/**
 * Generates an access code for a given order id, e.g. generateAiAdsAccessCode(123)
 * -> "ADS-123-7EEF1E13"
 *
 * @param int|string $orderId Your store's order id — whatever uniquely
 *                             identifies this purchase (the `id` column on
 *                             your orders table is the natural choice).
 * @return string
 */
function generateAiAdsAccessCode($orderId): string
{
    if (!defined('AI_ADS_ACCESS_SECRET') || AI_ADS_ACCESS_SECRET === '') {
        throw new RuntimeException('AI_ADS_ACCESS_SECRET is not set in config.php.');
    }

    $orderId = trim((string) $orderId);
    if ($orderId === '') {
        throw new InvalidArgumentException('orderId is required.');
    }

    $sig = strtoupper(substr(hash_hmac('sha256', $orderId, AI_ADS_ACCESS_SECRET), 0, 8));

    return "ADS-{$orderId}-{$sig}";
}
