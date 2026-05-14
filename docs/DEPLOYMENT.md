# TRFC Payment Integration - Deployment Guide

## Pre-Deployment Checklist

### Backend Setup
- [ ] All M-Pesa credentials obtained from Safaricom Daraja
- [ ] Database migrations applied
- [ ] Payment callbacks table created
- [ ] Webhook security middleware enabled
- [ ] Payment logging configured
- [ ] Environment variables set correctly
- [ ] Tests passing locally
- [ ] Error handling implemented

### Frontend Setup
- [ ] Order confirmation page implemented
- [ ] Ticket checkout page implemented
- [ ] Equipment hire pages implemented
- [ ] Admin orders page enhanced
- [ ] Payment API client configured
- [ ] Routes added to App.tsx
- [ ] Error handling UI implemented

### Security
- [ ] HTTPS enabled
- [ ] JWT secrets changed from defaults
- [ ] M-Pesa credentials not in version control
- [ ] Rate limiting enabled
- [ ] Callback signature validation active
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled

### Testing
- [ ] Unit tests passing
- [ ] Integration tests with M-Pesa sandbox
- [ ] All payment flows tested (orders, tickets, equipment)
- [ ] Error scenarios tested
- [ ] Duplicate callback handling verified

---

## Environment Configuration

### Development Environment

```bash
# .env (Development)
NODE_ENV=development
MPESA_ENV=sandbox
DATABASE_URL=postgresql://localhost/trfc_db
MPESA_CALLBACK_URL=https://ngrok-id.ngrok.io/api/payments/mpesa/callback
```

### Staging Environment

```bash
# .env (Staging)
NODE_ENV=staging
MPESA_ENV=sandbox
DATABASE_URL=postgresql://staging-db-host/trfc_db
MPESA_CALLBACK_URL=https://staging.yourdomain.com/api/payments/mpesa/callback
```

### Production Environment

```bash
# .env (Production)
NODE_ENV=production
MPESA_ENV=production
DATABASE_URL=postgresql://prod-db-host/trfc_db
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
MPESA_CONSUMER_KEY=[Production Key]
MPESA_CONSUMER_SECRET=[Production Secret]
MPESA_SHORTCODE=[Production Shortcode]
MPESA_PASSKEY=[Production Passkey]
```

**CRITICAL:** Never commit `.env` to version control. Use `.env.example` as template.

---

## Database Setup

### Local Development

```bash
# Create database
createdb trfc_db

# Run schema
psql trfc_db < schema.sql

# Verify tables
psql trfc_db -c "\dt"
```

### Production Deployment

```bash
# 1. Create database
createdb trfc_db

# 2. Run schema
psql trfc_db < schema.sql

# 3. Verify payment_callbacks table
psql trfc_db -c "SELECT * FROM payment_callbacks LIMIT 1;"

# 4. Create indexes
psql trfc_db -c "SELECT indexname FROM pg_indexes WHERE tablename IN ('orders', 'tickets', 'equipment_hire', 'payment_callbacks');"
```

---

## Deployment Steps

### 1. Backend Deployment

```bash
# On production server

# Clone/pull latest code
git clone <repo-url>
cd trfc/server

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Edit .env with production values

# Build (if TypeScript)
npm run build

# Run database migrations (if any)
npm run migrate

# Start server
npm start

# Or use PM2 for production
pm2 start "npm start" --name trfc-api
pm2 save
pm2 startup
```

### 2. Frontend Deployment

```bash
# On production server (or CDN)

cd trfc/client

# Install dependencies
npm install

# Update API base URL in .env or config
# VITE_API_BASE_URL=https://yourdomain.com/api

# Build for production
npm run build

# The 'dist' folder is ready to deploy
# Upload to S3, Vercel, Netlify, or web server
```

### 3. Verify Production Setup

```bash
# 1. Test API connectivity
curl https://yourdomain.com/api/health

# 2. Test M-Pesa credentials
curl -X POST https://yourdomain.com/api/payments/mpesa/stkpush \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "254712345678",
    "amount": 100,
    "orderId": "test-order-1"
  }'

# 3. Check callback endpoint is accessible
curl -X POST https://yourdomain.com/api/payments/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{"Body":{"stkCallback":{"CheckoutRequestID":"test"}}}'

# 4. Verify logs directory
ls -la /path/to/server/logs/
```

---

## Server Requirements

### Minimum Specifications

- **CPU**: 1 vCPU (2 vCPU recommended)
- **RAM**: 1 GB (2 GB recommended)
- **Storage**: 20 GB (SSD recommended)
- **OS**: Ubuntu 20.04 LTS or later

### Recommended Specifications (Production)

- **CPU**: 4 vCPU
- **RAM**: 4 GB
- **Storage**: 100 GB SSD
- **OS**: Ubuntu 20.04 LTS
- **Database**: PostgreSQL 12+
- **Node.js**: v18+

---

## SSL/HTTPS Configuration

### Using Let's Encrypt with Nginx

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify
sudo certbot certificates
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }
}
```

---

## Monitoring & Alerts

### Log Monitoring

```bash
# Monitor payment logs in real-time
tail -f /path/to/server/logs/payments.log

# Search for errors
grep "ERROR" /path/to/server/logs/payments.log

# Count payment events
grep "STK PUSH INITIATION" /path/to/server/logs/payments.log | wc -l
```

### Application Monitoring (PM2)

```bash
# Install PM2 monitoring
pm2 install pm2-auto-pull

# Monitor dashboard
pm2 monit

# View logs
pm2 logs trfc-api

# Restart on crash
pm2 start app.js --restart-delay=4000
```

### Database Monitoring

```bash
# Check connections
psql trfc_db -c "SELECT count(*) FROM pg_stat_activity;"

# Check payment_callbacks table size
psql trfc_db -c "SELECT pg_size_pretty(pg_total_relation_size('payment_callbacks'));"

# Monitor slow queries
psql trfc_db -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
```

---

## Troubleshooting Deployment

### Issue: "Cannot connect to database"

```bash
# Check database running
sudo systemctl status postgresql

# Verify connection string
psql $DATABASE_URL -c "SELECT 1"

# Check credentials in .env
grep DATABASE_URL .env
```

### Issue: "M-Pesa authentication failing"

```bash
# Verify credentials
echo "Consumer Key: $MPESA_CONSUMER_KEY"
echo "Consumer Secret: $MPESA_CONSUMER_SECRET"

# Test token generation
curl -X GET https://sandbox.safaricom.co.ke/oauth/v1/generate \
  -H "Authorization: Basic [base64-encoded-credentials]" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "grant_type=client_credentials"
```

### Issue: "Callback not received"

```bash
# Verify callback URL is accessible
curl -v https://yourdomain.com/api/payments/mpesa/callback

# Check firewall
sudo ufw status

# Enable port (if needed)
sudo ufw allow 443/tcp

# Check server logs
pm2 logs trfc-api | grep -i callback
```

### Issue: "Payment logs growing too large"

```bash
# Rotate logs
cp /path/to/server/logs/payments.log \
   /path/to/server/logs/payments.log.$(date +%Y%m%d)

# Clear current log
> /path/to/server/logs/payments.log

# Setup log rotation in crontab
0 0 * * 0 /path/to/scripts/rotate-logs.sh
```

---

## Rollback Plan

### If Issues Occur

```bash
# 1. Check recent logs
pm2 logs trfc-api --lines 100

# 2. Revert to previous version
git revert HEAD --no-edit
npm install
npm start

# 3. Restore database from backup
# (if data was corrupted)
psql < backup.sql

# 4. Notify users
# Send status update
```

---

## Performance Optimization

### Backend Optimization

```bash
# Enable compression in Nginx
gzip on;
gzip_types application/json;

# Increase Node.js max connections
node --max-http-header-size=16384 app.js

# Use clustering (pm2)
pm2 start app.js -i max --name trfc-api
```

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM orders WHERE payment_status = 'paid';

-- Update statistics
ANALYZE;

-- Vacuum
VACUUM ANALYZE;
```

### Frontend Optimization

```bash
# Build with optimization
npm run build -- --minify

# Enable gzip on server
gzip -9 dist/**/*.js dist/**/*.css

# Cache busting handled by Vite
```

---

## Post-Deployment Verification

- [ ] User can create orders
- [ ] M-Pesa STK push works
- [ ] Callbacks are received and logged
- [ ] Orders marked as paid
- [ ] Admin dashboard shows payments
- [ ] Payment history displays correctly
- [ ] Logs rotating without errors
- [ ] No sensitive data in logs
- [ ] API response times acceptable
- [ ] Error handling working

---

## Support & Escalation

For production issues:

1. **Check logs first**: `/server/logs/payments.log`
2. **Verify M-Pesa status**: Daraja Portal status page
3. **Test callback URL**: Ensure publicly accessible
4. **Contact support**:
   - Safaricom: support@safaricom.co.ke
   - Database issues: PostgreSQL logs
   - Application: Review server logs
