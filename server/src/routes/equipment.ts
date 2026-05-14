import { Router } from 'express'
import {
  getEquipment,
  getAvailableEquipment,
  createEquipmentHireRequest,
  getEquipmentHireRequests,
  getEquipmentHireById,
  confirmPaymentAndHire,
} from '../controllers/equipmentController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', getEquipment)
router.get('/available/packages', getAvailableEquipment)
router.post('/hire', authMiddleware, createEquipmentHireRequest)
router.get('/hire/list/user', authMiddleware, getEquipmentHireRequests)
router.get('/hire/:id', authMiddleware, getEquipmentHireById)
router.put('/hire/:id/confirm', authMiddleware, confirmPaymentAndHire)

export default router
