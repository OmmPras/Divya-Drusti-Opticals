import { Router } from 'express';
import { db } from '../db.ts';
import { recordAudit, requireAuth, requireRole } from '../auth.ts';
import { broadcastClinicEvent } from '../events.ts';

const router = Router();

function generateInvoiceNo(): string {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = db.prepare(`SELECT invoice_no FROM bills WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`) as { invoice_no: string } | undefined;
  let nextNum = 1;
  if (last?.invoice_no) {
    const parsed = parseInt(last.invoice_no.replace(prefix, ''), 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

interface BillItemInput {
  product_id?: number | null;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
}

router.get('/', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '').trim();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status && status !== 'ALL') {
    conditions.push(`b.payment_status = ?`);
    params.push(status);
  }
  if (q) {
    conditions.push(`(b.invoice_no LIKE ? OR p.full_name LIKE ? OR p.patient_code LIKE ? OR p.mobile LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const bills = db.prepare(`
    SELECT b.*, p.patient_code, p.full_name as patient_name, p.mobile as patient_mobile, p.address as patient_address,
           u.full_name as created_by_name
    FROM bills b
    JOIN patients p ON b.patient_id = p.id
    JOIN users u ON b.created_by_id = u.id
    ${whereSql}
    ORDER BY b.id DESC
    LIMIT 150
  `).all(...params);

  return res.json({ bills });
});

router.post('/', requireAuth, requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'), (req, res) => {
  const patient_id = Number(req.body?.patient_id);
  const checkup_id = req.body?.checkup_id ? Number(req.body.checkup_id) : null;
  const items = Array.isArray(req.body?.items) ? (req.body.items as BillItemInput[]) : [];
  const discount_amount = Math.max(0, Number(req.body?.discount_amount || 0));
  const gst_percent = Math.max(0, Math.min(28, Number(req.body?.gst_percent ?? 12)));
  const payment_method = String(req.body?.payment_method || 'Cash');
  const payment_status = String(req.body?.payment_status || 'Paid');
  const notes = String(req.body?.notes || '').trim();

  if (!patient_id || items.length === 0) {
    return res.status(400).json({ error: 'Patient and at least one billable service or optical product are required.' });
  }
  if (!['Cash', 'UPI', 'Card', 'NetBanking', 'Pending'].includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }
  if (!['Paid', 'Pending', 'Partial'].includes(payment_status)) {
    return res.status(400).json({ error: 'Invalid payment status.' });
  }

  const patient = db.prepare(`SELECT id, full_name FROM patients WHERE id = ?`).get(patient_id) as { id: number; full_name: string } | undefined;
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  try {
    const createdBill = db.transaction(() => {
      let exam_charge = 0;
      let frame_charge = 0;
      let lens_charge = 0;
      let medicine_charge = 0;
      let accessory_charge = 0;
      const normalizedItems: Array<BillItemInput & { line_total: number }> = [];

      for (const rawItem of items) {
        const qty = Math.max(1, parseInt(String(rawItem.quantity || 1), 10) || 1);
        let unitPrice = Math.max(0, Number(rawItem.unit_price || 0));
        let desc = String(rawItem.description || '').trim();
        let cat = String(rawItem.category || 'Optical Accessories');

        if (rawItem.product_id) {
          const prod = db.prepare(`
            SELECT p.*, i.quantity_in_stock
            FROM products p
            JOIN inventory i ON i.product_id = p.id
            WHERE p.id = ? AND p.is_active = 1
          `).get(Number(rawItem.product_id)) as {
            id: number;
            name: string;
            category: string;
            unit_price: number;
            quantity_in_stock: number;
          } | undefined;

          if (!prod) {
            throw new Error(`Selected product #${rawItem.product_id} is unavailable.`);
          }
          if (prod.quantity_in_stock < qty) {
            throw new Error(`Insufficient stock for ${prod.name} (Available: ${prod.quantity_in_stock}).`);
          }

          unitPrice = prod.unit_price;
          desc = prod.name;
          cat = prod.category;

          db.prepare(`
            UPDATE inventory SET quantity_in_stock = quantity_in_stock - ?, updated_at = datetime('now') WHERE product_id = ?
          `).run(qty, prod.id);
        }

        const lineTotal = Number((qty * unitPrice).toFixed(2));
        normalizedItems.push({
          product_id: rawItem.product_id || null,
          description: desc,
          category: cat,
          quantity: qty,
          unit_price: unitPrice,
          line_total: lineTotal,
        });

        if (cat === 'Eye Examination') exam_charge += lineTotal;
        else if (cat === 'Spectacle Frames' || cat === 'Eyeglasses' || cat === 'Sunglasses') frame_charge += lineTotal;
        else if (cat === 'Spectacle Lenses' || cat === 'Contact Lenses') lens_charge += lineTotal;
        else if (cat === 'Eye Medicines') medicine_charge += lineTotal;
        else accessory_charge += lineTotal;
      }

      const subtotal = Number((exam_charge + frame_charge + lens_charge + medicine_charge + accessory_charge).toFixed(2));
      const taxableAmount = Math.max(0, subtotal - discount_amount);
      const gst_amount = Number(((taxableAmount * gst_percent) / 100).toFixed(2));
      const total_amount = Number((taxableAmount + gst_amount).toFixed(2));

      const invoice_no = generateInvoiceNo();
      const resBill = db.prepare(`
        INSERT INTO bills (
          invoice_no, patient_id, checkup_id, exam_charge, frame_charge, lens_charge,
          medicine_charge, accessory_charge, subtotal, discount_amount, gst_percent,
          gst_amount, total_amount, payment_method, payment_status, items_json, notes, created_by_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoice_no,
        patient_id,
        checkup_id,
        exam_charge,
        frame_charge,
        lens_charge,
        medicine_charge,
        accessory_charge,
        subtotal,
        discount_amount,
        gst_percent,
        gst_amount,
        total_amount,
        payment_method,
        payment_status,
        JSON.stringify(normalizedItems),
        notes,
        req.authUser!.id
      );

      const billId = Number(resBill.lastInsertRowid);

      if (payment_status === 'Paid' && payment_method !== 'Pending') {
        db.prepare(`
          INSERT INTO payments (bill_id, amount, method, reference_no, recorded_by_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(billId, total_amount, payment_method, String(req.body?.reference_no || ''), req.authUser!.id);
      }

      if (frame_charge > 0 || lens_charge > 0) {
        db.prepare(`UPDATE patients SET status = 'In Lab', updated_at = datetime('now') WHERE id = ?`).run(patient_id);
      }

      return db.prepare(`
        SELECT b.*, p.patient_code, p.full_name as patient_name, p.mobile as patient_mobile, p.address as patient_address,
               u.full_name as created_by_name
        FROM bills b
        JOIN patients p ON b.patient_id = p.id
        JOIN users u ON b.created_by_id = u.id
        WHERE b.id = ?
      `).get(billId) as Record<string, unknown>;
    })();

    recordAudit(req, 'INVOICE_GENERATED', 'BILL', String(createdBill.invoice_no), `Generated invoice ₹${createdBill.total_amount} for ${patient.full_name} (Registration ₹0)`);
    broadcastClinicEvent('bill_created', { billId: createdBill.id, invoiceNo: createdBill.invoice_no });

    return res.status(201).json({ bill: createdBill });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to generate invoice.' });
  }
});

router.patch('/:id/pay', requireAuth, requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR'), (req, res) => {
  const id = Number(req.params.id);
  const method = String(req.body?.method || 'Cash');
  const reference_no = String(req.body?.reference_no || '').trim();

  if (!['Cash', 'UPI', 'Card', 'NetBanking'].includes(method)) {
    return res.status(400).json({ error: 'Valid payment method is required.' });
  }

  const bill = db.prepare(`SELECT * FROM bills WHERE id = ?`).get(id) as { id: number; invoice_no: string; total_amount: number; payment_status: string } | undefined;
  if (!bill) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }
  if (bill.payment_status === 'Paid') {
    return res.status(400).json({ error: 'Invoice is already marked as Paid.' });
  }

  db.transaction(() => {
    db.prepare(`UPDATE bills SET payment_status = 'Paid', payment_method = ? WHERE id = ?`).run(method, id);
    db.prepare(`INSERT INTO payments (bill_id, amount, method, reference_no, recorded_by_id) VALUES (?, ?, ?, ?, ?)`).run(
      id,
      bill.total_amount,
      method,
      reference_no,
      req.authUser!.id
    );
  })();

  recordAudit(req, 'INVOICE_PAID', 'BILL', bill.invoice_no, `Marked Paid via ${method}`);
  broadcastClinicEvent('bill_created', { billId: id });

  return res.json({ success: true });
});

export default router;
