import { Router } from 'express'
import {
  admitCheckin,
  getCheckinEvents,
  getScannedMembers,
  lookupCheckin,
  postFinishTime,
  putEventHeadcount,
} from '../controllers/checkinsController.js'
import { authMiddleware, staffOrCaptainMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, staffOrCaptainMiddleware)

router.get('/events', getCheckinEvents)
router.get('/events/:id/scanned', getScannedMembers)
router.put('/events/:id/headcount', putEventHeadcount)
router.post('/events/:id/finish-time', postFinishTime)
router.post('/lookup', lookupCheckin)
router.post('/admit', admitCheckin)

export default router
