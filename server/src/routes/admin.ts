import { Router } from 'express'
import {
  getAdminEvents,
  getAdminProducts,
  getAdminEquipmentHire,
  getAdminTickets,
} from '../controllers/adminController.js'
import {
  getAdminPartnerships,
  updatePartnershipStatus,
} from '../controllers/partnershipsController.js'
import { getAdminSponsorshipTiers } from '../controllers/sponsorshipTiersController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

router.get('/events', getAdminEvents)
router.get('/products', getAdminProducts)
router.get('/equipment/hire', getAdminEquipmentHire)
router.get('/tickets', getAdminTickets)
router.get('/partnerships', getAdminPartnerships)
router.patch('/partnerships/:id', updatePartnershipStatus)
router.get('/sponsorship-tiers', getAdminSponsorshipTiers)

export default router
