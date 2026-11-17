import { Router } from 'express'
import { activateCoachInvitation, validateCoachInvitation } from '../controllers/coachInvitationsController.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.get('/validate', simpleRateLimit(20, 15 * 60_000), validateCoachInvitation)
router.post('/activate', simpleRateLimit(10, 15 * 60_000), activateCoachInvitation)

export default router
