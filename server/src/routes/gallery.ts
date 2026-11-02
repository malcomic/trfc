import { Router } from 'express';
import {
  getGallery,
  getHeroSlides,
  uploadMedia,
  uploadFile,
  updateMedia,
  reorderHeroSlides,
  deleteMedia,
} from '../controllers/galleryController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', getGallery);
router.get('/hero', getHeroSlides);
router.post('/', authMiddleware, adminMiddleware, uploadMedia);
router.post('/upload', authMiddleware, adminMiddleware, uploadFile);
router.patch('/hero/reorder', authMiddleware, adminMiddleware, reorderHeroSlides);
router.put('/:id', authMiddleware, adminMiddleware, updateMedia);
router.delete('/:id', authMiddleware, adminMiddleware, deleteMedia);

export default router;
