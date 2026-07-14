import { Router } from 'express'
import {
  initiateSTKPush,
  handleCallback,
  queryPaymentStatus,
  getPaymentHistory,
  initializePaystackPayment,
  verifyPaystackPayment,
  handlePaystackWebhook,
} from '../controllers/paymentsController.js'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js'
import { validatePaymentRequest } from '../middleware/paymentValidation.js'
import {
  validateWebhookSignature,
  rateLimit,
  validateCallbackBody,
} from '../middleware/webhookSecurity.js'

const router = Router()

router.post('/mpesa/stkpush', optionalAuthMiddleware, validatePaymentRequest, initiateSTKPush)

router.post(
  '/mpesa/callback',
  rateLimit,
  validateCallbackBody,
  validateWebhookSignature,
  handleCallback
)

router.post('/paystack/initialize', optionalAuthMiddleware, initializePaystackPayment)
router.get('/paystack/verify/:reference', optionalAuthMiddleware, verifyPaystackPayment)
router.post('/paystack/webhook', rateLimit, handlePaystackWebhook)

router.get('/status/:checkoutRequestId', optionalAuthMiddleware, queryPaymentStatus)

router.get('/history', authMiddleware, getPaymentHistory)

export default router
