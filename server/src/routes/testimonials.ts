import { Router } from 'express'
import {
  getTestimonials,
  getPendingTestimonials,
  createTestimonial,
  approveTestimonial,
  rejectTestimonial,
} from '../controllers/testimonialsController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.get('/', getTestimonials)
router.get('/pending', authMiddleware, adminMiddleware, getPendingTestimonials)
router.post('/', simpleRateLimit(), createTestimonial)
router.put('/:id/approve', authMiddleware, adminMiddleware, approveTestimonial)
router.delete('/:id', authMiddleware, adminMiddleware, rejectTestimonial)

export default router
