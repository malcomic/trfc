import { Router } from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/image', authMiddleware, adminMiddleware, uploadImage);

export default router;
