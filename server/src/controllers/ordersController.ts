import { Request, Response } from 'express';
import { query, getClient } from '../config/db.js';
import { phonesMatch } from '../utils/phone.js';
import { getGrandTotal } from '../utils/shipping.js';
import { resolveFlashAccess } from '../utils/flashAccess.js';
import { decrementOrderStock } from '../utils/orderStock.js';
import { sendOrderConfirmationEmail } from '../utils/orderEmail.js';
import { FLASH_SOLD_UNITS_SQL } from './flashSalesController.js';
import { ProductOptionsError, resolveSelectedOptions } from '../utils/productVariants.js';

type DbClient = Awaited<ReturnType<typeof getClient>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class OrderValidationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Locks the flash sale row and returns its price after checking it is live and has stock left. */
async function lockFlashSalePrice(
  client: DbClient,
  flashSaleId: string,
  productId: string,
  productName: string,
  quantity: number
): Promise<number> {
  const saleResult = await client.query(
    `SELECT fs.*,
            (fs.is_active = true AND fs.starts_at <= NOW() AND (fs.ends_at IS NULL OR fs.ends_at > NOW())) AS is_live
     FROM flash_sales fs
     WHERE fs.id = $1
     FOR UPDATE`,
    [flashSaleId]
  );
  const sale = saleResult.rows[0];
  if (!sale || String(sale.product_id) !== String(productId)) {
    throw new OrderValidationError(400, `Flash deal not found for ${productName}`);
  }
  if (!sale.is_live) {
    throw new OrderValidationError(409, `The flash deal for ${productName} has ended`);
  }

  if (sale.quantity_limit != null) {
    const soldResult = await client.query(
      `SELECT ${FLASH_SOLD_UNITS_SQL} AS sold_units FROM flash_sales fs WHERE fs.id = $1`,
      [flashSaleId]
    );
    const remaining = Math.max(0, Number(sale.quantity_limit) - Number(soldResult.rows[0]?.sold_units ?? 0));
    if (remaining < quantity) {
      throw new OrderValidationError(
        409,
        remaining === 0
          ? `The flash deal for ${productName} is sold out`
          : `Only ${remaining} left at the flash price for ${productName}`
      );
    }
  }

  return Number(sale.sale_price);
}

async function fetchOrderItems(orderId: string) {
  const result = await query(
    `SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price,
            oi.variant_id, oi.size, oi.distance
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
  const client = await getClient();
  try {
    const { items, total_amount, phone, delivery_address } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const userId = req.user?.id ?? null;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: 'A valid email is required for your order confirmation' });
      return;
    }
    if (!items?.length) {
      res.status(400).json({ error: 'Order must contain at least one item' });
      return;
    }

    const hasFlashItems = items.some((item: { flash_sale_id?: unknown }) => Boolean(item.flash_sale_id));
    if (hasFlashItems) {
      const access = await resolveFlashAccess(req);
      if (!access) {
        res.status(403).json({ error: 'Flash deal access expired or not eligible' });
        return;
      }
    }

    await client.query('BEGIN');

    let subtotal = 0;
    const lines: {
      product_id: string;
      quantity: number;
      unit_price: number;
      flash_sale_id: string | null;
      variant_id: string | null;
      size: string | null;
      distance: string | null;
    }[] = [];
    const requestedByProduct = new Map<string, number>();
    const requestedByVariant = new Map<string, number>();
    const requestedByFlashSale = new Map<string, number>();
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new OrderValidationError(400, 'Invalid item quantity');
      }
      const productResult = await client.query(
        'SELECT id, price, stock, is_active, name, distance_options FROM products WHERE id = $1',
        [item.product_id]
      );
      if (productResult.rows.length === 0) {
        throw new OrderValidationError(400, `Product not found: ${item.product_id}`);
      }
      const product = productResult.rows[0];
      if (!product.is_active) {
        throw new OrderValidationError(400, `Product unavailable: ${product.name}`);
      }

      const variantsResult = await client.query(
        'SELECT id, size, stock FROM product_variants WHERE product_id = $1 AND is_active = true',
        [product.id]
      );
      const distanceOptions: string[] = Array.isArray(product.distance_options) ? product.distance_options : [];
      let selected;
      try {
        selected = resolveSelectedOptions(product.name, variantsResult.rows, distanceOptions, item);
      } catch (error) {
        if (error instanceof ProductOptionsError) throw new OrderValidationError(400, error.message);
        throw error;
      }

      if (selected.variant) {
        const variantTotal = (requestedByVariant.get(selected.variant.id) ?? 0) + quantity;
        requestedByVariant.set(selected.variant.id, variantTotal);
        if (Number(selected.variant.stock) < variantTotal) {
          throw new OrderValidationError(
            400,
            Number(selected.variant.stock) === 0
              ? `Size ${selected.variant.size} of ${product.name} is sold out`
              : `Only ${selected.variant.stock} left in size ${selected.variant.size} for ${product.name}`
          );
        }
      } else {
        const productTotal = (requestedByProduct.get(product.id) ?? 0) + quantity;
        requestedByProduct.set(product.id, productTotal);
        if (product.stock != null && product.stock < productTotal) {
          throw new OrderValidationError(400, `Insufficient stock for ${product.name}`);
        }
      }

      const flashSaleId = typeof item.flash_sale_id === 'string' && item.flash_sale_id ? item.flash_sale_id : null;
      let flashTotal = quantity;
      if (flashSaleId) {
        flashTotal = (requestedByFlashSale.get(flashSaleId) ?? 0) + quantity;
        requestedByFlashSale.set(flashSaleId, flashTotal);
      }
      const unitPrice = flashSaleId
        ? await lockFlashSalePrice(client, flashSaleId, product.id, product.name, flashTotal)
        : Number(product.price);

      if (Math.round(unitPrice) !== Math.round(Number(item.unit_price))) {
        throw new OrderValidationError(400, `Price mismatch for ${product.name}`);
      }
      subtotal += unitPrice * quantity;
      lines.push({
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        flash_sale_id: flashSaleId,
        variant_id: selected.variant?.id ?? null,
        size: selected.variant?.size ?? null,
        distance: selected.distance,
      });
    }

    const expectedTotal = getGrandTotal(subtotal);
    if (Math.round(Number(total_amount)) !== Math.round(expectedTotal)) {
      throw new OrderValidationError(400, `Order total must be KES ${expectedTotal}`);
    }

    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total_amount, phone, delivery_address, email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, expectedTotal, phone, delivery_address, email]
    );

    const orderId = orderResult.rows[0].id;

    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, flash_sale_id, variant_id, size, distance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orderId,
          line.product_id,
          line.quantity,
          line.unit_price,
          line.flash_sale_id,
          line.variant_id,
          line.size,
          line.distance,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof OrderValidationError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
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
    if (payment_status === 'paid') {
      await decrementOrderStock(id);
      sendOrderConfirmationEmail(id).catch((error: Error) => {
        console.error(`Error sending order confirmation email for ${id}: ${error.message}`);
      });
    }
    const items = await fetchOrderItems(id);
    res.json({ ...result.rows[0], items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};
