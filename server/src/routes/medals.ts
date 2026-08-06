import { Router } from 'express'
import {
  getMedals,
  getMedalBySlug,
  createMedalPurchases,
  getUserMedalPurchases,
  getPurchasesByCheckoutRequestId,
  downloadMedalPDF,
  resendMedalEmail,
} from '../controllers/medalsController.js'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', getMedals)
router.get('/purchases/user', authMiddleware, getUserMedalPurchases)
router.get(
  '/purchases/checkout/:checkoutRequestId',
  optionalAuthMiddleware,
  getPurchasesByCheckoutRequestId
)
router.post('/purchases/resend', optionalAuthMiddleware, resendMedalEmail)
router.get(
  '/purchases/:purchaseId/download',
  optionalAuthMiddleware,
  downloadMedalPDF
)
router.post('/:slug/purchases', optionalAuthMiddleware, createMedalPurchases)
router.get('/:slug', getMedalBySlug)

export default router
