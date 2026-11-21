import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
export const SESSION_COOKIE_NAME = 'ddo_session';
export const SESSION_TTL_HOURS = 12;

export type UserRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  doctor_id?: number | null;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function issueSessionToken(user: {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  doctor_id?: number | null;
}): { token: string; jti: string; expiresAt: string } {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (user_id, token_jti, expires_at, revoked)
    VALUES (?, ?, ?, 0)
  `).run(user.id, jti, expiresAt);

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    },
    JWT_SECRET,
    { expiresIn: `${SESSION_TTL_HOURS}h` }
  );

  return { token, jti, expiresAt };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge: SESSION_TTL_HOURS * 3600 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
  });
}

export function revokeSession(jti: string) {
  db.prepare(`UPDATE sessions SET revoked = 1 WHERE token_jti = ?`).run(jti);
}

export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && typeof req.cookies[SESSION_COOKIE_NAME] === 'string') {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  return null;
}

export function verifyCsrfForCookieMutations(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // If caller uses Bearer token (Android / native app), CSRF cookie check is not needed
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  const customHeader = req.headers['x-requested-with'];
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;

  if (customHeader === 'DivyaDrustiApp') {
    return next();
  }

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        return next();
      }
    } catch {
      // invalid origin falls through
    }
  }

  return res.status(403).json({ error: 'CSRF verification failed. Missing valid Origin or X-Requested-With header.' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as {
      sub: number;
      role: UserRole;
      jti: string;
    };
    const session = db.prepare(`
      SELECT id, revoked, expires_at FROM sessions WHERE token_jti = ? AND user_id = ?
    `).get(decoded.jti, decoded.sub) as { id: number; revoked: number; expires_at: string } | undefined;

    if (!session || session.revoked === 1 || new Date(session.expires_at).getTime() <= Date.now()) {
      return res.status(401).json({ error: 'Session expired or revoked. Please sign in again.' });
    }

    const userRow = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.is_approved, r.name as role, d.id as doctor_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN doctors d ON d.user_id = u.id
      WHERE u.id = ?
    `).get(decoded.sub) as {
      id: number;
      full_name: string;
      email: string;
      phone: string;
      is_active: number;
      is_approved: number;
      role: UserRole;
      doctor_id: number | null;
    } | undefined;

    if (!userRow || userRow.is_active !== 1 || userRow.is_approved !== 1) {
      return res.status(403).json({ error: 'Account is deactivated or awaiting Admin approval' });
    }

    req.authUser = {
      id: userRow.id,
      full_name: userRow.full_name,
      email: userRow.email,
      phone: userRow.phone,
      role: userRow.role,
      doctor_id: userRow.doctor_id,
      jti: decoded.jti,
    };

    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${allowedRoles.join(' or ')}` });
    }
    return next();
  };
}

export function recordAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId: string | number,
  details: string,
  overrideUser?: { id: number; full_name: string; role: string }
) {
  const actor = overrideUser || (req.authUser ? {
    id: req.authUser.id,
    full_name: req.authUser.full_name,
    role: req.authUser.role,
  } : null);

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

  db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    actor?.id ?? null,
    actor?.full_name ?? 'System',
    actor?.role ?? 'ANONYMOUS',
    action,
    entityType,
    String(entityId),
    details,
    ip
  );
}
