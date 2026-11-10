import { Router } from 'express'
import { checkoutMembership, getMyMembership, getPublicPerks, getShopDiscount } from '../controllers/membershipController.js'
import { authMiddleware } from '../middleware/auth.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.get('/perks', getPublicPerks)
router.get('/me', authMiddleware, getMyMembership)
router.get('/shop-discount', authMiddleware, getShopDiscount)
router.post('/checkout', authMiddleware, simpleRateLimit(5, 10 * 60_000), checkoutMembership)

export default router
