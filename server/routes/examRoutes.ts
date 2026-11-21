import { Router } from 'express';
import { db } from '../db.ts';
import { recordAudit, requireAuth, requireRole } from '../auth.ts';
import { broadcastClinicEvent } from '../events.ts';

const router = Router();

function generateCheckupCode(): string {
  const year = new Date().getFullYear();
  const prefix = `CHK-${year}-`;
  const last = db.prepare(`SELECT checkup_code FROM eye_checkups WHERE checkup_code LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`) as { checkup_code: string } | undefined;
  let nextNum = 1;
  if (last?.checkup_code) {
    const parsed = parseInt(last.checkup_code.replace(prefix, ''), 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

function generatePrescriptionCode(): string {
  const year = new Date().getFullYear();
  const prefix = `RX-${year}-`;
  const last = db.prepare(`SELECT prescription_code FROM prescriptions WHERE prescription_code LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`) as { prescription_code: string } | undefined;
  let nextNum = 1;
  if (last?.prescription_code) {
    const parsed = parseInt(last.prescription_code.replace(prefix, ''), 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// Confidential Eye Examination records: restricted to DOCTOR and ADMIN only
router.get('/', requireAuth, requireRole('ADMIN', 'DOCTOR'), (req, res) => {
  const patientId = req.query.patientId ? Number(req.query.patientId) : null;
  const q = String(req.query.q || '').trim();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (patientId) {
    conditions.push(`ec.patient_id = ?`);
    params.push(patientId);
  }
  if (q) {
    conditions.push(`(p.full_name LIKE ? OR p.patient_code LIKE ? OR ec.checkup_code LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const checkups = db.prepare(`
    SELECT ec.*, p.patient_code, p.full_name as patient_name, p.age as patient_age, p.gender as patient_gender, p.mobile as patient_mobile,
           du.full_name as doctor_name, d.qualification, d.registration_no as doctor_reg_no,
           pr.id as prescription_id, pr.prescription_code, pr.lens_type, pr.frame_recommendation, pr.coating, pr.medicines_json, pr.follow_up_date
    FROM eye_checkups ec
    JOIN patients p ON ec.patient_id = p.id
    JOIN doctors d ON ec.doctor_id = d.id
    JOIN users du ON d.user_id = du.id
    LEFT JOIN prescriptions pr ON pr.checkup_id = ec.id
    ${whereSql}
    ORDER BY ec.exam_date DESC, ec.id DESC
    LIMIT 100
  `).all(...params);

  return res.json({ checkups });
});

router.post('/', requireAuth, requireRole('ADMIN', 'DOCTOR'), (req, res) => {
  const patient_id = Number(req.body?.patient_id);
  let doctor_id = req.body?.doctor_id ? Number(req.body.doctor_id) : (req.authUser!.doctor_id || null);

  if (!doctor_id && req.authUser!.role === 'ADMIN') {
    const firstDoc = db.prepare(`SELECT id FROM doctors LIMIT 1`).get() as { id: number } | undefined;
    doctor_id = firstDoc?.id || null;
  }

  if (!patient_id || !doctor_id) {
    return res.status(400).json({ error: 'Patient and assigned Doctor are required to save an eye examination.' });
  }

  const patient = db.prepare(`SELECT id, full_name FROM patients WHERE id = ?`).get(patient_id) as { id: number; full_name: string } | undefined;
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const exam_date = String(req.body?.exam_date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const appointment_id = req.body?.appointment_id ? Number(req.body.appointment_id) : null;

  const created = db.transaction(() => {
    const checkup_code = generateCheckupCode();
    const resCheckup = db.prepare(`
      INSERT INTO eye_checkups (
        checkup_code, patient_id, doctor_id, appointment_id, exam_date,
        od_sph, od_cyl, od_axis, od_add, od_prism,
        os_sph, os_cyl, os_axis, os_add, os_prism,
        visual_acuity_od, visual_acuity_os, distance_vision, near_vision,
        pd_mm, iop_od, iop_os, remarks, observations, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')
    `).run(
      checkup_code,
      patient_id,
      doctor_id,
      appointment_id,
      exam_date,
      String(req.body?.od_sph || '0.00'),
      String(req.body?.od_cyl || '0.00'),
      String(req.body?.od_axis || '000'),
      String(req.body?.od_add || '0.00'),
      String(req.body?.od_prism || ''),
      String(req.body?.os_sph || '0.00'),
      String(req.body?.os_cyl || '0.00'),
      String(req.body?.os_axis || '000'),
      String(req.body?.os_add || '0.00'),
      String(req.body?.os_prism || ''),
      String(req.body?.visual_acuity_od || '6/6'),
      String(req.body?.visual_acuity_os || '6/6'),
      String(req.body?.distance_vision || '6/6'),
      String(req.body?.near_vision || 'N6'),
      String(req.body?.pd_mm || '63'),
      String(req.body?.iop_od || ''),
      String(req.body?.iop_os || ''),
      String(req.body?.remarks || ''),
      String(req.body?.observations || '')
    );

    const checkupId = Number(resCheckup.lastInsertRowid);
    const prescription_code = generatePrescriptionCode();
    const medicinesJson = JSON.stringify(Array.isArray(req.body?.medicines) ? req.body.medicines : []);

    db.prepare(`
      INSERT INTO prescriptions (
        prescription_code, checkup_id, patient_id, doctor_id,
        lens_type, frame_recommendation, coating, medicines_json, follow_up_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      prescription_code,
      checkupId,
      patient_id,
      doctor_id,
      String(req.body?.lens_type || 'Single Vision'),
      String(req.body?.frame_recommendation || ''),
      String(req.body?.coating || 'Anti-Reflective Blue Cut'),
      medicinesJson,
      String(req.body?.follow_up_date || '')
    );

    db.prepare(`UPDATE patients SET status = 'Exam Completed', updated_at = datetime('now') WHERE id = ?`).run(patient_id);

    if (appointment_id) {
      db.prepare(`UPDATE appointments SET status = 'Completed', updated_at = datetime('now') WHERE id = ?`).run(appointment_id);
    }

    return { checkupId, checkup_code, prescription_code };
  })();

  recordAudit(req, 'EYE_EXAM_RECORDED', 'EYE_CHECKUP', created.checkup_code, `Recorded OD/OS refraction & Rx ${created.prescription_code} for ${patient.full_name}`);
  broadcastClinicEvent('exam_completed', { checkupId: created.checkupId, patientId: patient_id });

  return res.status(201).json(created);
});

router.put('/:id', requireAuth, requireRole('ADMIN', 'DOCTOR'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM eye_checkups WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Eye examination record not found.' });
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE eye_checkups SET
        od_sph = ?, od_cyl = ?, od_axis = ?, od_add = ?, od_prism = ?,
        os_sph = ?, os_cyl = ?, os_axis = ?, os_add = ?, os_prism = ?,
        visual_acuity_od = ?, visual_acuity_os = ?, distance_vision = ?, near_vision = ?,
        pd_mm = ?, iop_od = ?, iop_os = ?, remarks = ?, observations = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      String(req.body?.od_sph ?? existing.od_sph),
      String(req.body?.od_cyl ?? existing.od_cyl),
      String(req.body?.od_axis ?? existing.od_axis),
      String(req.body?.od_add ?? existing.od_add),
      String(req.body?.od_prism ?? existing.od_prism),
      String(req.body?.os_sph ?? existing.os_sph),
      String(req.body?.os_cyl ?? existing.os_cyl),
      String(req.body?.os_axis ?? existing.os_axis),
      String(req.body?.os_add ?? existing.os_add),
      String(req.body?.os_prism ?? existing.os_prism),
      String(req.body?.visual_acuity_od ?? existing.visual_acuity_od),
      String(req.body?.visual_acuity_os ?? existing.visual_acuity_os),
      String(req.body?.distance_vision ?? existing.distance_vision),
      String(req.body?.near_vision ?? existing.near_vision),
      String(req.body?.pd_mm ?? existing.pd_mm),
      String(req.body?.iop_od ?? existing.iop_od),
      String(req.body?.iop_os ?? existing.iop_os),
      String(req.body?.remarks ?? existing.remarks),
      String(req.body?.observations ?? existing.observations),
      id
    );

    const medicinesJson = JSON.stringify(Array.isArray(req.body?.medicines) ? req.body.medicines : []);
    db.prepare(`
      UPDATE prescriptions SET
        lens_type = ?, frame_recommendation = ?, coating = ?, medicines_json = ?, follow_up_date = ?
      WHERE checkup_id = ?
    `).run(
      String(req.body?.lens_type || 'Single Vision'),
      String(req.body?.frame_recommendation || ''),
      String(req.body?.coating || ''),
      medicinesJson,
      String(req.body?.follow_up_date || ''),
      id
    );
  })();

  recordAudit(req, 'EYE_EXAM_UPDATED', 'EYE_CHECKUP', String(existing.checkup_code), 'Updated eye examination and prescription');
  broadcastClinicEvent('exam_completed', { checkupId: id });

  return res.json({ success: true });
});

export default router;
