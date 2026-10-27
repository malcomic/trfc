import { Router } from 'express'
import { getPageVideos } from '../controllers/pageVideosController.js'

const router = Router()

router.get('/', getPageVideos)

export default router
