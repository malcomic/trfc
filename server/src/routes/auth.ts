import { Router } from 'express';
import {
  register,
  login,
  logout,
  refresh,
  getProfile,
  updateMyProfile,
  changeMyPassword,
  forgotPassword,
  resetPassword,
  googleAuth,
  completeGoogleSignup,
  linkGoogle,
  unlinkGoogle,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/forgot-password', simpleRateLimit(5, 15 * 60_000), forgotPassword);
router.post('/reset-password', simpleRateLimit(10, 15 * 60_000), resetPassword);
router.post('/google', simpleRateLimit(10, 15 * 60_000), googleAuth);
router.post('/google/complete', simpleRateLimit(10, 15 * 60_000), completeGoogleSignup);
router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateMyProfile);
router.put('/me/password', authMiddleware, simpleRateLimit(10, 15 * 60_000), changeMyPassword);
router.post('/me/google', authMiddleware, simpleRateLimit(10, 15 * 60_000), linkGoogle);
router.delete('/me/google', authMiddleware, simpleRateLimit(10, 15 * 60_000), unlinkGoogle);

export default router;
