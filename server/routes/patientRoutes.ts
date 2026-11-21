import { Router } from 'express';
import { db } from '../db.ts';
import { recordAudit, requireAuth, requireRole } from '../auth.ts';
import { broadcastClinicEvent } from '../events.ts';

const router = Router();

function calculateAgeFromDob(dobStr: string): number {
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, Math.min(age, 125));
}

function generateNextPatientCode(): string {
  const year = new Date().getFullYear();
  const prefix = `DDO-${year}-`;
  const last = db.prepare(`
    SELECT patient_code FROM patients WHERE patient_code LIKE ? ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`) as { patient_code: string } | undefined;

  let nextNum = 1;
  if (last?.patient_code) {
    const part = last.patient_code.replace(prefix, '');
    const parsed = parseInt(part, 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

router.get('/next-code', requireAuth, (_req, res) => {
  return res.json({ nextCode: generateNextPatientCode(), registrationFee: 0 });
});

// List & search patients with pagination + date filter
router.get('/', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim();
  const dateFilter = String(req.query.dateFilter || 'all');
  const startDate = String(req.query.startDate || '').trim();
  const endDate = String(req.query.endDate || '').trim();
  const status = String(req.query.status || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(String(req.query.limit || '10'), 10) || 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    conditions.push(`(p.patient_code LIKE ? OR p.full_name LIKE ? OR p.mobile LIKE ? OR p.village LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  if (status && status !== 'ALL') {
    conditions.push(`p.status = ?`);
    params.push(status);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (dateFilter === 'today') {
    conditions.push(`p.registration_date = ?`);
    params.push(today);
  } else if (dateFilter === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
    conditions.push(`p.registration_date >= ?`);
    params.push(weekAgo);
  } else if (dateFilter === 'month') {
    const monthStart = `${today.slice(0, 7)}-01`;
    conditions.push(`p.registration_date >= ?`);
    params.push(monthStart);
  } else if (dateFilter === 'custom' && startDate && endDate) {
    conditions.push(`p.registration_date BETWEEN ? AND ?`);
    params.push(startDate, endDate);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRow = db.prepare(`
    SELECT COUNT(*) as total FROM patients p ${whereSql}
  `).get(...params) as { total: number };

  const patients = db.prepare(`
    SELECT p.id, p.patient_code, p.full_name, p.dob, p.age, p.gender, p.mobile, p.alt_phone,
           p.address, p.village, p.district, p.state, p.pin_code, p.photo_data,
           p.registration_fee, p.registration_date, p.status, p.created_at,
           u.full_name as registered_by_name, r.name as registered_by_role
    FROM patients p
    JOIN users u ON p.registered_by_id = u.id
    JOIN roles r ON u.role_id = r.id
    ${whereSql}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return res.json({
    patients,
    pagination: {
      page,
      limit,
      total: totalRow.total,
      totalPages: Math.max(1, Math.ceil(totalRow.total / limit)),
    },
  });
});

// Register new patient (ALWAYS FREE: registration_fee = 0)
router.post('/', requireAuth, requireRole('ADMIN', 'DOCTOR', 'RECEPTIONIST'), (req, res) => {
  const full_name = String(req.body?.full_name || '').trim();
  const dob = String(req.body?.dob || '').trim();
  const gender = String(req.body?.gender || '').trim();
  const mobile = String(req.body?.mobile || '').replace(/\s+/g, '');
  const alt_phone = String(req.body?.alt_phone || '').replace(/\s+/g, '');
  const address = String(req.body?.address || '').trim();
  const village = String(req.body?.village || '').trim();
  const district = String(req.body?.district || '').trim();
  const state = String(req.body?.state || '').trim();
  const pin_code = String(req.body?.pin_code || '').trim();
  const medical_history = String(req.body?.medical_history || '').trim();
  const consent_given = Boolean(req.body?.consent_given);
  const registration_date = String(req.body?.registration_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const photo_data = String(req.body?.photo_data || '');

  if (!full_name || full_name.length < 2) {
    return res.status(400).json({ error: 'Patient full name is required.' });
  }
  if (!dob || Number.isNaN(new Date(dob).getTime())) {
    return res.status(400).json({ error: 'Valid date of birth is required.' });
  }
  if (!['Male', 'Female', 'Other'].includes(gender)) {
    return res.status(400).json({ error: 'Gender must be Male, Female, or Other.' });
  }
  if (!/^[0-9+\-]{10,15}$/.test(mobile)) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required.' });
  }
  if (!consent_given) {
    return res.status(400).json({ error: 'Patient privacy & medical history consent is required.' });
  }
  if (photo_data) {
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(photo_data) || photo_data.length > 750000) {
      return res.status(400).json({ error: 'Photograph must be a valid PNG/JPEG/WEBP image under 500 KB.' });
    }
  }

  const age = calculateAgeFromDob(dob);

  const created = db.transaction(() => {
    const patient_code = generateNextPatientCode();
    const result = db.prepare(`
      INSERT INTO patients (
        patient_code, full_name, dob, age, gender, mobile, alt_phone,
        address, village, district, state, pin_code, photo_data,
        medical_history, consent_given, consent_timestamp,
        registration_fee, registration_date, registered_by_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), 0, ?, ?, 'Registered')
    `).run(
      patient_code,
      full_name,
      dob,
      age,
      gender,
      mobile,
      alt_phone,
      address,
      village,
      district,
      state,
      pin_code,
      photo_data,
      medical_history,
      registration_date,
      req.authUser!.id
    );

    const patientId = Number(result.lastInsertRowid);
    return db.prepare(`
      SELECT p.*, u.full_name as registered_by_name, r.name as registered_by_role
      FROM patients p
      JOIN users u ON p.registered_by_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE p.id = ?
    `).get(patientId) as Record<string, unknown>;
  })();

  recordAudit(
    req,
    'PATIENT_REGISTERED_FREE',
    'PATIENT',
    String(created.patient_code),
    `Free registration (₹0) completed by ${req.authUser!.full_name} (${req.authUser!.role})`
  );

  // Notify all connected dashboards (Admin Home Dashboard, Doctor Patient List) immediately
  broadcastClinicEvent('patient_registered', {
    patientId: created.id,
    patientCode: created.patient_code,
    fullName: created.full_name,
    registeredBy: req.authUser!.full_name,
    registeredByRole: req.authUser!.role,
  });

  return res.status(201).json({
    patient: created,
    message: `Patient ${created.full_name} registered successfully (ID: ${created.patient_code}) · Registration Fee: ₹0`,
  });
});

// View single patient details (confidential medical records restricted for Receptionist)
router.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const patient = db.prepare(`
    SELECT p.*, u.full_name as registered_by_name, r.name as registered_by_role
    FROM patients p
    JOIN users u ON p.registered_by_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE p.id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!patient) {
    return res.status(404).json({ error: 'Patient record not found.' });
  }

  const appointments = db.prepare(`
    SELECT a.*, du.full_name as doctor_name, d.specialization
    FROM appointments a
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users du ON d.user_id = du.id
    WHERE a.patient_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `).all(id);

  const bills = db.prepare(`
    SELECT b.*, u.full_name as created_by_name
    FROM bills b
    JOIN users u ON b.created_by_id = u.id
    WHERE b.patient_id = ?
    ORDER BY b.id DESC
  `).all(id);

  // Enforce medical confidentiality: Receptionists do not receive clinical eye checkups, prescriptions, or medical history notes
  const isClinicalAuthorized = req.authUser!.role === 'ADMIN' || req.authUser!.role === 'DOCTOR';

  let eyeCheckups: unknown[] = [];
  let prescriptions: unknown[] = [];

  if (isClinicalAuthorized) {
    eyeCheckups = db.prepare(`
      SELECT ec.*, du.full_name as doctor_name, d.qualification
      FROM eye_checkups ec
      JOIN doctors d ON ec.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE ec.patient_id = ?
      ORDER BY ec.exam_date DESC, ec.id DESC
    `).all(id);

    prescriptions = db.prepare(`
      SELECT pr.*, du.full_name as doctor_name
      FROM prescriptions pr
      JOIN doctors d ON pr.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE pr.patient_id = ?
      ORDER BY pr.id DESC
    `).all(id);
  } else {
    patient.medical_history = '[Confidential clinical notes restricted to Doctor/Admin]';
  }

  return res.json({
    patient,
    appointments,
    bills,
    eyeCheckups,
    prescriptions,
    clinicalAccessGranted: isClinicalAuthorized,
  });
});

export default router;
