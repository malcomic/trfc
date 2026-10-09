import { Router } from 'express'
import {
  getAdminEvents,
  getAdminProducts,
  getAdminEquipmentHire,
  getAdminTickets,
} from '../controllers/adminController.js'
import {
  createEventTicketType,
  updateEventTicketType,
  deleteEventTicketType,
} from '../controllers/eventsController.js'
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
import { getAdminProductCategories } from '../controllers/productCategoriesController.js'
import { getAdminFlashSales } from '../controllers/flashSalesController.js'
import {
  getTypography,
  updateTypography,
  resetTypography,
} from '../controllers/siteSettingsController.js'
import { getAdminSignups } from '../controllers/signupsController.js'
import {
  getRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  getAdminCaptains,
  createCaptain,
  updateCaptain,
  removeCaptain,
  getAdminCommissions,
  approveCommissions,
  reverseCommission,
  syncCommissions,
  getAdminPayouts,
  createPayout,
} from '../controllers/captainsController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

router.get('/events', getAdminEvents)
router.post('/events/:eventId/ticket-types', createEventTicketType)
router.put('/events/:eventId/ticket-types/:typeId', updateEventTicketType)
router.delete('/events/:eventId/ticket-types/:typeId', deleteEventTicketType)
router.get('/products', getAdminProducts)
router.get('/product-categories', getAdminProductCategories)
router.get('/flash-sales', getAdminFlashSales)
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
router.get('/signups', getAdminSignups)
router.get('/settings/typography', getTypography)
router.put('/settings/typography', updateTypography)
router.post('/settings/typography/reset', resetTypography)
router.get('/regions', getRegions)
router.post('/regions', createRegion)
router.put('/regions/:id', updateRegion)
router.delete('/regions/:id', deleteRegion)
router.get('/captains', getAdminCaptains)
router.post('/captains', createCaptain)
router.put('/captains/:id', updateCaptain)
router.delete('/captains/:id', removeCaptain)
router.get('/captain-commissions', getAdminCommissions)
router.post('/captain-commissions/approve', approveCommissions)
router.post('/captain-commissions/sync', syncCommissions)
router.post('/captain-commissions/:id/reverse', reverseCommission)
router.get('/captain-payouts', getAdminPayouts)
router.post('/captain-payouts', createPayout)

export default router
