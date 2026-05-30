import { Router } from 'express'
import {
  getEquipment,
  getAvailableEquipment,
  createEquipmentHireRequest,
  getEquipmentHireRequests,
  getEquipmentHireById,
  confirmPaymentAndHire,
} from '../controllers/equipmentController.js'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', getEquipment)
router.get('/available/packages', getAvailableEquipment)
router.post('/hire', optionalAuthMiddleware, createEquipmentHireRequest)
router.get('/hire/list/user', authMiddleware, getEquipmentHireRequests)
router.get('/hire/:id', optionalAuthMiddleware, getEquipmentHireById)
router.put('/hire/:id/confirm', authMiddleware, confirmPaymentAndHire)

export default router
