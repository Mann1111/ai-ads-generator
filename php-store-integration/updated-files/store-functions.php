<?php
// Note: aba_payway.php is intentionally NOT required here anymore — the
// manual flow below has no dependency on it. See includes/aba_payway.php's
// file header for why (blocked at the IP level from Hostinger) and
// config.php's ABA_PAYMENT_LINK comment.
require_once __DIR__ . '/google-drive.php';
require_once __DIR__ . '/ai_ads_access.php';
/**
 * Digital store helpers: products, orders, and the checkout lifecycle
 * (create pending order -> buyer pays manually via a static QR -> admin
 * verifies the transfer themselves and marks it paid -> admin delivers).
 *
 * This was originally built around ABA PayWay auto-payment (auto-generate
 * a QR, auto-poll payment status) but that's currently blocked — ABA's
 * payment-link page 403s requests from Hostinger's shared IPs. The store
 * now uses a manual flow instead: no QR is generated per-order, no polling
 * happens, and only an admin clicking "Mark paid" in admin/orders.php (after
 * checking their own bank/ABA app) ever changes an order to 'paid'.
 *
 * Security rules baked into these functions still apply:
 *  - The charge amount always comes from products.price, snapshotted onto
 *    orders.amount at creation time. Nothing from the browser ever decides
 *    what gets charged.
 *  - mark_order_paid() takes a row lock inside a transaction and bails out
 *    if the order is already paid, so it's safe even if clicked twice.
 *  - Every order gets a random buyer_token; only a request presenting the
 *    matching token (or an admin) may view it — see
 *    order_belongs_to_requester().
 */
function unique_product_slug($pdo, $baseSlug, $excludeId = null) {
    $slug = $baseSlug;
    $i = 2;
    while (true) {
        $sql = "SELECT id FROM products WHERE slug = ?" . ($excludeId ? " AND id != ?" : "");
        $stmt = $pdo->prepare($sql);
        $params = [$slug];
        if ($excludeId) $params[] = $excludeId;
        $stmt->execute($params);
        if (!$stmt->fetch()) return $slug;
        $slug = $baseSlug . '-' . $i;
        $i++;
    }
}
/**
 * ORD-XXXXXXXXXXXX — retries on the astronomically unlikely chance of a
 * collision with the UNIQUE constraint on orders.reference_code.
 */
function generate_order_reference($pdo) {
    do {
        $code = 'ORD-' . strtoupper(bin2hex(random_bytes(6)));
        $stmt = $pdo->prepare("SELECT id FROM orders WHERE reference_code = ?");
        $stmt->execute([$code]);
    } while ($stmt->fetch());
    return $code;
}
/**
 * Opaque per-order capability token embedded in the checkout URL. Anyone
 * holding this token can view/poll that one order — it's how an
 * account-less buyer proves ownership (see order_belongs_to_requester()).
 */
function generate_buyer_token() {
    return bin2hex(random_bytes(32)); // 64 hex chars
}
function get_active_products($pdo) {
    return $pdo->query("SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC")->fetchAll();
}
function get_product_by_slug($pdo, $slug) {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE slug = ? AND is_active = 1");
    $stmt->execute([$slug]);
    return $stmt->fetch();
}
/**
 * Unlike get_product_by_slug(), this deliberately does NOT filter on
 * is_active — an existing order must still be able to show its product's
 * name/price on the post-order page even if the product was deactivated
 * (e.g. sold out) after the order was placed.
 */
function get_product_by_id($pdo, $productId) {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$productId]);
    return $stmt->fetch();
}
function get_order_by_id($pdo, $orderId) {
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    return $stmt->fetch();
}
/**
 * True if $token is this order's buyer_token, OR the current request is an
 * already-authenticated admin session. Always use this before returning
 * any order data to a request — reference codes / order ids are
 * sequential and guessable, the token is what actually gates access.
 */
function order_belongs_to_requester($order, $token) {
    if (!$order) return false;
    if (function_exists('is_logged_in') && is_logged_in()) return true;
    if (!$token || !is_string($token)) return false;
    return hash_equals($order['buyer_token'], $token);
}
/**
 * Creates a pending order for $product at its server-side price. No QR is
 * generated here — the manual flow shows one static QR image
 * (STORE_QR_IMAGE) on the post-order page for every order, and the buyer
 * pays it themselves outside the site. The ABA-auto-payment-only columns
 * (device_id/client_id/request_time/hash/expires_at) are left NULL.
 */
function create_order($pdo, array $product, string $buyerEmail) {
    $amount = (float) $product['price']; // server-side truth — never anything from the client
    $reference = generate_order_reference($pdo);
    $token = generate_buyer_token();
    $stmt = $pdo->prepare("
        INSERT INTO orders
            (product_id, reference_code, buyer_token, buyer_email, amount, status)
        VALUES
            (?, ?, ?, ?, ?, 'pending')
    ");
    $stmt->execute([
        $product['id'],
        $reference,
        $token,
        $buyerEmail,
        $amount,
    ]);
    $order = get_order_by_id($pdo, (int) $pdo->lastInsertId());
    $order['buyer_token'] = $token; // needed once, to build the checkout URL
    return $order;
}
/**
 * Idempotently marks one order paid. Wrapped in a transaction with
 * SELECT ... FOR UPDATE so two concurrent callers (e.g. an admin
 * double-clicking "Mark paid") can't both process the same order: the
 * first to get the lock does the update and commits; the second then sees
 * status already 'paid' and returns false without touching anything.
 * Returns true only if THIS call performed the transition.
 */
function mark_order_paid($pdo, int $orderId): bool {
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT status FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $row = $stmt->fetch();
        if (!$row || $row['status'] === 'paid') {
            $pdo->commit();
            return false;
        }
        $pdo->prepare("UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = ?")
            ->execute([$orderId]);
        $pdo->commit();
        return true;
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}
/**
 * Grants the buyer of $orderId Viewer access to their product's Drive
 * file/folder, and records the outcome on the order row
 * (drive_access_granted/drive_access_error/drive_access_attempted_at —
 * see migration-store-drive-access.sql) so admin/orders.php can show a
 * persistent warning and offer a retry, rather than a one-time flash the
 * admin might miss.
 *
 * Called right after mark_order_paid() transitions an order to 'paid'
 * (and again from the "Retry Drive access" admin action). Deliberately
 * never throws and never touches orders.status — a Drive API failure
 * (bad file ID, revoked service-account access, Google having a bad day)
 * must never block or undo marking an order paid; the admin just falls
 * back to sharing the file manually.
 *
 * Returns true if access was granted, false otherwise.
 */
function grant_drive_access_for_order($pdo, int $orderId): bool {
    $error = null;
    try {
        $order = get_order_by_id($pdo, $orderId);
        if (!$order) {
            $error = "Order #$orderId not found.";
        } else {
            $product = get_product_by_id($pdo, $order['product_id']);
            if (!$product) {
                $error = "Product for order #$orderId not found.";
            } else {
                $fileId = gdrive_extract_file_id($product['product_link']);
                if (!$fileId) {
                    $error = 'Could not find a Drive file/folder ID in product_link: ' . $product['product_link'];
                } else {
                    $result = gdrive_grant_viewer_access($fileId, $order['buyer_email']);
                    if (!$result['ok']) {
                        $error = $result['error'];
                    }
                }
            }
        }
    } catch (Throwable $e) {
        $error = 'Unexpected error granting Drive access: ' . $e->getMessage();
    }
    $pdo->prepare("
        UPDATE orders
        SET drive_access_granted = ?, drive_access_error = ?, drive_access_attempted_at = NOW()
        WHERE id = ?
    ")->execute([$error === null ? 1 : 0, $error, $orderId]);
    return $error === null;
}
/**
 * Generates and stores this order's AI Ads Generator access code, and
 * records the outcome on the order row (ai_ads_access_code/
 * ai_ads_access_error — see migration-ai-ads-access.sql), mirroring
 * grant_drive_access_for_order()'s persistent-status-plus-retry pattern.
 *
 * Unlike Drive access, this never calls another service — the code is
 * generated locally via HMAC (see includes/ai_ads_access.php) and verified
 * the same way by the separate Node app, using the shared
 * AI_ADS_ACCESS_SECRET. The only realistic failure mode is that secret
 * being unset in config.php, which is exactly what generateAiAdsAccessCode()
 * throws on. Deliberately never touches orders.status, same reasoning as
 * the Drive function: a fulfillment hiccup must never block or undo
 * marking an order paid.
 *
 * Idempotent by nature — the code is deterministic from the order id and
 * the secret, so calling this again (e.g. via "Retry code generation")
 * regenerates the exact same code rather than issuing a new one.
 *
 * Returns true if a code was generated, false otherwise.
 */
function grant_ai_ads_access_for_order($pdo, int $orderId): bool {
    $error = null;
    $code = null;
    try {
        $order = get_order_by_id($pdo, $orderId);
        if (!$order) {
            $error = "Order #$orderId not found.";
        } else {
            $code = generateAiAdsAccessCode($orderId);
        }
    } catch (Throwable $e) {
        $error = 'Unexpected error generating AI Ads Generator access code: ' . $e->getMessage();
    }
    $pdo->prepare("
        UPDATE orders
        SET ai_ads_access_code = ?, ai_ads_access_error = ?
        WHERE id = ?
    ")->execute([$code, $error, $orderId]);
    return $error === null;
}
function order_status_label($status) {
    $labels = [
        'pending' => 'កំពុងរង់ចាំការទូទាត់ (Awaiting payment)',
        'paid' => 'បានទូទាត់ (Paid)',
        'expired' => 'ផុតកំណត់ (Expired)',
        'failed' => 'បរាជ័យ (Failed)',
    ];
    return $labels[$status] ?? $status;
}
