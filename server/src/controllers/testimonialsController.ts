import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getTestimonials = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM testimonials WHERE is_approved = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
};

export const getPendingTestimonials = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM testimonials WHERE is_approved = false ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending testimonials' });
  }
};

export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const { member_name, message, rating } = req.body;
    const result = await query(
      'INSERT INTO testimonials (member_name, message, rating) VALUES ($1, $2, $3) RETURNING *',
      [member_name, message, rating]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
};

export const approveTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE testimonials SET is_approved = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve testimonial' });
  }
};
