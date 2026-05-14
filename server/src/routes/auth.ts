import { Router } from 'express';
import { register, login, logout, refresh, getProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, getProfile);

export default router;
