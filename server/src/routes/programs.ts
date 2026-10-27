import { Router } from 'express';
import { enrollProgram, getMyPrograms } from '../controllers/programsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/mine', authMiddleware, getMyPrograms);
router.post('/enroll', authMiddleware, enrollProgram);

export default router;
