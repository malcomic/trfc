import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/db.js';

const USER_FIELDS = 'id, name, email, phone, role, created_at';

async function getAdminCount(): Promise<number> {
  const result = await query("SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'admin'");
  return result.rows[0].cnt;
}

async function ensureNotLastAdmin(userId: string): Promise<boolean> {
  const current = await query('SELECT role FROM users WHERE id = $1', [userId]);
  if (current.rows[0]?.role !== 'admin') return true;
  return (await getAdminCount()) > 1;
}

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { search, role } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
    }

    if (role === 'member' || role === 'admin') {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT ${USER_FIELDS} FROM users ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role = 'member' } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }

    if (!['member', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${USER_FIELDS}`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), passwordHash, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [
      email.trim().toLowerCase(),
      id,
    ]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const result = await query(
      `UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING ${USER_FIELDS}`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['member', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'member' && !(await ensureNotLastAdmin(id))) {
      return res.status(400).json({ error: 'Cannot demote the last admin user' });
    }

    const result = await query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING ${USER_FIELDS}`,
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

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    if (!(await ensureNotLastAdmin(id))) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }

    const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query('UPDATE orders SET user_id = NULL WHERE user_id = $1', [id]);
    await query('UPDATE site_typography SET updated_by = NULL WHERE updated_by = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
