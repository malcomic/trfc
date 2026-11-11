import { Request, Response } from 'express';
import { query, getClient } from '../config/db.js';
import { phonesMatch } from '../utils/phone.js';
import { getGrandTotal } from '../utils/shipping.js';
import { resolveFlashAccess } from '../utils/flashAccess.js';
import { decrementOrderStock } from '../utils/orderStock.js';
import { sendOrderConfirmationEmail } from '../utils/orderEmail.js';
import { recordCaptainCommission, reverseCaptainCommission } from '../utils/captainCommissions.js';
import { FLASH_SOLD_UNITS_SQL } from './flashSalesController.js';
import { productInZoneSql } from '../utils/zones.js';
import { ProductOptionsError, resolveSelectedOptions } from '../utils/productVariants.js';
import { nextDeliveryWednesday } from '../utils/ticketRules.js';
import { memberDiscountFor, shopDiscountStatus } from '../utils/memberShopDiscount.js';
import { generateReceiptQRCodeDataUrl, receiptVerifyUrl, verifyReceiptSignature } from '../utils/qrCodeGenerator.js';
import {
  loadOrderReceipt,
  publicReceiptView,
  receiptFilename,
  renderOrderReceiptPDF,
} from '../utils/orderReceipt.js';

type DbClient = Awaited<ReturnType<typeof getClient>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Order owner, an admin, or someone who knows the checkout phone number. */
export function canViewOrder(
  req: Request,
  order: { user_id?: string | null; phone?: string | null },
  phoneQuery?: string
): boolean {
  const userId = req.user?.id;
  if (userId && order.user_id === userId) return true;
  if (req.user?.role === 'admin') return true;
  return Boolean(phoneQuery && order.phone && phonesMatch(phoneQuery, order.phone));
}

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
  quantity: number,
  zoneId: string | null
): Promise<number> {
  const saleResult = await client.query(
    `SELECT fs.*,
            (fs.is_active = true AND fs.starts_at <= NOW() AND (fs.ends_at IS NULL OR fs.ends_at > NOW())) AS is_live,
            ${productInZoneSql('p', '$2')} AS in_zone
     FROM flash_sales fs
     JOIN products p ON p.id = fs.product_id
     WHERE fs.id = $1
     FOR UPDATE OF fs`,
    [flashSaleId, zoneId]
  );
  const sale = saleResult.rows[0];
  if (!sale || String(sale.product_id) !== String(productId)) {
    throw new OrderValidationError(400, `Flash deal not found for ${productName}`);
  }
  if (!sale.in_zone) {
    throw new OrderValidationError(403, `The flash deal for ${productName} is not available in your zone`);
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
    const result = await query(
      `SELECT *, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date FROM orders ORDER BY created_at DESC`
    );
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

    const result = await query(
      `SELECT *, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date FROM orders WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = result.rows[0];

    if (!canViewOrder(req, order, phoneQuery)) {
      return res.json({
        id: order.id,
        status: order.payment_status,
        total: order.total_amount,
        created_at: order.created_at,
        delivery_date: order.delivery_date,
      });
    }

    const items = await fetchOrderItems(id);
    const receipt =
      order.payment_status === 'paid'
        ? { receipt_qr: await generateReceiptQRCodeDataUrl(order.id), receipt_url: receiptVerifyUrl(order.id) }
        : {};
    res.json({ ...order, items, ...receipt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const downloadOrderReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone : undefined;

    const receipt = UUID_PATTERN.test(id) ? await loadOrderReceipt(id) : null;
    if (!receipt) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!canViewOrder(req, receipt.order, phoneQuery)) {
      return res.status(403).json({ error: 'Not allowed to view this receipt' });
    }
    if (receipt.order.payment_status !== 'paid') {
      return res.status(409).json({ error: 'A receipt is available once payment is confirmed' });
    }

    const pdf = await renderOrderReceiptPDF(receipt);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receiptFilename(receipt.receiptNumber)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(pdf);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
};

export const verifyOrderReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id) || !verifyReceiptSignature(id, req.query.t)) {
      return res.status(404).json({ valid: false, error: 'Receipt not recognised' });
    }
    const receipt = await loadOrderReceipt(id);
    if (!receipt) {
      return res.status(404).json({ valid: false, error: 'Receipt not recognised' });
    }
    res.json({ valid: receipt.order.payment_status === 'paid', receipt: publicReceiptView(receipt) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify receipt' });
  }
};

/** Delivery date an order placed now would get (Wednesdays only, Tuesday 8 pm cutoff). */
export const getDeliveryDatePreview = async (_req: Request, res: Response) => {
  try {
    res.json({ delivery_date: nextDeliveryWednesday(new Date()) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to work out the delivery date' });
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
    let flashZoneId: string | null = null;
    let flashRedemptionId: string | null = null;
    if (hasFlashItems) {
      const access = await resolveFlashAccess(req);
      if (!access) {
        res.status(403).json({ error: 'Flash deal access expired or not eligible' });
        return;
      }
      flashZoneId = access.zoneId;
      if (access.guest) {
        if (!phonesMatch(String(phone), access.guest.phone) || email !== access.guest.email) {
          res.status(403).json({ error: 'Use the phone and email you entered when unlocking this deal' });
          return;
        }
        flashRedemptionId = access.guest.redemptionId;
      }
    }

    await client.query('BEGIN');

    if (flashRedemptionId) {
      await client.query('SELECT id FROM flash_share_redemptions WHERE id = $1 FOR UPDATE', [flashRedemptionId]);
      const used = await client.query(
        `SELECT 1 FROM orders
         WHERE flash_share_redemption_id = $1
           AND (
             payment_status = 'paid'
             OR (payment_status = 'pending' AND created_at > NOW() - INTERVAL '15 minutes')
           )
         LIMIT 1`,
        [flashRedemptionId]
      );
      if (used.rows.length > 0) {
        throw new OrderValidationError(409, 'This flash deal link has already been used for an order');
      }
    }

    let subtotal = 0;
    let eligibleSubtotal = 0;
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
        `SELECT p.id, p.price, p.stock, p.is_active, p.name, p.distance_options, p.member_discount_eligible
         FROM products p
         WHERE p.id = $1`,
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
        ? await lockFlashSalePrice(client, flashSaleId, product.id, product.name, flashTotal, flashZoneId)
        : Number(product.price);

      if (Math.round(unitPrice) !== Math.round(Number(item.unit_price))) {
        throw new OrderValidationError(400, `Price mismatch for ${product.name}`);
      }
      subtotal += unitPrice * quantity;
      if (product.member_discount_eligible && !flashSaleId) eligibleSubtotal += unitPrice * quantity;
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

    let memberDiscount = 0;
    let discountMembershipId: string | null = null;
    if (req.body.member_discount === true) {
      if (!userId) throw new OrderValidationError(401, 'Log in to use your member discount');
      if (eligibleSubtotal <= 0) {
        throw new OrderValidationError(400, 'None of these items have the member discount');
      }
      const discount = await shopDiscountStatus(client, userId, true);
      if (!discount.membershipId) {
        throw new OrderValidationError(403, 'The member discount is for paid TRFC members');
      }
      if (!discount.available) {
        throw new OrderValidationError(409, 'You have already used your member discount this membership year');
      }
      memberDiscount = memberDiscountFor(eligibleSubtotal, discount.amount);
      discountMembershipId = discount.membershipId;
    }

    const expectedTotal = getGrandTotal(subtotal) - memberDiscount;
    if (Math.round(Number(total_amount)) !== Math.round(expectedTotal)) {
      throw new OrderValidationError(400, `Order total must be KES ${expectedTotal}`);
    }

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, phone, delivery_address, email, flash_share_redemption_id, delivery_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date`,
      [userId, expectedTotal, phone, delivery_address, email, flashRedemptionId, nextDeliveryWednesday(new Date())]
    );
    if (discountMembershipId) {
      await client.query(
        'UPDATE orders SET member_discount_amount = $2, member_discount_membership_id = $3 WHERE id = $1',
        [orderResult.rows[0].id, memberDiscount, discountMembershipId]
      );
      orderResult.rows[0].member_discount_amount = memberDiscount;
      orderResult.rows[0].member_discount_membership_id = discountMembershipId;
    }

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
      await recordCaptainCommission('order', id, { reinstate: true });
      sendOrderConfirmationEmail(id).catch((error: Error) => {
        console.error(`Error sending order confirmation email for ${id}: ${error.message}`);
      });
    } else {
      await reverseCaptainCommission('order', id);
    }
    const items = await fetchOrderItems(id);
    res.json({ ...result.rows[0], items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};
