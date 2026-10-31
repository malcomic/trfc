import { Router } from 'express'
import {
  confirmEventScanList,
  getEventScanList,
  listAttendanceEvents,
  markTicketPresent,
} from '../controllers/attendanceController.js'
import { adminOrCaptainMiddleware, authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, adminOrCaptainMiddleware)

router.get('/events', listAttendanceEvents)
router.get('/events/:id/scan-list', getEventScanList)
router.post('/events/:id/confirm', confirmEventScanList)
router.post('/tickets/:id/mark-present', markTicketPresent)

export default router
