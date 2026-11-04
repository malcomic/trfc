import { query } from '../config/db.js';
import { toKenyanMsisdn } from './phone.js';

export interface ClaimedPurchases {
  tickets: number;
  orders: number;
  medals: number;
  total: number;
}

const NONE: ClaimedPurchases = { tickets: 0, orders: 0, medals: 0, total: 0 };

// Signup does not verify email, so both email and phone must match before a purchase changes owner.
const claimSql = (table: string) => `
  UPDATE ${table}
  SET user_id = $1
  WHERE user_id IS NULL
    AND payment_status = 'paid'
    AND LOWER(TRIM(email)) = $2
    AND RIGHT(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 9) = $3`;

export async function claimGuestPurchases(
  userId: string,
  email: string | null | undefined,
  phone: string | null | undefined
): Promise<ClaimedPurchases> {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const msisdn = toKenyanMsisdn(phone);
  if (!normalizedEmail || !msisdn) return NONE;

  const params = [userId, normalizedEmail, msisdn.slice(-9)];
  const [tickets, orders, medals] = await Promise.all([
    query(claimSql('tickets'), params),
    query(claimSql('orders'), params),
    query(claimSql('medal_purchases'), params),
  ]);

  const counts = {
    tickets: tickets.rowCount ?? 0,
    orders: orders.rowCount ?? 0,
    medals: medals.rowCount ?? 0,
  };
  return { ...counts, total: counts.tickets + counts.orders + counts.medals };
}

/** Linking is a bonus; it must never fail a sign-up or sign-in. */
export async function claimGuestPurchasesSafely(
  userId: string,
  email: string | null | undefined,
  phone: string | null | undefined
): Promise<number> {
  try {
    return (await claimGuestPurchases(userId, email, phone)).total;
  } catch (error) {
    console.error(`Failed to link guest purchases for user ${userId}:`, error);
    return 0;
  }
}
