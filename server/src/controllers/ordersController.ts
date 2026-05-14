import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { items, total_amount, phone, delivery_address } = req.body;
    const userId = req.user?.id;

    const orderResult = await query(
      'INSERT INTO orders (user_id, total_amount, phone, delivery_address) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, total_amount, phone, delivery_address]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }

    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_status, mpesa_receipt } = req.body;
    const result = await query(
      'UPDATE orders SET payment_status = $1, mpesa_receipt = $2 WHERE id = $3 RETURNING *',
      [payment_status, mpesa_receipt, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};
