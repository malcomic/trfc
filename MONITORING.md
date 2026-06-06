# TRFC MVP - Monitoring & Logging Guide

## Table of Contents
1. [Application Logging](#application-logging)
2. [Error Tracking with Sentry](#error-tracking)
3. [Performance Monitoring](#performance-monitoring)
4. [Uptime Monitoring](#uptime-monitoring)
5. [Log Aggregation](#log-aggregation)
6. [Alerting](#alerting)

---

## Application Logging

### Backend Logging

The backend logs all important events to `server/logs/payments.log`:

```typescript
// Log levels
logger.debug('Debug message')      // Development only
logger.info('Information')         // General events
logger.warn('Warning message')     // Potential issues
logger.error('Error message')      // Error
logger.critical('Critical error')  // System failures
```

### Log Locations

```
server/logs/
├── payments.log        # Payment transactions
├── errors.log          # Error logs
├── access.log          # HTTP access logs
└── debug.log           # Debug logs (development)
```

### View Logs

**Local Development:**
```bash
# Real-time logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail 100 backend

# Specific service
docker-compose logs backend | grep -i error
```

**Production (Railway):**
```bash
# View in Railway dashboard
Railway → Project → Service → Logs

# Or via CLI
railway logs
```

### Log Configuration

```typescript
// server/src/utils/logger.ts
const logger = {
  debug: (msg, data?) => console.log(`[DEBUG] ${msg}`, data),
  info: (msg, data?) => console.log(`[INFO] ${msg}`, data),
  warn: (msg, data?) => console.warn(`[WARN] ${msg}`, data),
  error: (msg, err?) => console.error(`[ERROR] ${msg}`, err),
}
```

---

## Error Tracking with Sentry

Sentry provides real-time error tracking and alerting.

### Setup Sentry

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Sign up (free tier available)
   - Create new project

2. **Install SDK**
```bash
cd server
npm install @sentry/node

cd ../client
npm install @sentry/react
```

3. **Configure Backend**

```typescript
// server/src/server.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
})

app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())
```

4. **Configure Frontend**

```typescript
// client/src/main.tsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

5. **Add Environment Variable**

```bash
# .env.production
SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[project-id]
```

### Usage

```typescript
// Capture exceptions
try {
  // code
} catch (error) {
  Sentry.captureException(error)
}

// Capture messages
Sentry.captureMessage('Something important happened')

// Add context
Sentry.setContext('user', {
  id: userId,
  email: userEmail,
})

// Add tags
Sentry.setTag('payment_status', 'failed')
```

### Sentry Dashboard

- View errors in real-time
- Filter by severity, status, environment
- Track error trends
- Create alerts
- Review user sessions (Pro feature)

---

## Performance Monitoring

### Application Performance Monitoring (APM)

**Backend Metrics to Track:**
```
- API response time (target: < 200ms)
- Database query time (target: < 100ms)
- Payment callback processing (target: < 500ms)
- Error rate (target: < 0.1%)
```

**Frontend Metrics:**
```
- Page load time (target: < 2s)
- First Contentful Paint - FCP (target: < 1s)
- Largest Contentful Paint - LCP (target: < 2.5s)
- Cumulative Layout Shift - CLS (target: < 0.1)
```

### Setup with Sentry

```typescript
// Enable performance monitoring
Sentry.init({
  tracesSampleRate: 0.1, // 10% of transactions
  profilerSampleRate: 0.1,
})
```

### Custom Metrics

```typescript
// Backend
const start = Date.now()
const result = await processPayment()
const duration = Date.now() - start
Sentry.captureMessage(`Payment processed in ${duration}ms`, 'info')

// Frontend
import { Measure } from './utils/metrics'
const measure = new Measure('checkout')
// ... checkout process
measure.end() // Logs time
```

---

## Uptime Monitoring

### Setup with UptimeRobot

1. **Create Account**
   - Go to [uptimerobot.com](https://uptimerobot.com)
   - Sign up (free tier includes 50 monitors)

2. **Add Monitors**

```
Backend API:
- URL: https://api.yourdomain.com/health
- Frequency: Every 5 minutes
- Timeout: 10 seconds
- Alert: Down notification

Frontend:
- URL: https://yourdomain.com/health
- Frequency: Every 5 minutes
- Timeout: 10 seconds
```

3. **Configure Alerts**

```
Alert contacts:
- Email: your-email@example.com
- Slack: #alerts channel
- SMS: your-phone (paid)
- Webhook: custom integration
```

### Health Check Endpoints

**Backend:**
```
GET /health
Response: 200 OK
Body: { status: 'healthy' }
```

**Frontend:**
```
GET /health
Response: 200 OK
Body: 'healthy'
```

---

## Log Aggregation

### Setup with Papertrail

1. **Create Papertrail Account**
   - Go to [papertrailapp.com](https://papertrailapp.com)
   - Sign up

2. **Setup Log Destination**
   - Create new system: trfc-logs
   - Note the destination address

3. **Configure Backend Logging**

```bash
# Install syslog transport
npm install winston-syslog

# Or use direct syslog
# Echo logs to: logs.papertrailapp.com:YOUR_PORT
```

4. **View Aggregated Logs**
   - All services logs in one place
   - Search and filter
   - Create saved searches
   - Set up alerts

### Alternative: Railway Logs

Railway automatically logs all stdout/stderr:

```bash
# View via Railway CLI
railway logs --tail

# Or in Railway dashboard
Railway → Project → Service → Logs
```

---

## Alerting

### Alert Types

**1. Error Alerts**
- Sentry → New error occurs
- Alert to: email, Slack, PagerDuty

**2. Uptime Alerts**
- UptimeRobot → Service down
- Alert to: email, SMS, Slack

**3. Performance Alerts**
- API response time > 1s
- Database query time > 500ms
- Error rate > 1%

**4. Resource Alerts**
- Database connection limit reached
- CPU usage > 80%
- Memory usage > 90%
- Disk usage > 85%

### Setup Slack Integration

**Sentry + Slack:**
```
Sentry → Settings → Integrations → Slack
- Select channel: #errors
- Alert on: all error levels
```

**UptimeRobot + Slack:**
```
UptimeRobot → Settings → Slack
- Add webhook
- Select channel: #alerts
```

### Alert Fatigue Prevention

```
Only alert on:
- Production environment
- Error rate > 1%
- Response time > 2s (sustained for 5 min)
- Service down for > 5 minutes
- Database unavailable
```

---

## Monitoring Dashboard

### Create Custom Dashboard

**Metrics to Display:**
```
1. API Response Time (avg, p95, p99)
2. Error Rate (%)
3. Active Users
4. Database Connections
5. Payment Success Rate
6. Order Volume (24h)
7. Uptime (%)
8. Resource Usage (CPU, Memory)
```

### Tools

- **Grafana** - Dashboard visualization
- **Prometheus** - Metrics collection
- **Railway Metrics** - Built-in dashboard
- **Vercel Analytics** - Frontend metrics
- **Datadog** - Complete APM platform

---

## Production Monitoring Checklist

- ✅ Sentry error tracking enabled
- ✅ UptimeRobot monitoring active
- ✅ Log aggregation configured
- ✅ Health check endpoints implemented
- ✅ Alerts configured (Slack/Email)
- ✅ Dashboard created
- ✅ On-call rotation established
- ✅ Incident response plan documented
- ✅ Performance benchmarks set
- ✅ Regular log review schedule

---

## Incident Response

### When Alert Fires

1. **Acknowledge Alert**
   - Mark as acknowledged in Sentry/UptimeRobot
   - Notify team in Slack

2. **Investigate**
   - Check logs: Railway/Papertrail
   - Check metrics: Dashboard
   - Check status: Health endpoints

3. **Categorize**
   - **Critical:** Service down, data loss (P1)
   - **High:** Feature broken, high error rate (P2)
   - **Medium:** Performance issue (P3)
   - **Low:** Minor issue (P4)

4. **Respond**
   - P1: Immediate response
   - P2: Within 30 minutes
   - P3: Within 2 hours
   - P4: Within business hours

5. **Resolve**
   - Fix the issue
   - Deploy fix
   - Verify resolution
   - Update status page

6. **Post-Mortem**
   - Document what happened
   - Identify root cause
   - Implement prevention
   - Update runbook

---

## Example Alert Rules

```yaml
# Sentry Alert
on_error:
  alert: true
  severity: error
  channel: #errors
  email: oncall@example.com

# UptimeRobot Alert
service_down:
  alert: true
  notification_channels:
    - email: oncall@example.com
    - slack: #alerts

# Performance Alert
response_time_high:
  trigger: avg_response_time > 1000ms
  duration: 5 minutes
  alert: true
  channel: #performance
```

---

## KPIs to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Uptime | 99.9% | < 99% |
| Error Rate | < 0.1% | > 1% |
| API Response | < 200ms | > 1000ms |
| Page Load | < 2s | > 5s |
| Payment Success | > 95% | < 90% |
| DB Connections | < 80% | > 90% |

---

## Regular Maintenance

```
Daily:
- Check error logs
- Verify uptime status
- Review payment transactions

Weekly:
- Review performance metrics
- Check security logs
- Clean up old logs

Monthly:
- Generate performance report
- Review alerts (false positives)
- Test incident response
- Update monitoring rules
```

---

**Last Updated:** 2026-05-14
**Status:** Production Ready
