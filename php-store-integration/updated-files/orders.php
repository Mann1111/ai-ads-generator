<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/store-functions.php';
require_login();
if (isset($_GET['mark_paid'])) {
    $id = (int) $_GET['mark_paid'];
    // Only ever call this after verifying the transfer yourself in your
    // bank/ABA app — mark_order_paid() just records that decision. It's
    // idempotent (row-locked, checks current status), so clicking it twice
    // or on an already-paid order is harmless.
    $justPaid = mark_order_paid($pdo, $id);
    $redirect = 'orders.php?paid=1';
    if ($justPaid) {
        // Best-effort fulfillment, branched per product type. Never blocks
        // or undoes the paid status above — a failure here just surfaces
        // as a warning + a persistent status pill on the order row, with a
        // retry action, so it's never silently lost.
        $order = get_order_by_id($pdo, $id);
        $product = $order ? get_product_by_id($pdo, $order['product_id']) : null;
        $fulfillmentType = $product['fulfillment_type'] ?? 'drive';

        if ($fulfillmentType === 'ai_ads_access') {
            $fulfillOk = grant_ai_ads_access_for_order($pdo, $id);
            if (!$fulfillOk) {
                $redirect .= '&ai_ads_failed=1';
            }
        } else {
            $driveOk = grant_drive_access_for_order($pdo, $id);
            if (!$driveOk) {
                $redirect .= '&drive_failed=1';
            }
        }
    }
    header('Location: ' . $redirect);
    exit;
}
if (isset($_GET['retry_drive'])) {
    $id = (int) $_GET['retry_drive'];
    $ok = grant_drive_access_for_order($pdo, $id);
    header('Location: orders.php?' . ($ok ? 'drive_retried=1' : 'drive_failed=1'));
    exit;
}
if (isset($_GET['retry_ai_ads'])) {
    $id = (int) $_GET['retry_ai_ads'];
    $ok = grant_ai_ads_access_for_order($pdo, $id);
    header('Location: orders.php?' . ($ok ? 'ai_ads_retried=1' : 'ai_ads_failed=1'));
    exit;
}
if (isset($_GET['deliver'])) {
    $id = (int) $_GET['deliver'];
    // The WHERE status='paid' guard means this can never mark a
    // still-pending/expired order as delivered by accident.
    $pdo->prepare("UPDATE orders SET delivered = 1, delivered_at = NOW() WHERE id = ? AND status = 'paid'")
        ->execute([$id]);
    header('Location: orders.php?delivered=1');
    exit;
}
$orders = $pdo->query("
    SELECT o.*, p.name_km AS product_name_km, p.name_en AS product_name_en, p.product_link,
           p.fulfillment_type AS product_fulfillment_type
    FROM orders o
    JOIN products p ON p.id = o.product_id
    ORDER BY o.created_at DESC
")->fetchAll();
$statusPillClass = [
    'pending' => 'status-draft',
    'paid' => 'status-published',
    'expired' => 'status-draft',
    'failed' => 'status-draft',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Orders — SleukChak Admin</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body class="admin-shell">
<div class="admin-topbar">
  <div class="logo">Sleuk<span class="pulse">Chak</span> <span style="font-size:13px; opacity:.7;">/ admin</span></div>
  <div><a href="dashboard.php">← ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង</a> &nbsp;·&nbsp; <a href="products.php">ទំនិញ (Products)</a></div>
</div>
<div class="admin-wrap" style="max-width:1200px;">
  <div class="admin-header-row">
    <h1 style="font-family:'Fraunces',serif; font-size:26px; color:var(--navy);">ការបញ្ជាទិញ (Orders)</h1>
  </div>
  <?php if (isset($_GET['delivered'])): ?>
    <div class="alert alert-success">Marked as delivered.</div>
  <?php endif; ?>
  <?php if (isset($_GET['paid'])): ?>
    <div class="alert alert-success">Marked as paid.</div>
  <?php endif; ?>
  <?php if (isset($_GET['drive_failed'])): ?>
    <div class="alert alert-error">Marked paid, but automatic Google Drive access could not be granted — see the "Fulfillment" column below for the error, and either grant access manually in Drive or use "Retry Drive access" once it's fixed.</div>
  <?php endif; ?>
  <?php if (isset($_GET['drive_retried'])): ?>
    <div class="alert alert-success">Drive access granted.</div>
  <?php endif; ?>
  <?php if (isset($_GET['ai_ads_failed'])): ?>
    <div class="alert alert-error">Marked paid, but the AI Ads Generator access code could not be generated — see the "Fulfillment" column below for the error (most likely AI_ADS_ACCESS_SECRET isn't set in config.php), then use "Retry code generation" once it's fixed.</div>
  <?php endif; ?>
  <?php if (isset($_GET['ai_ads_retried'])): ?>
    <div class="alert alert-success">AI Ads Generator access code generated.</div>
  <?php endif; ?>
  <div class="admin-card">
    <table class="admin-table">
      <thead><tr><th>Ref</th><th>Product</th><th>Buyer email</th><th>Amount</th><th>Status</th><th>Fulfillment</th><th>Date</th><th>Download link</th><th>Actions</th></tr></thead>
      <tbody>
        <?php if (!$orders): ?>
          <tr><td colspan="9" style="text-align:center; color:var(--ink-soft); padding:24px;">No orders yet.</td></tr>
        <?php endif; ?>
        <?php foreach ($orders as $o): ?>
          <tr>
            <td style="font-family:'IBM Plex Mono',monospace; font-size:11px;"><?= h($o['reference_code']) ?></td>
            <td><?= h($o['product_name_km']) ?><br><span style="color:var(--ink-soft); font-size:11.5px;"><?= h($o['product_name_en']) ?></span></td>
            <td><?= h($o['buyer_email']) ?></td>
            <td>$<?= number_format($o['amount'], 2) ?></td>
            <td>
              <span class="status-pill <?= $statusPillClass[$o['status']] ?? 'status-draft' ?>"><?= h(order_status_label($o['status'])) ?></span>
              <?php if ($o['status'] === 'paid'): ?>
                <br><span class="status-pill <?= $o['delivered'] ? 'status-published' : 'status-draft' ?>" style="margin-top:4px; display:inline-block;"><?= $o['delivered'] ? 'delivered' : 'not delivered' ?></span>
              <?php endif; ?>
            </td>
            <td>
              <?php if ($o['status'] !== 'paid'): ?>
                <span style="color:var(--ink-soft); font-size:11.5px;">—</span>
              <?php elseif ($o['product_fulfillment_type'] === 'ai_ads_access'): ?>
                <?php if ($o['ai_ads_access_code']): ?>
                  <span class="status-pill status-published">code issued</span>
                  <br><span style="font-family:'IBM Plex Mono',monospace; font-size:11px;"><?= h($o['ai_ads_access_code']) ?></span>
                <?php else: ?>
                  <span class="status-pill" style="background:#fbe9e6; color:var(--vermillion);" title="<?= h($o['ai_ads_access_error'] ?? '') ?>">failed — retry needed</span>
                <?php endif; ?>
              <?php elseif ($o['drive_access_granted']): ?>
                <span class="status-pill status-published">granted</span>
              <?php else: ?>
                <span class="status-pill" style="background:#fbe9e6; color:var(--vermillion);" title="<?= h($o['drive_access_error'] ?? '') ?>">failed — manual grant needed</span>
              <?php endif; ?>
            </td>
            <td><?= date('d M Y H:i', strtotime($o['created_at'])) ?></td>
            <td style="max-width:220px;">
              <?php if ($o['status'] === 'paid'): ?>
                <a href="<?= h($o['product_link']) ?>" target="_blank" rel="noopener" style="font-size:11px; word-break:break-all;"><?= h($o['product_link']) ?></a>
              <?php else: ?>
                <span style="color:var(--ink-soft); font-size:11.5px;">— (only shown once paid)</span>
              <?php endif; ?>
            </td>
            <td class="table-actions">
              <?php if ($o['status'] === 'pending'): ?>
                <a href="orders.php?mark_paid=<?= $o['id'] ?>" onclick="return confirm('Mark this order as PAID? Only do this after verifying the transfer yourself in your bank/ABA app.')">Mark paid</a>
              <?php endif; ?>
              <?php if ($o['status'] === 'paid' && !$o['delivered']): ?>
                <a href="orders.php?deliver=<?= $o['id'] ?>" onclick="return confirm('Mark this order as delivered?')">Mark delivered</a>
              <?php endif; ?>
              <?php if ($o['status'] === 'paid' && $o['product_fulfillment_type'] === 'ai_ads_access' && !$o['ai_ads_access_code']): ?>
                <br><a href="orders.php?retry_ai_ads=<?= $o['id'] ?>">Retry code generation</a>
              <?php endif; ?>
              <?php if ($o['status'] === 'paid' && $o['product_fulfillment_type'] !== 'ai_ads_access' && !$o['drive_access_granted']): ?>
                <br><a href="orders.php?retry_drive=<?= $o['id'] ?>">Retry Drive access</a>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>
