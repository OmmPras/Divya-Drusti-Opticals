import { Router } from 'express';
import { db } from '../db.ts';
import { recordAudit, requireAuth, requireRole } from '../auth.ts';
import { broadcastClinicEvent } from '../events.ts';

const router = Router();

const ALLOWED_CATEGORIES = [
  'Eyeglasses',
  'Spectacle Frames',
  'Spectacle Lenses',
  'Sunglasses',
  'Contact Lenses',
  'Optical Accessories',
  'Eye Medicines',
];

router.get('/', requireAuth, (req, res) => {
  const category = String(req.query.category || '').trim();
  const q = String(req.query.q || '').trim();
  const lowStock = req.query.lowStock === 'true';

  const conditions: string[] = ['p.is_active = 1'];
  const params: unknown[] = [];

  if (category && category !== 'ALL') {
    conditions.push(`p.category = ?`);
    params.push(category);
  }
  if (q) {
    conditions.push(`(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.model_no LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (lowStock) {
    conditions.push(`i.quantity_in_stock <= i.reorder_level`);
  }

  const products = db.prepare(`
    SELECT p.*, i.quantity_in_stock, i.reorder_level, i.location, i.last_restocked_at
    FROM products p
    JOIN inventory i ON i.product_id = p.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.category ASC, p.name ASC
  `).all(...params);

  return res.json({ products, categories: ALLOWED_CATEGORIES });
});

router.post('/', requireAuth, requireRole('ADMIN'), (req, res) => {
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || '').trim();
  const sku = String(req.body?.sku || `SKU-${Date.now().toString().slice(-6)}`).trim().toUpperCase();
  const unit_price = Number(req.body?.unit_price || 0);
  const gst_percent = Number(req.body?.gst_percent ?? 12);
  const quantity_in_stock = Math.max(0, parseInt(String(req.body?.quantity_in_stock ?? 0), 10) || 0);
  const reorder_level = Math.max(0, parseInt(String(req.body?.reorder_level ?? 5), 10) || 5);

  if (!name || !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Valid product name and optical category are required.' });
  }
  if (unit_price < 0) {
    return res.status(400).json({ error: 'Unit price cannot be negative.' });
  }

  const existingSku = db.prepare(`SELECT id FROM products WHERE sku = ?`).get(sku);
  if (existingSku) {
    return res.status(409).json({ error: 'A product with this SKU already exists.' });
  }

  const is_medicine = category === 'Eye Medicines' ? 1 : 0;

  const productId = db.transaction(() => {
    const resProd = db.prepare(`
      INSERT INTO products (sku, name, category, brand, model_no, description, unit_price, gst_percent, is_medicine, expiry_date, batch_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sku,
      name,
      category,
      String(req.body?.brand || '').trim(),
      String(req.body?.model_no || '').trim(),
      String(req.body?.description || '').trim(),
      unit_price,
      gst_percent,
      is_medicine,
      String(req.body?.expiry_date || '').trim(),
      String(req.body?.batch_no || '').trim()
    );

    const newId = Number(resProd.lastInsertRowid);
    db.prepare(`
      INSERT INTO inventory (product_id, quantity_in_stock, reorder_level, location)
      VALUES (?, ?, ?, ?)
    `).run(newId, quantity_in_stock, reorder_level, String(req.body?.location || 'Main Optical Shelf').trim());

    return newId;
  })();

  recordAudit(req, 'PRODUCT_CREATED', 'PRODUCT', sku, `Added ${name} (${category}) · Price ₹${unit_price}, Stock ${quantity_in_stock}`);
  broadcastClinicEvent('inventory_updated', { productId });

  return res.status(201).json({ success: true, productId });
});

router.put('/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const category = req.body?.category ? String(req.body.category) : String(existing.category);
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid optical product category.' });
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE products SET
        name = ?, category = ?, brand = ?, model_no = ?, description = ?,
        unit_price = ?, gst_percent = ?, is_medicine = ?, expiry_date = ?, batch_no = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      String(req.body?.name ?? existing.name).trim(),
      category,
      String(req.body?.brand ?? existing.brand).trim(),
      String(req.body?.model_no ?? existing.model_no).trim(),
      String(req.body?.description ?? existing.description).trim(),
      Number(req.body?.unit_price ?? existing.unit_price),
      Number(req.body?.gst_percent ?? existing.gst_percent),
      category === 'Eye Medicines' ? 1 : 0,
      String(req.body?.expiry_date ?? existing.expiry_date).trim(),
      String(req.body?.batch_no ?? existing.batch_no).trim(),
      id
    );

    if (req.body?.quantity_in_stock !== undefined || req.body?.reorder_level !== undefined || req.body?.location !== undefined) {
      const inv = db.prepare(`SELECT * FROM inventory WHERE product_id = ?`).get(id) as Record<string, unknown>;
      db.prepare(`
        UPDATE inventory SET
          quantity_in_stock = ?, reorder_level = ?, location = ?,
          last_restocked_at = datetime('now'), updated_at = datetime('now')
        WHERE product_id = ?
      `).run(
        Math.max(0, Number(req.body?.quantity_in_stock ?? inv.quantity_in_stock)),
        Math.max(0, Number(req.body?.reorder_level ?? inv.reorder_level)),
        String(req.body?.location ?? inv.location).trim(),
        id
      );
    }
  })();

  recordAudit(req, 'PRODUCT_UPDATED', 'PRODUCT', String(existing.sku), `Updated product & inventory for ${existing.name}`);
  broadcastClinicEvent('inventory_updated', { productId: id });

  return res.json({ success: true });
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT sku, name FROM products WHERE id = ?`).get(id) as { sku: string; name: string } | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  db.prepare(`UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  recordAudit(req, 'PRODUCT_ARCHIVED', 'PRODUCT', existing.sku, `Archived product ${existing.name}`);
  broadcastClinicEvent('inventory_updated', { productId: id });

  return res.json({ success: true });
});

export default router;
