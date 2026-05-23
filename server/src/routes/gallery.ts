import { Router } from 'express';
import { getGallery, uploadMedia, uploadFile, updateMedia, deleteMedia } from '../controllers/galleryController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', getGallery);
router.post('/', authMiddleware, adminMiddleware, uploadMedia);
router.post('/upload', authMiddleware, adminMiddleware, uploadFile);
router.put('/:id', authMiddleware, adminMiddleware, updateMedia);
router.delete('/:id', authMiddleware, adminMiddleware, deleteMedia);

export default router;
