import { Router } from 'express'
import {
  getAdminEvents,
  getAdminProducts,
  getAdminEquipmentHire,
  getAdminTickets,
} from '../controllers/adminController.js'
import {
  getAdminMedals,
  updateMedalTier,
  upsertMedalOption,
  deleteMedalOption,
  getAdminMedalPurchases,
} from '../controllers/medalsController.js'
import {
  getAdminPartnerships,
  updatePartnershipStatus,
} from '../controllers/partnershipsController.js'
import { getAdminSponsorshipTiers } from '../controllers/sponsorshipTiersController.js'
import {
  getTypography,
  updateTypography,
  resetTypography,
} from '../controllers/siteSettingsController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

router.get('/events', getAdminEvents)
router.get('/products', getAdminProducts)
router.get('/equipment/hire', getAdminEquipmentHire)
router.get('/tickets', getAdminTickets)
router.get('/medals', getAdminMedals)
router.get('/medals/purchases', getAdminMedalPurchases)
router.put('/medals/:id', updateMedalTier)
router.post('/medals/:tierId/options', upsertMedalOption)
router.put('/medals/:tierId/options', upsertMedalOption)
router.delete('/medals/:tierId/options/:optionId', deleteMedalOption)
router.get('/partnerships', getAdminPartnerships)
router.patch('/partnerships/:id', updatePartnershipStatus)
router.get('/sponsorship-tiers', getAdminSponsorshipTiers)
router.get('/settings/typography', getTypography)
router.put('/settings/typography', updateTypography)
router.post('/settings/typography/reset', resetTypography)

export default router
