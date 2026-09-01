# TRFC MVP Testing Plan - Phase 5

## Overview
Comprehensive testing strategy for payment flows, user journeys, and admin functions.

---

## Test Structure

```
server/
  ├── __tests__/
  │   ├── unit/
  │   │   ├── utils.test.ts (M-Pesa utilities)
  │   │   └── validation.test.ts
  │   ├── integration/
  │   │   ├── payments.test.ts
  │   │   ├── orders.test.ts
  │   │   ├── events.test.ts
  │   │   └── equipment.test.ts
  │   └── fixtures/
  │       ├── mockPayments.ts
  │       └── testData.ts

client/
  ├── __tests__/
  │   ├── unit/
  │   │   ├── components/
  │   │   └── store/
  │   ├── integration/
  │   │   ├── checkout.test.tsx
  │   │   └── payment.test.tsx
  │   └── fixtures/
  │       └── mockResponses.ts
```

---

## Phase 5A: Backend Test Infrastructure

### Task 1: Setup Test Framework
- Install Vitest + testing utilities
- Configure test environment
- Setup test database connection
- Create test runner scripts

### Task 2: Create Test Utilities & Mocks
- Mock M-Pesa service
- Mock database
- Mock JWT/auth
- Test data fixtures
- Helper functions

### Task 3: Setup Test Database
- Create test DB (`trfc_test`)
- Database migration strategy
- Data cleanup between tests
- Seed data for testing

---

## Phase 5B: Backend Payment Tests

### Task 4: M-Pesa Utilities Tests
- ✓ `generateTimestamp()` validation
- ✓ `hashPassword()` validation
- ✓ `generateChecksum()` correctness
- ✓ Phone number parsing
- ✓ Amount validation

### Task 5: Payment Controller Tests
- ✓ POST /api/payments/initiate-stk-push
- ✓ POST /api/payments/callback
- ✓ GET /api/payments/status/:checkoutRequestId
- ✓ GET /api/payments/history (user)
- ✓ POST /api/payments/refund

### Task 6: Callback & Idempotency Tests
- ✓ HMAC signature validation (valid/invalid)
- ✓ Idempotency on duplicate callbacks
- ✓ Rate limiting enforcement
- ✓ Malformed payload handling
- ✓ Error response format

### Task 7: Payment Flow Integration Tests
- ✓ Order → Payment → Confirmation flow
- ✓ Event Ticket → Payment flow
- ✓ Equipment Hire → Payment flow
- ✓ Failed payment recovery
- ✓ Refund workflow

---

## Phase 5C: Frontend Tests

### Task 8: Frontend Test Setup
- Install Vitest + React Testing Library
- Configure test environment
- Setup API mocks
- Setup component fixtures

### Task 9: Component & Page Tests
- ✓ Checkout form validation
- ✓ Payment history filtering
- ✓ Order confirmation display
- ✓ Cart management
- ✓ Event selection flow

### Task 10: API Client Tests
- ✓ Payment API calls
- ✓ Order API calls
- ✓ Error handling
- ✓ Request retry logic

---

## Phase 5D: E2E Tests

### Task 11: E2E Framework Setup
- Install Playwright/Cypress
- Configure test environment
- Setup test user accounts
- Create test scenarios

### Task 12: E2E User Journey Tests
- ✓ Complete checkout flow
- ✓ Payment success scenario
- ✓ Payment failure recovery
- ✓ Order history view
- ✓ Admin payment dashboard

---

## Test Coverage Goals

| Module | Target | Current |
|--------|--------|---------|
| Payment utilities | 95% | 0% |
| Payment controller | 90% | 0% |
| Order endpoints | 85% | 0% |
| Frontend components | 80% | 0% |
| API clients | 85% | 0% |

---

## Test Execution Strategy

### Local Development
```bash
# Backend unit tests
cd server && npm run test:unit

# Backend integration tests (requires test DB)
npm run test:integration

# Frontend tests
cd ../client && npm run test

# All tests
npm run test:all
```

### CI/CD Pipeline
- Run tests on every PR
- Require 80% coverage for merge
- E2E tests on staging before deployment

---

## Critical Payment Flow Tests

### Success Scenario
1. User adds items to cart
2. Navigates to checkout
3. Enters phone & address
4. Clicks "Pay with M-Pesa"
5. M-Pesa prompt received
6. User enters PIN
7. Payment succeeds
8. Order marked as paid
9. Confirmation page shown
10. Receipt available for download

### Failure Scenarios
1. User cancels M-Pesa prompt
2. Payment times out
3. User enters wrong PIN (retry)
4. Network error during callback
5. Duplicate callback received
6. Invalid phone number
7. Amount mismatch
8. Missing required fields

---

## Performance Benchmarks

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Checkout load | < 2s | < 3s |
| Payment callback | < 500ms | < 1s |
| Payment history | < 1s | < 2s |
| Order creation | < 800ms | < 1.5s |

---

## Bug Categories to Test

### Security
- ✓ HMAC signature bypass attempts
- ✓ SQL injection in filters
- ✓ XSS in user input
- ✓ CSRF token validation
- ✓ JWT token expiration

### Payment
- ✓ Duplicate charge prevention
- ✓ Amount tampering
- ✓ Reference validation
- ✓ Callback race conditions
- ✓ Timeout handling

### Data Integrity
- ✓ Order-payment linking
- ✓ Inventory updates
- ✓ User balance tracking
- ✓ Audit log completeness
- ✓ Orphaned records

---

## Test Data Strategy

### Test Users
- Admin: `admin@trfc.test` / password: `TestAdmin123!`
- Customer: `customer@trfc.test` / password: `TestCustomer123!`
- Test phone: `254700000000` - Always success
- Test phone: `254700000001` - Always fail

### Test Products
- Low price: 100 KES
- Medium price: 500 KES
- High price: 5000 KES

### Test Events
- Upcoming: 2026-06-01
- Past: 2026-04-01
- Single capacity: 1 ticket
- High capacity: 100 tickets

---

## Known Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| M-Pesa callback timing | Use test DB polling + webhooks |
| Async payment confirmation | Retry logic + polling in tests |
| State cleanup | Transaction rollback between tests |
| Environment differences | Use .env.test configuration |
| Rate limiting in tests | Mock time or use lower limits for test env |

---

## Next Phase: Deployment & DevOps

Once Phase 5 complete, move to:
- Docker containerization
- GitHub Actions CI/CD
- Staging/Production deployment
- Monitoring & alerting

---

**Start Date**: 2026-05-14
**Estimated Duration**: 2-3 weeks
**Owner**: Development Team
**Priority**: High (Payment system critical)
