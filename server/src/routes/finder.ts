import { Router } from 'express'
import { createFinderAccount } from '../controllers/finderController.js'

const router = Router()
router.post('/account', createFinderAccount)
export default router
