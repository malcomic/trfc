import { Router } from 'express'
import { getTypography } from '../controllers/siteSettingsController.js'

const router = Router()

router.get('/typography', getTypography)

export default router
