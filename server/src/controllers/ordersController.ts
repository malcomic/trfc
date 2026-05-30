import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { phonesMatch } from '../utils/phone.js';

async function fetchOrderItems(orderId: string) {
  const result = await query(
    `SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return result.rows;
}

export const getOrders = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = await Promise.all(
      result.rows.map(async (order) => ({
        ...order,
        items: await fetchOrderItems(order.id),
      }))
    );
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone : undefined;
    const userId = req.user?.id;

    const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];

    const isOwner = userId && order.user_id === userId;
    const isAdmin = req.user?.role === 'admin';
    const phoneVerified = phoneQuery && order.phone && phonesMatch(phoneQuery, order.phone);

    if (!isOwner && !isAdmin && !phoneVerified) {
      return res.json({
        id: order.id,
        status: order.payment_status,
        total: order.total_amount,
        created_at: order.created_at,
      });
    }

    const items = await fetchOrderItems(id);
    res.json({ ...order, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { items, total_amount, phone, delivery_address } = req.body;
    const userId = req.user?.id ?? null;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    if (!items?.length) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

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
      [payment_status, mpesa_receipt ?? null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const items = await fetchOrderItems(id);
    res.json({ ...result.rows[0], items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};
