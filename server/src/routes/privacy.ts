import { Router } from 'express'
import {
  deleteMyAccount,
  downloadMyData,
  getMyPrivacy,
  updateMyMarketing,
  updateMyWhatsappShare,
} from '../controllers/privacyController.js'
import { authMiddleware } from '../middleware/auth.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.use(authMiddleware)

router.get('/', getMyPrivacy)
router.put('/marketing', updateMyMarketing)
router.put('/whatsapp/:captainId', updateMyWhatsappShare)
router.get('/export', simpleRateLimit(5, 15 * 60_000), downloadMyData)
router.post('/delete', simpleRateLimit(5, 15 * 60_000), deleteMyAccount)

export default router
