import { Router } from 'express'
import {
  createPaymentPlan,
  getWallet,
  listPayableBatches,
  listPaymentPlans,
  listWalletTransactions,
  payPaymentPlan,
  previewPlan,
  releasePaymentPlan,
  movePaymentPlan,
  walletCheckout,
} from '../controllers/walletController.js'
import { authMiddleware } from '../middleware/auth.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getWallet)
router.get('/transactions', listWalletTransactions)
router.get('/payable', listPayableBatches)
router.post('/checkout', simpleRateLimit(10, 10 * 60_000), walletCheckout)
router.get('/plans/preview', previewPlan)
router.get('/plans', listPaymentPlans)
router.post('/plans', simpleRateLimit(10, 10 * 60_000), createPaymentPlan)
router.post('/plans/:id/pay', simpleRateLimit(10, 10 * 60_000), payPaymentPlan)
router.post('/plans/:id/release', simpleRateLimit(10, 10 * 60_000), releasePaymentPlan)
router.post('/plans/:id/move', simpleRateLimit(10, 10 * 60_000), movePaymentPlan)

export default router
