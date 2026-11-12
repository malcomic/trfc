import { Router } from 'express'
import { checkoutMembership, getMyMembership, getPublicPerks, getShopDiscount } from '../controllers/membershipController.js'
import {
  downloadMemberGuide,
  getLiveQa,
  listMemberGuides,
  listMemberPolls,
  voteInPoll,
} from '../controllers/memberPerksController.js'
import { authMiddleware } from '../middleware/auth.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.get('/perks', getPublicPerks)
router.get('/me', authMiddleware, getMyMembership)
router.get('/shop-discount', authMiddleware, getShopDiscount)
router.post('/checkout', authMiddleware, simpleRateLimit(5, 10 * 60_000), checkoutMembership)
router.get('/guides', authMiddleware, listMemberGuides)
router.get('/guides/:id/download', authMiddleware, simpleRateLimit(60, 10 * 60_000), downloadMemberGuide)
router.get('/live-qa', authMiddleware, getLiveQa)
router.get('/polls', authMiddleware, listMemberPolls)
router.post('/polls/:id/vote', authMiddleware, simpleRateLimit(60, 10 * 60_000), voteInPoll)

export default router
