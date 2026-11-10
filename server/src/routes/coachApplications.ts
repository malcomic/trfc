import { Router } from 'express'
import {
  createCoachApplication,
  getCoachVideoSignature,
  receiveCoachCv,
  uploadCoachCv,
} from '../controllers/coachApplicationsController.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.post('/video-signature', simpleRateLimit(10, 15 * 60_000), getCoachVideoSignature)
router.post('/cv', simpleRateLimit(10, 15 * 60_000), receiveCoachCv, uploadCoachCv)
router.post('/', simpleRateLimit(5, 15 * 60_000), createCoachApplication)

export default router
