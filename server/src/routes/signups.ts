import { Router } from 'express'
import { createSignup, getSignupStatus } from '../controllers/signupsController.js'

const router = Router()

router.post('/', createSignup)
router.get('/:id/status', getSignupStatus)

export default router
