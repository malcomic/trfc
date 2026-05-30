import { Router } from 'express';
import { getTestimonials, getPendingTestimonials, createTestimonial, approveTestimonial } from '../controllers/testimonialsController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', getTestimonials);
router.get('/pending', authMiddleware, adminMiddleware, getPendingTestimonials);
router.post('/', createTestimonial);
router.put('/:id/approve', authMiddleware, adminMiddleware, approveTestimonial);

export default router;
