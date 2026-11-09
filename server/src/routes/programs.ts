import { Router } from 'express';
import {
  enrollProgram,
  getMyPrograms,
  getProgramPlan,
  getProgramProgress,
  getProgramWeek,
  setSessionProgress,
  submitCheckin,
} from '../controllers/programsController.js';
import { getProgramBySlug, getProgramCatalog } from '../controllers/programCatalogController.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/catalog', getProgramCatalog);
router.get('/by-slug/:slug', optionalAuthMiddleware, getProgramBySlug);
router.get('/mine', authMiddleware, getMyPrograms);
router.post('/enroll', authMiddleware, enrollProgram);
router.get('/:program/plan', authMiddleware, getProgramPlan);
router.get('/:program/progress', authMiddleware, getProgramProgress);
router.get('/:program/weeks/:week', authMiddleware, getProgramWeek);
router.put('/:program/sessions/:week/:day', authMiddleware, setSessionProgress);
router.post('/:program/checkins/:week', authMiddleware, submitCheckin);

export default router;
