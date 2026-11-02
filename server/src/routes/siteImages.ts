import { Router } from 'express'
import { getSiteImages } from '../controllers/siteImagesController.js'

const router = Router()

router.get('/', getSiteImages)

export default router
