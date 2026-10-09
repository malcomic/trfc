import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';
import { query } from '../config/db.js';

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JWTPayload;
    req.user = decoded;
    next();
  } catch {
    next();
  }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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

export const staffMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'scanner')) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};
