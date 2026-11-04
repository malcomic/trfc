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
import {
  receiveCaptainPhoto,
  removeMyCaptainPhoto,
  uploadMyCaptainPhoto,
} from '../controllers/captainPhotoController.js'
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
router.put('/me/photo', authMiddleware, captainMiddleware, receiveCaptainPhoto, uploadMyCaptainPhoto)
router.delete('/me/photo', authMiddleware, captainMiddleware, removeMyCaptainPhoto)

export default router
