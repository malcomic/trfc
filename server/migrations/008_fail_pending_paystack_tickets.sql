-- Mark abandoned Paystack ticket checkouts as failed after M-Pesa migration.
-- Paid tickets are left unchanged.
UPDATE tickets
SET payment_status = 'failed'
WHERE payment_provider = 'paystack'
  AND payment_status = 'pending';
