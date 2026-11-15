import { Router } from 'express'
import { admitCheckin, getCheckinEvents, getScannedMembers, lookupCheckin } from '../controllers/checkinsController.js'
import { authMiddleware, staffOrCaptainMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, staffOrCaptainMiddleware)

router.get('/events', getCheckinEvents)
router.get('/events/:id/scanned', getScannedMembers)
router.post('/lookup', lookupCheckin)
router.post('/admit', admitCheckin)

export default router
