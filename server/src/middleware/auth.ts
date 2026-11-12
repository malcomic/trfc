import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';
import { query } from '../config/db.js';
import { isTokenStale } from '../utils/tokenUtils.js';
import { touchLastActive } from '../utils/lastActive.js';
import { latestMaterialChangeAt, needsConsent } from '../utils/policies.js';

type DecodedToken = JWTPayload & { iat?: number };

interface SessionState {
  revoked: boolean;
  privacyAcceptedAt: Date | null;
}

/** A password change or an account deletion signs out every session issued before it. */
async function loadSession(decoded: DecodedToken): Promise<SessionState> {
  const result = await query(
    'SELECT password_changed_at, deletion_requested_at, privacy_accepted_at FROM users WHERE id = $1',
    [decoded.id]
  );
  const row = result.rows[0];
  return {
    revoked: Boolean(row?.deletion_requested_at) || isTokenStale(decoded.iat, row?.password_changed_at),
    privacyAcceptedAt: row?.privacy_accepted_at ?? null,
  };
}

async function isSessionRevoked(decoded: DecodedToken): Promise<boolean> {
  return (await loadSession(decoded)).revoked;
}

/** Paths a member can still use before agreeing to the current terms. */
const CONSENT_EXEMPT_PREFIXES = ['/api/auth/', '/api/policies', '/api/me/privacy'];
const CONSENT_EXEMPT_ROLES = new Set(['admin', 'scanner']);

export function isConsentExempt(path: string, role: string | undefined): boolean {
  if (role && CONSENT_EXEMPT_ROLES.has(role)) return true;
  return CONSENT_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as DecodedToken;
    if (!(await isSessionRevoked(decoded))) {
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  let decoded: DecodedToken;
  try {
    const token = authHeader.replace('Bearer ', '');
    decoded = jwt.verify(token, process.env.JWT_SECRET || '') as DecodedToken;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const session = await loadSession(decoded);
    if (session.revoked) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    if (!isConsentExempt(req.originalUrl, decoded.role)) {
      const latest = await latestMaterialChangeAt();
      if (needsConsent(session.privacyAcceptedAt, latest)) {
        return res.status(428).json({
          error: 'Please agree to the updated Terms and Privacy and Confidentiality Terms to continue.',
          code: 'CONSENT_REQUIRED',
        });
      }
    }
  } catch (error) {
    console.error('Failed to check session validity:', error);
    return res.status(500).json({ error: 'Failed to verify session' });
  }

  req.user = decoded;
  void touchLastActive(decoded.id);
  next();
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const captainMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({ error: 'Captain access required' });
  }
  try {
    // Checked against the database rather than the JWT so promotions/suspensions apply immediately.
    const result = await query(
      `SELECT c.status FROM captains c JOIN users u ON u.id = c.user_id
       WHERE c.user_id = $1 AND u.role = 'captain'`,
      [req.user.id]
    );
    if (result.rows[0]?.status !== 'active') {
      return res.status(403).json({ error: 'Captain access required' });
    }
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to verify captain access' });
  }
};

/** Admins, or active captains (per-event zone checks happen in the handler). */
export const adminOrCaptainMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin') return next();
  return captainMiddleware(req, res, next);
};

export const staffMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'scanner')) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

/** Admins, gate scanners, or active captains (per-event zone checks happen in the handler). */
export const staffOrCaptainMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin' || req.user?.role === 'scanner') return next();
  return captainMiddleware(req, res, next);
};
