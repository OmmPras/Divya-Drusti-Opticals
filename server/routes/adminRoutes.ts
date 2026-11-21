import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import { recordAudit, requireAuth, requireRole } from '../auth.ts';
import { broadcastClinicEvent } from '../events.ts';

const router = Router();

// Available to all authenticated clinic staff (for appointment booking & checkup dropdowns)
router.get('/doctors', requireAuth, (_req, res) => {
  const doctors = db.prepare(`
    SELECT d.id as doctor_id, u.id as user_id, u.full_name, u.email, u.phone, u.is_active, u.is_approved,
           d.registration_no, d.specialization, d.qualification, d.consultation_fee, d.availability, d.created_at
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    ORDER BY u.full_name ASC
  `).all();

  return res.json({ doctors });
});

// Admin-only: Dashboard summary stats + doctor activities
router.get('/dashboard-stats', requireAuth, (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const totalPatients = (db.prepare(`SELECT COUNT(*) as count FROM patients`).get() as { count: number }).count;
  const todaysNewPatients = (db.prepare(`SELECT COUNT(*) as count FROM patients WHERE registration_date = ?`).get(today) as { count: number }).count;
  const totalDoctors = (db.prepare(`SELECT COUNT(*) as count FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.is_active = 1 AND u.is_approved = 1`).get() as { count: number }).count;
  const totalAppointments = (db.prepare(`SELECT COUNT(*) as count FROM appointments`).get() as { count: number }).count;
  const todaysAppointments = (db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status != 'Cancelled'`).get(today) as { count: number }).count;
  const completedCheckups = (db.prepare(`SELECT COUNT(*) as count FROM eye_checkups WHERE status = 'Completed'`).get() as { count: number }).count;
  const pendingCheckups = (db.prepare(`
    SELECT COUNT(*) as count FROM patients WHERE status IN ('Registered', 'Pending Exam')
  `).get() as { count: number }).count;

  const totalRevenue = (db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE payment_status = 'Paid'`).get() as { total: number }).total;
  const pendingBills = (db.prepare(`SELECT COUNT(*) as count FROM bills WHERE payment_status != 'Paid'`).get() as { count: number }).count;
  const lowStockCount = (db.prepare(`SELECT COUNT(*) as count FROM inventory i JOIN products p ON i.product_id = p.id WHERE p.is_active = 1 AND i.quantity_in_stock <= i.reorder_level`).get() as { count: number }).count;

  return res.json({
    stats: {
      totalPatients,
      todaysNewPatients,
      totalDoctors,
      totalAppointments,
      todaysAppointments,
      completedCheckups,
      pendingCheckups,
      totalRevenue,
      pendingBills,
      lowStockCount,
      registrationFee: 0,
    },
  });
});

// Admin-only: List all staff accounts (Doctors, Receptionists, Admins)
router.get('/staff', requireAuth, requireRole('ADMIN'), (_req, res) => {
  const staff = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.is_approved, u.created_at,
           r.name as role, d.id as doctor_id, d.registration_no, d.specialization, d.qualification, d.consultation_fee, d.availability,
           (SELECT COUNT(*) FROM patients p WHERE p.registered_by_id = u.id) as patients_registered,
           (SELECT COUNT(*) FROM eye_checkups ec WHERE ec.doctor_id = d.id) as checkups_performed
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN doctors d ON d.user_id = u.id
    ORDER BY u.created_at DESC
  `).all();

  const resetRequests = db.prepare(`
    SELECT pr.id, pr.user_id, u.full_name, u.email, r.name as role, pr.status, pr.expires_at, pr.created_at
    FROM password_reset_requests pr
    JOIN users u ON pr.user_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE pr.status IN ('Pending', 'CodeIssued')
    ORDER BY pr.created_at DESC
  `).all();

  return res.json({ staff, resetRequests });
});

// Admin-only: Create Doctor or Receptionist account
router.post('/staff', requireAuth, requireRole('ADMIN'), (req, res) => {
  const full_name = String(req.body?.full_name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();
  const password = String(req.body?.password || '');
  const roleName = String(req.body?.role || '').toUpperCase();

  if (!full_name || !email || !email.includes('@') || password.length < 8) {
    return res.status(400).json({ error: 'Valid full name, email, and password (min 8 chars) are required.' });
  }
  if (!['DOCTOR', 'RECEPTIONIST'].includes(roleName)) {
    return res.status(400).json({ error: 'Role must be DOCTOR or RECEPTIONIST.' });
  }

  const roleRow = db.prepare(`SELECT id FROM roles WHERE name = ?`).get(roleName) as { id: number } | undefined;
  if (!roleRow) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE lower(email) = ?`).get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hash = bcrypt.hashSync(password, 10);

  const userId = db.transaction(() => {
    const resUser = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active, is_approved, approved_by)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?)
    `).run(full_name, email, phone, hash, roleRow.id, req.authUser!.id);

    const newUserId = Number(resUser.lastInsertRowid);

    if (roleName === 'DOCTOR') {
      db.prepare(`
        INSERT INTO doctors (user_id, registration_no, specialization, qualification, consultation_fee, availability)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        newUserId,
        String(req.body?.registration_no || `OPT-${new Date().getFullYear()}-${newUserId}`),
        String(req.body?.specialization || 'Optometry & Clinical Refraction'),
        String(req.body?.qualification || 'B.Optom'),
        Number(req.body?.consultation_fee || 0),
        String(req.body?.availability || 'Mon-Sat, 9:30 AM - 7:30 PM')
      );
    }

    return newUserId;
  })();

  recordAudit(req, 'STAFF_CREATED', 'USER', userId, `Created ${roleName} account for ${full_name} (${email})`);
  broadcastClinicEvent('staff_updated', { userId, role: roleName });

  return res.status(201).json({ success: true, userId });
});

// Admin-only: Approve / Deactivate staff account
router.patch('/staff/:id/status', requireAuth, requireRole('ADMIN'), (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.authUser!.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own Admin account.' });
  }

  const is_active = req.body?.is_active !== undefined ? (req.body.is_active ? 1 : 0) : undefined;
  const is_approved = req.body?.is_approved !== undefined ? (req.body.is_approved ? 1 : 0) : undefined;

  const target = db.prepare(`SELECT id, full_name FROM users WHERE id = ?`).get(targetId) as { id: number; full_name: string } | undefined;
  if (!target) {
    return res.status(404).json({ error: 'Staff user not found.' });
  }

  db.transaction(() => {
    if (is_active !== undefined) {
      db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(is_active, targetId);
      if (is_active === 0) {
        db.prepare(`UPDATE sessions SET revoked = 1 WHERE user_id = ?`).run(targetId);
      }
    }
    if (is_approved !== undefined) {
      db.prepare(`UPDATE users SET is_approved = ?, approved_by = ?, updated_at = datetime('now') WHERE id = ?`).run(
        is_approved,
        req.authUser!.id,
        targetId
      );
    }
  })();

  recordAudit(req, 'STAFF_STATUS_UPDATED', 'USER', targetId, `Updated status for ${target.full_name} (active=${is_active}, approved=${is_approved})`);
  broadcastClinicEvent('staff_updated', { userId: targetId });

  return res.json({ success: true });
});

// Admin-only: Issue one-time password reset code for a staff member
router.post('/staff/:id/issue-reset-code', requireAuth, requireRole('ADMIN'), (req, res) => {
  const targetId = Number(req.params.id);
  const target = db.prepare(`SELECT id, email, full_name FROM users WHERE id = ?`).get(targetId) as {
    id: number;
    email: string;
    full_name: string;
  } | undefined;

  if (!target) {
    return res.status(404).json({ error: 'Staff member not found.' });
  }

  const rawCode = `DDO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
  const expiresAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

  db.transaction(() => {
    db.prepare(`UPDATE password_reset_requests SET status = 'Expired' WHERE user_id = ? AND status IN ('Pending', 'CodeIssued')`).run(targetId);
    db.prepare(`
      INSERT INTO password_reset_requests (user_id, token_hash, status, expires_at)
      VALUES (?, ?, 'CodeIssued', ?)
    `).run(targetId, codeHash, expiresAt);
  })();

  recordAudit(req, 'PASSWORD_RESET_CODE_ISSUED', 'USER', targetId, `Admin issued one-time reset code for ${target.email}`);

  return res.json({
    success: true,
    email: target.email,
    resetCode: rawCode,
    expiresAt,
  });
});

// Admin-only: Audit logs & doctor activity
router.get('/audit-logs', requireAuth, requireRole('ADMIN'), (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 250);
  const logs = db.prepare(`
    SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?
  `).all(limit);

  return res.json({ logs });
});

// Admin-only: Clinic reports summary
router.get('/reports', requireAuth, requireRole('ADMIN'), (_req, res) => {
  const dailyRegistrations = db.prepare(`
    SELECT registration_date as date, COUNT(*) as count
    FROM patients
    GROUP BY registration_date
    ORDER BY registration_date DESC
    LIMIT 14
  `).all();

  const doctorPerformance = db.prepare(`
    SELECT u.full_name as doctor_name, d.specialization,
           COUNT(DISTINCT ec.id) as total_checkups,
           COUNT(DISTINCT a.id) as total_appointments
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN eye_checkups ec ON ec.doctor_id = d.id
    LEFT JOIN appointments a ON a.doctor_id = d.id
    GROUP BY d.id
    ORDER BY total_checkups DESC
  `).all();

  const billingSummary = db.prepare(`
    SELECT payment_method, payment_status, COUNT(*) as invoice_count, COALESCE(SUM(total_amount), 0) as total_amount
    FROM bills
    GROUP BY payment_method, payment_status
  `).all();

  const categoryBreakdown = db.prepare(`
    SELECT p.category, COUNT(*) as product_count, COALESCE(SUM(i.quantity_in_stock), 0) as total_stock
    FROM products p
    JOIN inventory i ON i.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.category
  `).all();

  return res.json({
    dailyRegistrations,
    doctorPerformance,
    billingSummary,
    categoryBreakdown,
  });
});

// Clinic settings (read for all staff, update for Admin only)
router.get('/settings', requireAuth, (_req, res) => {
  const rows = db.prepare(`SELECT key, value FROM clinic_settings`).all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  settings.registration_fee = '0';
  return res.json({ settings });
});

router.put('/settings', requireAuth, requireRole('ADMIN'), (req, res) => {
  const allowedKeys = [
    'clinic_name',
    'clinic_tagline',
    'clinic_address',
    'clinic_phone',
    'clinic_email',
    'clinic_gstin',
    'default_gst_percent',
  ];

  const stmt = db.prepare(`
    INSERT INTO clinic_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  db.transaction(() => {
    for (const key of allowedKeys) {
      if (req.body?.[key] !== undefined) {
        stmt.run(key, String(req.body[key]).trim());
      }
    }
    // Strictly lock registration_fee to 0
    stmt.run('registration_fee', '0');
  })();

  recordAudit(req, 'SETTINGS_UPDATED', 'SETTINGS', 'clinic_settings', 'Updated clinic settings (registration_fee remains ₹0)');
  return res.json({ success: true });
});

export default router;
