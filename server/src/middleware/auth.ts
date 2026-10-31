import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';
import { query } from '../config/db.js';
import { isTokenStale } from '../utils/tokenUtils.js';

type DecodedToken = JWTPayload & { iat?: number };

/** A password change signs out every session issued before it. */
async function isSessionRevoked(decoded: DecodedToken): Promise<boolean> {
  const result = await query('SELECT password_changed_at FROM users WHERE id = $1', [decoded.id]);
  return isTokenStale(decoded.iat, result.rows[0]?.password_changed_at);
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
    if (await isSessionRevoked(decoded)) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
  } catch (error) {
    console.error('Failed to check session validity:', error);
    return res.status(500).json({ error: 'Failed to verify session' });
  }

  req.user = decoded;
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
