import { Router } from 'express'
import { unsubscribeFromMarketing } from '../controllers/announcementsController.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.post('/unsubscribe', simpleRateLimit(10, 15 * 60_000), unsubscribeFromMarketing)

export default router
