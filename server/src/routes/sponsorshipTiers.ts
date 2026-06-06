import { Router } from 'express'
import {
  getSponsorshipTiers,
  createSponsorshipTier,
  updateSponsorshipTier,
  deleteSponsorshipTier,
} from '../controllers/sponsorshipTiersController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', getSponsorshipTiers)
router.post('/', authMiddleware, adminMiddleware, createSponsorshipTier)
router.put('/:id', authMiddleware, adminMiddleware, updateSponsorshipTier)
router.delete('/:id', authMiddleware, adminMiddleware, deleteSponsorshipTier)

export default router
