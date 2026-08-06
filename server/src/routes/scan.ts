import { Router } from 'express'
import { authMiddleware, staffMiddleware } from '../middleware/auth.js'
import { admitScan, listScanEvents, lookupScan } from '../controllers/scanController.js'

const router = Router()

router.use(authMiddleware, staffMiddleware)

router.get('/events', listScanEvents)
router.post('/lookup', lookupScan)
router.post('/admit', admitScan)

export default router
