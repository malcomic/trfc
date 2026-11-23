import { Router } from 'express'
import {
  getMyPoints,
  getMyPointsLedger,
  getPointsLeaderboards,
  postCaptainFeedback,
  postCommunityNominate,
  postDispute,
  postMissingScan,
  postRedeemRewards,
  postTransformationEntry,
} from '../controllers/pointsController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/me', getMyPoints)
router.get('/me/ledger', getMyPointsLedger)
router.post('/me/missing-scan', postMissingScan)
router.post('/me/redeem', postRedeemRewards)
router.post('/me/disputes', postDispute)
router.post('/me/awards/transformation', postTransformationEntry)
router.post('/me/awards/community-nominate', postCommunityNominate)
router.post('/me/captain-feedback', postCaptainFeedback)
router.get('/leaderboards', getPointsLeaderboards)

export default router
