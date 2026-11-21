import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import { db } from '../db.ts';
import {
  clearAuthCookie,
  issueSessionToken,
  recordAudit,
  requireAuth,
  revokeSession,
  setAuthCookie,
  type UserRole,
} from '../auth.ts';

const router = Router();

router.get('/bootstrap-status', (_req, res) => {
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name = 'ADMIN'
  `).get() as { count: number };

  res.json({
    needsSetup: row.count === 0,
    envControlled: Boolean(process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim()),
  });
});

router.post('/bootstrap', (req, res) => {
  if (process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim()) {
    return res.status(403).json({ error: 'Admin account is controlled by environment configuration.' });
  }

  const existing = db.prepare(`
    SELECT COUNT(*) as count
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name = 'ADMIN'
  `).get() as { count: number };

  if (existing.count > 0) {
    return res.status(403).json({ error: 'Admin account has already been claimed. Please sign in.' });
  }

  const full_name = String(req.body?.full_name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();
  const password = String(req.body?.password || '');

  if (!full_name || !email || !email.includes('@') || password.length < 8) {
    return res.status(400).json({ error: 'Valid full name, email, and a password of at least 8 characters are required.' });
  }

  const adminRole = db.prepare(`SELECT id FROM roles WHERE name = 'ADMIN'`).get() as { id: number };
  const hash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active, is_approved)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(full_name, email, phone, hash, adminRole.id);

    const userId = Number(result.lastInsertRowid);
    const userObj = {
      id: userId,
      full_name,
      email,
      phone,
      role: 'ADMIN' as UserRole,
      doctor_id: null,
    };

    const { token } = issueSessionToken(userObj);
    const isAndroidClient = req.headers['x-client-platform'] === 'android';
    if (!isAndroidClient) {
      setAuthCookie(res, token);
    }

    recordAudit(req, 'ADMIN_BOOTSTRAP', 'USER', userId, `Initial clinic admin claimed by ${email}`, userObj);

    return res.status(201).json({
      user: userObj,
      ...(isAndroidClient ? { token } : {}),
    });
  } catch {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
});

router.post('/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const expectedRole = req.body?.expectedRole ? String(req.body.expectedRole).toUpperCase() : null;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const userRow = db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.is_active, u.is_approved, r.name as role, d.id as doctor_id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN doctors d ON d.user_id = u.id
    WHERE lower(u.email) = ?
  `).get(email) as {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    password_hash: string;
    is_active: number;
    is_approved: number;
    role: UserRole;
    doctor_id: number | null;
  } | undefined;

  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    recordAudit(req, 'LOGIN_FAILED', 'AUTH', email, 'Invalid email or password');
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (userRow.is_active !== 1 || userRow.is_approved !== 1) {
    return res.status(403).json({ error: 'Account is deactivated or pending Admin approval.' });
  }

  if (expectedRole && userRow.role !== expectedRole) {
    return res.status(403).json({ error: `This account is registered as ${userRow.role}, not ${expectedRole}.` });
  }

  const userObj = {
    id: userRow.id,
    full_name: userRow.full_name,
    email: userRow.email,
    phone: userRow.phone,
    role: userRow.role,
    doctor_id: userRow.doctor_id,
  };

  const { token } = issueSessionToken(userObj);
  const isAndroidClient = req.headers['x-client-platform'] === 'android';

  if (!isAndroidClient) {
    setAuthCookie(res, token);
  }

  recordAudit(req, 'LOGIN_SUCCESS', 'AUTH', userObj.id, `Signed in as ${userObj.role}`, userObj);

  return res.json({
    user: userObj,
    ...(isAndroidClient ? { token } : {}),
  });
});

router.post('/logout', requireAuth, (req, res) => {
  if (req.authUser?.jti) {
    revokeSession(req.authUser.jti);
    recordAudit(req, 'LOGOUT', 'AUTH', req.authUser.id, 'User signed out');
  }
  clearAuthCookie(res);
  return res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  const settingsRows = db.prepare(`SELECT key, value FROM clinic_settings`).all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }
  settings.registration_fee = '0';

  return res.json({
    user: req.authUser,
    clinicSettings: settings,
  });
});

router.post('/change-password', requireAuth, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!currentPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Current password and a new password (min 8 chars) are required.' });
  }

  const userRow = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.authUser!.id) as { password_hash: string } | undefined;
  if (!userRow || !bcrypt.compareSync(currentPassword, userRow.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(newHash, req.authUser!.id);
  db.prepare(`UPDATE sessions SET revoked = 1 WHERE user_id = ? AND token_jti != ?`).run(req.authUser!.id, req.authUser!.jti);

  recordAudit(req, 'PASSWORD_CHANGED', 'USER', req.authUser!.id, 'User changed own password');
  return res.json({ success: true, message: 'Password updated successfully.' });
});

router.post('/forgot-password', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = db.prepare(`SELECT id, full_name FROM users WHERE lower(email) = ? AND is_active = 1`).get(email) as { id: number; full_name: string } | undefined;
  if (user) {
    const expiresAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    db.prepare(`UPDATE password_reset_requests SET status = 'Expired' WHERE user_id = ? AND status IN ('Pending', 'CodeIssued')`).run(user.id);
    db.prepare(`
      INSERT INTO password_reset_requests (user_id, token_hash, status, expires_at)
      VALUES (?, '', 'Pending', ?)
    `).run(user.id, expiresAt);
    recordAudit(req, 'PASSWORD_RESET_REQUESTED', 'USER', user.id, `Password reset requested for ${email}`);
  }

  return res.json({
    success: true,
    message: 'If an active staff account matches this email, a reset request has been logged for Clinic Admin verification.',
  });
});

router.post('/reset-password', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const resetCode = String(req.body?.resetCode || '').trim().toUpperCase();
  const newPassword = String(req.body?.newPassword || '');

  if (!email || !resetCode || newPassword.length < 8) {
    return res.status(400).json({ error: 'Email, valid reset code, and new password (min 8 chars) are required.' });
  }

  const user = db.prepare(`SELECT id, full_name, email FROM users WHERE lower(email) = ? AND is_active = 1`).get(email) as {
    id: number;
    full_name: string;
    email: string;
  } | undefined;

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired password reset code.' });
  }

  const reqRow = db.prepare(`
    SELECT id, token_hash, expires_at
    FROM password_reset_requests
    WHERE user_id = ? AND status = 'CodeIssued'
    ORDER BY id DESC LIMIT 1
  `).get(user.id) as { id: number; token_hash: string; expires_at: string } | undefined;

  const codeHash = crypto.createHash('sha256').update(resetCode).digest('hex');

  if (!reqRow || reqRow.token_hash !== codeHash || new Date(reqRow.expires_at).getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired password reset code.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.transaction(() => {
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(newHash, user.id);
    db.prepare(`UPDATE password_reset_requests SET status = 'Completed' WHERE id = ?`).run(reqRow.id);
    db.prepare(`UPDATE sessions SET revoked = 1 WHERE user_id = ?`).run(user.id);
  })();

  recordAudit(req, 'PASSWORD_RESET_COMPLETED', 'USER', user.id, `Password reset completed via one-time code for ${email}`);
  return res.json({ success: true, message: 'Password reset complete. You may now sign in.' });
});

export default router;
