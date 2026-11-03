import { Router } from 'express'
import { admitCheckin, getCheckinEvents, lookupCheckin } from '../controllers/checkinsController.js'
import { authMiddleware, staffOrCaptainMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, staffOrCaptainMiddleware)

router.get('/events', getCheckinEvents)
router.post('/lookup', lookupCheckin)
router.post('/admit', admitCheckin)

export default router
