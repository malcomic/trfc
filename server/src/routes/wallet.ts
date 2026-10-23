import { Router } from 'express'
import {
  createPaymentPlan,
  getWallet,
  listPayableBatches,
  listPaymentPlans,
  listWalletTransactions,
  payPaymentPlan,
  previewPlan,
  topUpWallet,
  walletCheckout,
} from '../controllers/walletController.js'
import { authMiddleware } from '../middleware/auth.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getWallet)
router.get('/transactions', listWalletTransactions)
router.post('/topup', simpleRateLimit(10, 10 * 60_000), topUpWallet)
router.get('/payable', listPayableBatches)
router.post('/checkout', walletCheckout)
router.get('/plans/preview', previewPlan)
router.get('/plans', listPaymentPlans)
router.post('/plans', simpleRateLimit(10, 10 * 60_000), createPaymentPlan)
router.post('/plans/:id/pay', simpleRateLimit(10, 10 * 60_000), payPaymentPlan)

export default router
