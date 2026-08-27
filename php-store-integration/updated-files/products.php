<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/store-functions.php';
require_login();
$error = '';
$editProduct = null;
if (isset($_GET['delete'])) {
    try {
        $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$_GET['delete']]);
        header('Location: products.php?deleted=1');
        exit;
    } catch (Exception $e) {
        // Most likely a foreign key violation because this product has orders.
        header('Location: products.php?delete_error=1');
        exit;
    }
}
if (isset($_GET['toggle'])) {
    $pdo->prepare("UPDATE products SET is_active = 1 - is_active WHERE id = ?")->execute([$_GET['toggle']]);
    header('Location: products.php');
    exit;
}
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$_GET['edit']]);
    $editProduct = $stmt->fetch();
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nameKm = trim($_POST['name_km'] ?? '');
    $nameEn = trim($_POST['name_en'] ?? '');
    $descKm = trim($_POST['description_km'] ?? '');
    $descEn = trim($_POST['description_en'] ?? '');
    $price = $_POST['price'] ?? '';
    $productLink = trim($_POST['product_link'] ?? '');
    // Only 'drive' (default, existing behavior) or 'ai_ads_access' are ever
    // written — anything else submitted (tampered form, typo) silently
    // falls back to 'drive' rather than failing the save.
    $fulfillmentType = in_array($_POST['fulfillment_type'] ?? '', ['drive', 'ai_ads_access'], true)
        ? $_POST['fulfillment_type']
        : 'drive';
    $id = $_POST['id'] ?? null;
    $existingImage = $_POST['existing_image'] ?? '';
    if ($nameKm === '' || $nameEn === '' || $productLink === '' || !is_numeric($price) || (float) $price <= 0) {
        $error = 'Khmer name, English name, a positive price, and the real download link are all required.';
    } else {
        try {
            $imageUrl = $existingImage;
            $uploaded = upload_image('image');
            if ($uploaded) $imageUrl = $uploaded;
            $baseSlug = slugify($nameEn);
            $slug = unique_product_slug($pdo, $baseSlug, $id ?: null);
            if ($id) {
                $stmt = $pdo->prepare("UPDATE products SET slug=?, name_km=?, name_en=?, description_km=?, description_en=?, price=?, image_url=?, product_link=?, fulfillment_type=? WHERE id=?");
                $stmt->execute([$slug, $nameKm, $nameEn, $descKm, $descEn, $price, $imageUrl, $productLink, $fulfillmentType, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO products (slug, name_km, name_en, description_km, description_en, price, image_url, product_link, fulfillment_type) VALUES (?,?,?,?,?,?,?,?,?)");
                $stmt->execute([$slug, $nameKm, $nameEn, $descKm, $descEn, $price, $imageUrl, $productLink, $fulfillmentType]);
            }
            header('Location: products.php?saved=1');
            exit;
        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    }
}
$products = $pdo->query("SELECT * FROM products ORDER BY created_at DESC")->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Products — SleukChak Admin</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body class="admin-shell">
<div class="admin-topbar">
  <div class="logo">Sleuk<span class="pulse">Chak</span> <span style="font-size:13px; opacity:.7;">/ admin</span></div>
  <div><a href="dashboard.php">← ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង</a> &nbsp;·&nbsp; <a href="orders.php">ការបញ្ជាទិញ (Orders)</a></div>
</div>
<div class="admin-wrap">
  <div class="admin-card" style="margin-bottom:24px;">
    <h1><?= $editProduct ? 'កែសម្រួលទំនិញ (Edit product)' : 'ទំនិញថ្មី (New product)' ?></h1>
    <?php if ($error): ?><div class="alert alert-error"><?= h($error) ?></div><?php endif; ?>
    <?php if (isset($_GET['saved'])): ?><div class="alert alert-success">Product saved.</div><?php endif; ?>
    <?php if (isset($_GET['deleted'])): ?><div class="alert alert-success">Product deleted.</div><?php endif; ?>
    <?php if (isset($_GET['delete_error'])): ?><div class="alert alert-error">Couldn't delete — this product has existing orders. Hide it instead.</div><?php endif; ?>
    <form method="post" enctype="multipart/form-data">
      <?php if ($editProduct): ?><input type="hidden" name="id" value="<?= $editProduct['id'] ?>"><?php endif; ?>
      <div class="form-row" style="display:flex; gap:16px;">
        <div style="flex:1;">
          <label>ឈ្មោះ (Khmer name)</label>
          <input type="text" name="name_km" required value="<?= h($editProduct['name_km'] ?? '') ?>">
        </div>
        <div style="flex:1;">
          <label>English name</label>
          <input type="text" name="name_en" required value="<?= h($editProduct['name_en'] ?? '') ?>">
        </div>
      </div>
      <div class="form-row" style="display:flex; gap:16px;">
        <div style="flex:1;">
          <label>ការពិពណ៌នា (Khmer description)</label>
          <textarea name="description_km"><?= h($editProduct['description_km'] ?? '') ?></textarea>
        </div>
        <div style="flex:1;">
          <label>English description</label>
          <textarea name="description_en"><?= h($editProduct['description_en'] ?? '') ?></textarea>
        </div>
      </div>
      <div class="form-row">
        <label>តម្លៃ USD (Price in USD) — this is exactly what the buyer is charged, no markup applied elsewhere</label>
        <input type="number" name="price" step="0.01" min="0.01" required value="<?= h($editProduct['price'] ?? '') ?>">
      </div>
      <div class="form-row">
        <label>របៀបប្រគល់ជូន (Fulfillment method)</label>
        <select name="fulfillment_type">
          <?php $ft = $editProduct['fulfillment_type'] ?? 'drive'; ?>
          <option value="drive" <?= $ft === 'drive' ? 'selected' : '' ?>>Google Drive access — auto-grants the buyer's email Viewer access to the Drive file/folder in "Real download link"</option>
          <option value="ai_ads_access" <?= $ft === 'ai_ads_access' ? 'selected' : '' ?>>AI Ads Generator access code — generates a one-time code the buyer enters at the app; put the app's URL (e.g. https://ads.sleukchak.site) in "Real download link"</option>
        </select>
      </div>
      <div class="form-row">
        <label>រូបភាព (Image) <?= $editProduct ? '(leave blank to keep current)' : '' ?></label>
        <?php if ($editProduct && $editProduct['image_url']): ?>
          <img src="/<?= h($editProduct['image_url']) ?>" style="max-width:200px; border-radius:3px; display:block; margin-bottom:10px;">
          <input type="hidden" name="existing_image" value="<?= h($editProduct['image_url']) ?>">
        <?php endif; ?>
        <input type="file" name="image" accept="image/*">
      </div>
      <div class="form-row">
        <label>តំណភ្ជាប់ទាញយកពិត (Real download link) — never shown on the public site, only here and in Orders once an order is paid</label>
        <input type="text" name="product_link" required placeholder="https://" value="<?= h($editProduct['product_link'] ?? '') ?>">
      </div>
      <button class="btn" type="submit"><?= $editProduct ? 'ធ្វើបច្ចុប្បន្នភាព' : 'បង្កើតទំនិញ' ?></button>
      <?php if ($editProduct): ?><a href="products.php" class="btn btn-ghost" style="margin-left:10px;">Cancel edit</a><?php endif; ?>
    </form>
  </div>
  <div class="admin-card">
    <h1>ទំនិញទាំងអស់ (All products)</h1>
    <table class="admin-table">
      <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Fulfillment</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        <?php if (!$products): ?>
          <tr><td colspan="6" style="text-align:center; color:var(--ink-soft); padding:24px;">No products yet.</td></tr>
        <?php endif; ?>
        <?php foreach ($products as $p): ?>
          <tr>
            <td><?php if ($p['image_url']): ?><img src="/<?= h($p['image_url']) ?>" style="width:60px; border-radius:2px;"><?php endif; ?></td>
            <td><?= h($p['name_km']) ?><br><span style="color:var(--ink-soft); font-size:11.5px;"><?= h($p['name_en']) ?></span></td>
            <td>$<?= number_format($p['price'], 2) ?></td>
            <td style="font-size:11.5px;"><?= $p['fulfillment_type'] === 'ai_ads_access' ? 'AI Ads access code' : 'Google Drive' ?></td>
            <td><span class="status-pill <?= $p['is_active'] ? 'status-published' : 'status-draft' ?>"><?= $p['is_active'] ? 'active' : 'hidden' ?></span></td>
            <td class="table-actions">
              <a href="products.php?edit=<?= $p['id'] ?>">កែសម្រួល</a>
              <a href="products.php?toggle=<?= $p['id'] ?>"><?= $p['is_active'] ? 'Hide' : 'Show' ?></a>
              <a href="products.php?delete=<?= $p['id'] ?>" onclick="return confirm('Delete this product? This will fail if it has existing orders.')">លុប</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>
