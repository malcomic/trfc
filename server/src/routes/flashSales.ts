import { Router } from 'express'
import {
  requestFlashAccess,
  getFlashStatus,
  getLiveFlashSales,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
} from '../controllers/flashSalesController.js'
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/access', optionalAuthMiddleware, requestFlashAccess)
router.get('/status', optionalAuthMiddleware, getFlashStatus)
router.get('/', optionalAuthMiddleware, getLiveFlashSales)
router.post('/', authMiddleware, adminMiddleware, createFlashSale)
router.put('/:id', authMiddleware, adminMiddleware, updateFlashSale)
router.delete('/:id', authMiddleware, adminMiddleware, deleteFlashSale)

export default router
