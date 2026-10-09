import { Router } from 'express'
import {
  getReferrer,
  getMyCaptainProfile,
  getMyReferrals,
  getMyCommissions,
  getMyPayouts,
  getMyReferralQr,
} from '../controllers/captainsController.js'
import { authMiddleware, captainMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/ref/:code', getReferrer)
router.get('/me', authMiddleware, captainMiddleware, getMyCaptainProfile)
router.get('/me/referrals', authMiddleware, captainMiddleware, getMyReferrals)
router.get('/me/commissions', authMiddleware, captainMiddleware, getMyCommissions)
router.get('/me/payouts', authMiddleware, captainMiddleware, getMyPayouts)
router.get('/me/qr', authMiddleware, captainMiddleware, getMyReferralQr)

export default router
