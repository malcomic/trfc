# TRFC Payment API Documentation

## Base URL

```
http://localhost:5000/api/payments
```

## Authentication

All endpoints (except `/mpesa/callback`) require JWT token in Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Initiate M-Pesa STK Push

**POST** `/mpesa/stkpush`

Initiates an M-Pesa STK Push prompt on user's phone.

#### Request

```json
{
  "phone": "254712345678",
  "amount": 1000,
  "orderId": "order-123e4567-e89b-12d3-a456-426614174000"
}
```

**Parameters:**
- `phone` (string, required): Phone number in format `254XXXXXXXXX`
- `amount` (number, required): Amount in KES (1-999999)
- `orderId` (string, optional): Order ID (use one of orderId, ticketId, or equipmentHireId)
- `ticketId` (string, optional): Ticket ID
- `equipmentHireId` (string, optional): Equipment hire ID

#### Response (Success - 200)

```json
{
  "checkoutRequestId": "ws_CO_123456789",
  "merchantRequestId": "16813-1234567-1",
  "responseCode": "0",
  "customerMessage": "Success. Request accepted for processing"
}
```

#### Response (Error - 400)

```json
{
  "error": "Invalid phone number format. Expected format: 254XXXXXXXXX"
}
```

#### Status Codes

- `200` - STK Push initiated successfully
- `400` - Validation error (invalid phone, amount, or reference)
- `401` - Unauthorized (missing/invalid token)
- `500` - Server error

---

### 2. M-Pesa Callback

**POST** `/mpesa/callback`

Webhook endpoint for M-Pesa to send payment results. **No authentication required**.

#### Request (from M-Pesa)

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "16813-1234567-1",
      "CheckoutRequestID": "ws_CO_123456789",
      "ResultCode": 0,
      "ResultDesc": "The service request has been processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 1000
          },
          {
            "Name": "MpesaReceiptNumber",
            "Value": "LHG31H5TX16"
          },
          {
            "Name": "TransactionDate",
            "Value": 20231215120000
          },
          {
            "Name": "PhoneNumber",
            "Value": 254712345678
          },
          {
            "Name": "AccountReference",
            "Value": "ORDER-123e4567-e89b-12d3-a456-426614174000"
          }
        ]
      }
    }
  }
}
```

#### Response (200)

M-Pesa expects this response:

```json
{
  "ResultCode": 0,
  "ResultDesc": "Received"
}
```

#### Security Headers

M-Pesa includes a signature header:

```
X-Mpesa-Signature: <base64_hmac_sha256>
```

This is automatically validated by the webhook middleware.

#### Result Codes

- `0` - Success (payment completed)
- `1` - Insufficient Funds
- `2` - Less than minimum transaction value
- `3` - More than maximum transaction value
- `5` - Transaction timeout
- `2001` - User cancelled the operation
- `2002` - Request timeout

---

### 3. Query Payment Status

**GET** `/status/:checkoutRequestId`

Check the current status of a payment request.

#### Request

```bash
GET /api/payments/status/ws_CO_123456789
Authorization: Bearer <jwt_token>
```

#### Response (200)

```json
{
  "ResultCode": 0,
  "ResultDesc": "The service request has been processed successfully.",
  "CheckoutRequestID": "ws_CO_123456789",
  "MerchantRequestID": "16813-1234567-1"
}
```

#### Status Codes

- `200` - Status retrieved
- `400` - Invalid checkoutRequestId
- `401` - Unauthorized
- `500` - Server error

---

### 4. Get Payment History

**GET** `/history`

Retrieve all payments for the authenticated user.

#### Request

```bash
GET /api/payments/history
Authorization: Bearer <jwt_token>
```

#### Response (200)

```json
[
  {
    "id": "order-123",
    "type": "order",
    "amount": 1000,
    "payment_status": "paid",
    "mpesa_receipt": "LHG31H5TX16",
    "checkout_request_id": "ws_CO_123456789",
    "created_at": "2024-12-15T12:00:00Z"
  },
  {
    "id": "ticket-456",
    "type": "ticket",
    "amount": null,
    "payment_status": "pending",
    "mpesa_receipt": null,
    "checkout_request_id": "ws_CO_987654321",
    "created_at": "2024-12-15T11:30:00Z"
  },
  {
    "id": "hire-789",
    "type": "equipment_hire",
    "amount": 2500,
    "payment_status": "paid",
    "mpesa_receipt": "LHG31H5TX17",
    "checkout_request_id": "ws_CO_555555555",
    "created_at": "2024-12-14T15:00:00Z"
  }
]
```

#### Status Codes

- `200` - History retrieved
- `401` - Unauthorized
- `500` - Server error

---

## Event Ticket Endpoints

### Buy Tickets

**POST** `/api/events/:eventId/tickets`

Create event tickets (separate from payment).

#### Request

```json
{
  "quantity": 2,
  "phone": "254712345678"
}
```

#### Response

```json
{
  "ticketIds": ["ticket-1", "ticket-2"],
  "quantity": 2,
  "eventTitle": "TRFC Fitness Challenge",
  "eventDate": "2024-12-25T10:00:00Z",
  "pricePerTicket": 500,
  "totalPrice": 1000
}
```

---

## Equipment Hire Endpoints

### Available Packages

**GET** `/api/equipment/available/packages`

Get available equipment rental packages.

#### Response

```json
[
  {
    "packageType": "daily",
    "price": 500,
    "description": "Daily rate"
  },
  {
    "packageType": "weekly",
    "price": 2500,
    "description": "Weekly rate (7 days)"
  },
  {
    "packageType": "monthly",
    "price": 8000,
    "description": "Monthly rate (30 days)"
  }
]
```

### Create Equipment Hire Request

**POST** `/api/equipment/hire`

Create equipment hire request (before payment).

#### Request

```json
{
  "equipmentName": "Dumbbells Set",
  "packageType": "weekly",
  "hireDate": "2024-12-20",
  "returnDate": "2024-12-27"
}
```

#### Response

```json
{
  "id": "hire-12345",
  "equipmentName": "Dumbbells Set",
  "packageType": "weekly",
  "hireDate": "2024-12-20",
  "returnDate": "2024-12-27",
  "totalCost": 2500,
  "paymentStatus": "pending"
}
```

---

## Error Responses

### Validation Error (400)

```json
{
  "error": "Phone must be in format 254XXXXXXXXX"
}
```

### Authorization Error (401)

```json
{
  "error": "Unauthorized"
}
```

### Server Error (500)

```json
{
  "error": "Failed to initiate payment"
}
```

---

## Rate Limiting

Callback endpoint has rate limiting:
- **Limit**: 100 requests per minute per IP
- **Status Code**: 429 (Too Many Requests)

```json
{
  "ResultCode": 1,
  "ResultDesc": "Rate limit exceeded"
}
```

---

## Logging

All payment events are logged to `/server/logs/payments.log`:

- STK Push initiation (success/failure)
- Callback receipt (with signature validation)
- Callback processing (updates made)
- Payment status queries
- Errors with full context

Example log entry:

```
[2024-12-15T12:00:00Z] STK PUSH INITIATION [SUCCESS] - Phone: 254712345678, Amount: 1000, Reference: ORDER-123e4567...
{
  "phoneNumber": "254712345678",
  "amount": 1000,
  "reference": "ORDER-123e4567-e89b-12d3-a456-426614174000",
  "responseCode": "0"
}
```

---

## Integration Example

### Complete Order Payment Flow

```javascript
// 1. Create order (frontend)
const order = await createOrder({
  items: [...],
  total_amount: 1000,
  phone: "254712345678",
  delivery_address: "123 Main St"
});

// 2. Initiate payment (frontend)
const payment = await initiateSTKPush({
  phone: "254712345678",
  amount: 1000,
  orderId: order.id
});

// 3. Poll for status (frontend)
const status = await pollPaymentStatus(payment.checkoutRequestId);

// 4. M-Pesa sends callback (backend)
// POST /api/payments/mpesa/callback (automatic)
// Order status updated to "paid"

// 5. Check payment history (frontend)
const history = await getPaymentHistory();
// Shows completed payment with receipt
```

---

## Testing

### Test Phone Numbers

```
254708374149 - Standard test
254707843000 - Alternative test
```

### Test Amounts

- KES 1 - KES 999,999: Normal amounts
- KES 0: Invalid
- KES 1,000,000+: Invalid
