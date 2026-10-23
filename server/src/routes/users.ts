import { Router } from 'express';
import {
  getAllUsers,
  getMyDashboard,
  getMyCalendar,
  createUser,
  updateUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
} from '../controllers/usersController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/me/dashboard', authMiddleware, getMyDashboard);
router.get('/me/calendar', authMiddleware, getMyCalendar);
router.get('/', authMiddleware, adminMiddleware, getAllUsers);
router.post('/', authMiddleware, adminMiddleware, createUser);
router.put('/:id', authMiddleware, adminMiddleware, updateUser);
router.put('/:id/role', authMiddleware, adminMiddleware, updateUserRole);
router.put('/:id/password', authMiddleware, adminMiddleware, resetUserPassword);
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

export default router;
