import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['member', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, phone, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};
