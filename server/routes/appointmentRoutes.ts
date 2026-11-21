import { Router } from 'express';
import { db } from '../db.ts';
import { recordAudit, requireAuth, requireRole } from '../auth.ts';
import { broadcastClinicEvent } from '../events.ts';

const router = Router();

function generateAppointmentCode(): string {
  const year = new Date().getFullYear();
  const prefix = `APT-${year}-`;
  const last = db.prepare(`SELECT appointment_code FROM appointments WHERE appointment_code LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`) as { appointment_code: string } | undefined;
  let nextNum = 1;
  if (last?.appointment_code) {
    const parsed = parseInt(last.appointment_code.replace(prefix, ''), 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

router.get('/', requireAuth, (req, res) => {
  const date = String(req.query.date || '').trim();
  const status = String(req.query.status || '').trim();
  const doctorId = req.query.doctorId ? Number(req.query.doctorId) : null;
  const q = String(req.query.q || '').trim();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (date) {
    conditions.push(`a.appointment_date = ?`);
    params.push(date);
  }
  if (status && status !== 'ALL') {
    conditions.push(`a.status = ?`);
    params.push(status);
  }
  if (doctorId) {
    conditions.push(`a.doctor_id = ?`);
    params.push(doctorId);
  } else if (req.authUser!.role === 'DOCTOR' && req.authUser!.doctor_id && req.query.scope === 'mine') {
    conditions.push(`a.doctor_id = ?`);
    params.push(req.authUser!.doctor_id);
  }
  if (q) {
    conditions.push(`(p.full_name LIKE ? OR p.patient_code LIKE ? OR p.mobile LIKE ? OR a.appointment_code LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const appointments = db.prepare(`
    SELECT a.*, p.patient_code, p.full_name as patient_name, p.mobile as patient_mobile, p.age as patient_age, p.gender as patient_gender,
           du.full_name as doctor_name, d.specialization, u.full_name as created_by_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users du ON d.user_id = du.id
    JOIN users u ON a.created_by_id = u.id
    ${whereSql}
    ORDER BY a.appointment_date DESC, a.appointment_time ASC
    LIMIT 150
  `).all(...params);

  return res.json({ appointments });
});

router.post('/', requireAuth, requireRole('ADMIN', 'DOCTOR', 'RECEPTIONIST'), (req, res) => {
  const patient_id = Number(req.body?.patient_id);
  const doctor_id = Number(req.body?.doctor_id);
  const appointment_date = String(req.body?.appointment_date || '').trim();
  const appointment_time = String(req.body?.appointment_time || '').trim();
  const reason = String(req.body?.reason || 'Routine Eye Examination').trim();
  const notes = String(req.body?.notes || '').trim();

  if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Patient, doctor, date, and time are required.' });
  }

  const patient = db.prepare(`SELECT id, full_name, status FROM patients WHERE id = ?`).get(patient_id) as { id: number; full_name: string; status: string } | undefined;
  const doctor = db.prepare(`SELECT id FROM doctors WHERE id = ?`).get(doctor_id) as { id: number } | undefined;
  if (!patient || !doctor) {
    return res.status(404).json({ error: 'Selected patient or doctor does not exist.' });
  }

  const created = db.transaction(() => {
    const code = generateAppointmentCode();
    const resIns = db.prepare(`
      INSERT INTO appointments (appointment_code, patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes, created_by_id)
      VALUES (?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?)
    `).run(code, patient_id, doctor_id, appointment_date, appointment_time, reason, notes, req.authUser!.id);

    if (patient.status === 'Registered') {
      db.prepare(`UPDATE patients SET status = 'Pending Exam', updated_at = datetime('now') WHERE id = ?`).run(patient_id);
    }

    return db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(resIns.lastInsertRowid) as Record<string, unknown>;
  })();

  recordAudit(req, 'APPOINTMENT_BOOKED', 'APPOINTMENT', String(created.appointment_code), `Booked for ${patient.full_name} on ${appointment_date} at ${appointment_time}`);
  broadcastClinicEvent('appointment_updated', { appointmentId: created.id });

  return res.status(201).json({ appointment: created });
});

router.patch('/:id', requireAuth, requireRole('ADMIN', 'DOCTOR', 'RECEPTIONIST'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Appointment not found.' });
  }

  const status = req.body?.status ? String(req.body.status) : String(existing.status);
  const appointment_date = req.body?.appointment_date ? String(req.body.appointment_date) : String(existing.appointment_date);
  const appointment_time = req.body?.appointment_time ? String(req.body.appointment_time) : String(existing.appointment_time);
  const doctor_id = req.body?.doctor_id ? Number(req.body.doctor_id) : Number(existing.doctor_id);
  const notes = req.body?.notes !== undefined ? String(req.body.notes) : String(existing.notes || '');

  const allowedStatuses = ['Scheduled', 'In Consultation', 'Completed', 'Cancelled', 'Rescheduled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid appointment status.' });
  }

  db.prepare(`
    UPDATE appointments
    SET status = ?, appointment_date = ?, appointment_time = ?, doctor_id = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, appointment_date, appointment_time, doctor_id, notes, id);

  recordAudit(req, 'APPOINTMENT_UPDATED', 'APPOINTMENT', String(existing.appointment_code), `Status -> ${status}, Date -> ${appointment_date} ${appointment_time}`);
  broadcastClinicEvent('appointment_updated', { appointmentId: id, status });

  return res.json({ success: true });
});

export default router;
