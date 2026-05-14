import { Router } from 'express';
import { getAllUsers, updateUserRole } from '../controllers/usersController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, getAllUsers);
router.put('/:id/role', authMiddleware, adminMiddleware, updateUserRole);

export default router;
