import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM events WHERE is_active = true ORDER BY event_date ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM events WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, location, event_date, price, capacity, image_url } = req.body;
    const result = await query(
      'INSERT INTO events (title, description, location, event_date, price, capacity, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, location, event_date, price, capacity, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, location, event_date, price, capacity, image_url, is_active } = req.body;
    const result = await query(
      'UPDATE events SET title = $1, description = $2, location = $3, event_date = $4, price = $5, capacity = $6, image_url = $7, is_active = $8 WHERE id = $9 RETURNING *',
      [title, description, location, event_date, price, capacity, image_url, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
