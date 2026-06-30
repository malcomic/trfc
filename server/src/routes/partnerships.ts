import { Router } from 'express'
import { createPartnership } from '../controllers/partnershipsController.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.post('/', simpleRateLimit(), createPartnership)

export default router
