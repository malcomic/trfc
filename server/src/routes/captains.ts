import { Router } from 'express'
import {
  getReferrer,
  getCaptainDirectory,
  getMyCaptainProfile,
  getMyReferrals,
  getMyTeam,
  getMyCommissions,
  getMyPayouts,
  getMyReferralQr,
} from '../controllers/captainsController.js'
import { authMiddleware, captainMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/directory', getCaptainDirectory)
router.get('/ref/:code', getReferrer)
router.get('/me', authMiddleware, captainMiddleware, getMyCaptainProfile)
router.get('/me/referrals', authMiddleware, captainMiddleware, getMyReferrals)
router.get('/me/team', authMiddleware, captainMiddleware, getMyTeam)
router.get('/me/commissions', authMiddleware, captainMiddleware, getMyCommissions)
router.get('/me/payouts', authMiddleware, captainMiddleware, getMyPayouts)
router.get('/me/qr', authMiddleware, captainMiddleware, getMyReferralQr)

export default router
