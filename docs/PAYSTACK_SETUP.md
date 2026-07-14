# Paystack Setup (Event Tickets)

## Overview

Event ticket purchases use **Paystack Inline** (Popup V2). Shop orders and equipment hire still use M-Pesa STK Push.

Flow:

1. Create pending ticket batch (`POST /api/events/:eventId/tickets`) with **email**
2. Initialize Paystack (`POST /api/payments/paystack/initialize`)
3. Frontend opens Paystack Popup with `access_code`
4. Server verifies (`GET /api/payments/paystack/verify/:reference`) and marks tickets paid
5. Webhook `POST /api/payments/paystack/webhook` is the durable backup

## Prerequisites

- Paystack account: [https://dashboard.paystack.com](https://dashboard.paystack.com)
- TRFC server and client running
- Public webhook URL for non-local testing (e.g. ngrok)

## Step 1: Get API keys

1. Open **Settings → API Keys & Webhooks** in the Paystack dashboard
2. Copy **Test Secret Key** (`sk_test_...`) and **Test Public Key** (`pk_test_...`)
3. Switch to Live keys only after end-to-end testing

## Step 2: Configure environment

### Server (`server/.env`)

```bash
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxx
```

### Client (`client/.env`)

```bash
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxx
```

Never expose the secret key to the client.

## Step 3: Webhook URL

In the Paystack dashboard, set the webhook URL to:

```
https://your-public-host/api/payments/paystack/webhook
```

For local development:

1. Start a tunnel to the API port (e.g. `ngrok http 5000`)
2. Point the dashboard webhook at `https://<ngrok-host>/api/payments/paystack/webhook`
3. You can still complete purchases locally without the webhook — the verify endpoint marks tickets paid after Inline `onSuccess`

## Step 4: Database migration

On server start, `007_ticket_paystack` adds:

- `tickets.email`
- `tickets.payment_provider`

Or apply manually:

```bash
psql $DATABASE_URL -f server/migrations/007_ticket_paystack.sql
```

## Step 5: Test a ticket purchase

1. Open an event → Buy Tickets
2. Enter email + quantity
3. Complete Paystack Popup with a [test card](https://paystack.com/docs/payments/test-payments/)
4. Confirm redirect to ticket confirmation and that `payment_status` becomes `paid`
5. Confirm guest buyers receive the ticket email (requires `EMAIL_USER` and `EMAIL_PASSWORD` or `EMAIL_PASS`)

### Email delivery (ticket PDFs)

After a successful Paystack payment, the server sends **one confirmation email** with PDF ticket attachment(s).

On the server (and Heroku), set:

```bash
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
# EMAIL_PASS=...   # also accepted as an alias for EMAIL_PASSWORD
FRONTEND_URL=https://trfc-website-d41f18cf654e.herokuapp.com
CONTACT_EMAIL=thikaroadfitness@gmail.com
CONTACT_PHONE=+254 762 550214
```

Restart the dyno after changing config. On boot the server logs whether the email transporter verified successfully.

### Useful test cards (Paystack)

| Scenario | Card number |
|----------|-------------|
| Success | `4084084084084081` |
| Decline | `5060666666666666666` |

Use any future expiry and any CVV.

## API reference

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/payments/paystack/initialize` | Body: `{ email, amount, ticketBatchId }` → `{ accessCode, reference }` |
| `GET` | `/api/payments/paystack/verify/:reference` | Confirm success and mark tickets paid |
| `POST` | `/api/payments/paystack/webhook` | `charge.success` with `x-paystack-signature` (HMAC SHA-512) |

M-Pesa STK (`/api/payments/mpesa/stkpush`) rejects `ticketId` / `ticketBatchId`.

## Amounts

- UI and API use **KES** whole amounts
- Paystack Initialize sends **amount × 100** (kobo / subunit) with `currency: KES`

## Troubleshooting

| Issue | Check |
|-------|--------|
| Initialize 500 | `PAYSTACK_SECRET_KEY` set; amount matches batch total |
| Popup does not open | `@paystack/inline-js` installed; `accessCode` returned |
| Paid in Paystack, still pending | Call verify; confirm webhook signature / public URL |
| No ticket email | Ticket row has `email`; email SMTP env configured |
| Schema errors on buy | Restart server so migration `007_ticket_paystack` runs |
