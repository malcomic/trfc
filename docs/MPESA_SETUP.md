# M-Pesa Integration Setup Guide

## Overview

This guide walks through setting up M-Pesa STK Push integration for TRFC using Safaricom's Daraja API.

## Prerequisites

- Active Safaricom business account
- Basic understanding of REST APIs
- TRFC backend running (Node.js/Express)
- Public callback URL accessible from the internet

## Step 1: Register with Safaricom Daraja

1. Visit [Safaricom Daraja Portal](https://developer.safaricom.co.ke)
2. Click "Create an Account" and fill in details:
   - Organization Name
   - Email
   - Phone
   - Password
3. Verify your email
4. Login to the portal

## Step 2: Create an Application

1. In the Daraja Portal, navigate to "My Applications"
2. Click "Create New Application"
3. Fill in:
   - Application Name: `TRFC-MVP`
   - Description: `M-Pesa STK Push for TRFC`
4. Check the following permissions:
   - ✅ STK Push (Lipa na M-Pesa Online)
   - ✅ C2B (optional, for merchant settlement)
5. Click "Create Application"

## Step 3: Get Your Credentials

After creating the application, you'll see:

- **Consumer Key**: Copy this value
- **Consumer Secret**: Copy this value
- **Shortcode**: Your business shortcode (usually a 6-digit number)
- **Passkey**: Generated for your account (important for production)

**Keep these credentials safe and never commit them to version control.**

## Step 4: Test on Sandbox

### Sandbox Credentials

For testing, you can use test credentials provided by Safaricom:

```
Environment: SANDBOX
Business Shortcode: 174379
Consumer Key: [From your app]
Consumer Secret: [From your app]
Passkey: bfb279f9aa9bdbcf158e97dd1a2c2f2f (sandbox only)
```

### Test Accounts

Safaricom provides test phone numbers:

- `254708374149` - For testing STK Push prompts
- `254707843000` - Alternative test number

## Step 5: Configure Environment Variables

Create or update `.env` in `/server`:

```bash
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd1a2c2f2f
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
MPESA_ENV=sandbox

# Other existing variables
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

## Step 6: Set Callback URL in Daraja

1. In Daraja Portal, go to your application settings
2. Find "Callback URLs" section
3. Set Callback URL to: `https://yourdomain.com/api/payments/mpesa/callback`
4. The URL must be **publicly accessible** (not localhost)

For local testing with ngrok:
```bash
ngrok http 5000
# Then use: https://[ngrok-id].ngrok.io/api/payments/mpesa/callback
```

## Step 7: Test the Integration

### Test STK Push

```bash
curl -X POST http://localhost:5000/api/payments/mpesa/stkpush \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "254708374149",
    "amount": 100,
    "orderId": "order-123"
  }'
```

Expected Response:
```json
{
  "checkoutRequestId": "ws_CO_123456789",
  "merchantRequestId": "16813-1234567-1",
  "responseCode": "0",
  "customerMessage": "Success. Request accepted for processing"
}
```

### Check Payment Status

```bash
curl -X GET http://localhost:5000/api/payments/status/ws_CO_123456789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 8: Production Deployment

### Before Going Live

1. ✅ Test with sandbox credentials
2. ✅ Verify callback URL works
3. ✅ Test error scenarios
4. ✅ Configure rate limiting
5. ✅ Enable webhook signature verification
6. ✅ Set up payment logging
7. ✅ Configure alerts for failed payments

### Production Credentials

1. Contact Safaricom support for production credentials
2. You'll receive:
   - Production Consumer Key
   - Production Consumer Secret
   - Production Shortcode
   - Production Passkey

### Update Environment

```bash
MPESA_ENV=production
MPESA_CONSUMER_KEY=prod_key
MPESA_CONSUMER_SECRET=prod_secret
MPESA_SHORTCODE=your_prod_shortcode
MPESA_PASSKEY=your_prod_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
```

### Verify Production Setup

1. Restart backend server
2. Test with small amounts (KES 1-10)
3. Monitor payment logs in `/server/logs/payments.log`
4. Verify callbacks are received
5. Check admin dashboard for completed transactions

## Troubleshooting

### Issue: "Invalid Consumer Key/Secret"

**Solution:**
- Verify credentials are correct in `.env`
- Ensure credentials match your Daraja application
- Check for extra spaces in credentials
- Restart the server after updating `.env`

### Issue: "Invalid phone number"

**Solution:**
- Phone must be in format: `254XXXXXXXXX`
- Must start with 254 (Kenya country code)
- Must have 12 digits total

### Issue: "Callback not received"

**Solution:**
- Verify callback URL is publicly accessible (test with `curl`)
- Check firewall/security group rules
- Monitor `/server/logs/payments.log` for errors
- Ensure webhook middleware validates correctly
- Check rate limiting settings

### Issue: "Timeout on STK Push"

**Solution:**
- Verify M-Pesa credentials are valid
- Check network connectivity to Safaricom API
- Monitor server logs for exact error
- Increase timeout if network is slow

## Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Validate callbacks** - Always verify HMAC-SHA256 signature
3. **Rate limit callbacks** - Prevent abuse (100 requests/minute)
4. **Log everything** - Maintain audit trail in `/logs/payments.log`
5. **Use HTTPS** - All communication must be encrypted
6. **Validate input** - Phone, amount, reference validation
7. **Idempotency** - Prevent duplicate processing with unique checkoutRequestId
8. **Error handling** - Never expose sensitive data in error messages

## Performance Tuning

- **Token caching**: Tokens are valid for 1 hour - implement caching
- **Callback processing**: Use database transactions
- **Status queries**: Poll with exponential backoff
- **Logging**: Rotate logs to prevent disk space issues

## Support

For issues:
1. Check `/server/logs/payments.log`
2. Review API responses for error codes
3. Contact Safaricom: support@safaricom.co.ke
4. Daraja docs: https://developer.safaricom.co.ke/docs
