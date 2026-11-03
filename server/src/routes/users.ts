import { Router } from 'express';
import {
  getAllUsers,
  getMyDashboard,
  getMyCalendar,
  getMyCaptainOptions,
  updateMyCaptain,
  getMyAnswers,
  updateMyAnswers,
  deleteMyAnswers,
  createUser,
  updateUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
} from '../controllers/usersController.js';
import { markWelcomeVideoWatched, recordWelcomeVideoShown } from '../controllers/welcomeVideoController.js';
import { getMyPass, regenerateMyPass } from '../controllers/memberPassController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/me/dashboard', authMiddleware, getMyDashboard);
router.get('/me/calendar', authMiddleware, getMyCalendar);
router.get('/me/pass', authMiddleware, getMyPass);
router.post('/me/pass/regenerate', authMiddleware, regenerateMyPass);
router.get('/me/captain-options', authMiddleware, getMyCaptainOptions);
router.put('/me/captain', authMiddleware, updateMyCaptain);
router.get('/me/answers', authMiddleware, getMyAnswers);
router.put('/me/answers', authMiddleware, updateMyAnswers);
router.delete('/me/answers', authMiddleware, deleteMyAnswers);
router.post('/me/welcome-video/shown', authMiddleware, recordWelcomeVideoShown);
router.post('/me/welcome-video/watched', authMiddleware, markWelcomeVideoWatched);
router.get('/', authMiddleware, adminMiddleware, getAllUsers);
router.post('/', authMiddleware, adminMiddleware, createUser);
router.put('/:id', authMiddleware, adminMiddleware, updateUser);
router.put('/:id/role', authMiddleware, adminMiddleware, updateUserRole);
router.put('/:id/password', authMiddleware, adminMiddleware, resetUserPassword);
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

export default router;
