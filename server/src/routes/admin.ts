import { Router } from 'express'
import {
  getAdminEvents,
  getAdminProducts,
  getAdminEquipmentHire,
  getAdminTickets,
  resendAdminTicket,
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
import {
  getAdminFlashSales,
  createFlashShareLink,
  getFlashShareLinks,
  revokeFlashShareLink,
} from '../controllers/flashSalesController.js'
import {
  getTypography,
  updateTypography,
  resetTypography,
} from '../controllers/siteSettingsController.js'
import { getAdminSignups } from '../controllers/signupsController.js'
import * as reachOut from '../controllers/reachOutController.js'
import * as programs from '../controllers/adminProgramsController.js'
import * as hiring from '../controllers/adminHiringController.js'
import * as membership from '../controllers/adminMembershipController.js'
import * as guides from '../controllers/adminGuidesController.js'
import * as liveQa from '../controllers/adminLiveQaController.js'
import * as polls from '../controllers/adminPollsController.js'
import * as policies from '../controllers/policiesController.js'
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
  previewPayout,
  createPayout,
} from '../controllers/captainsController.js'
import { adminRemoveCaptainPhoto } from '../controllers/captainPhotoController.js'
import {
  createAdminCredit,
  getAdminPaymentPlans,
  getAdminWalletLedger,
  getAdminWallets,
  getTicketRulesHandler,
  updateTicketRulesHandler,
  voidAdminCredit,
} from '../controllers/adminWalletsController.js'
import { deletePageVideo, upsertPageVideo } from '../controllers/pageVideosController.js'
import { deleteSiteImage, upsertSiteImage } from '../controllers/siteImagesController.js'
import { cancelEvent } from '../controllers/attendanceController.js'
import { getEventWaitlist } from '../controllers/eventsController.js'
import {
  approveEventSettlement,
  createEventCost,
  getEventSettlement,
  removeEventCost,
} from '../controllers/eventSettlementController.js'
import {
  archiveAnnouncement,
  createAnnouncement,
  getRecipientCount,
  listAnnouncements,
  sendTestAnnouncementEmail,
} from '../controllers/announcementsController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

router.get('/events', getAdminEvents)
router.post('/events/:id/cancel', cancelEvent)
router.get('/events/:id/waitlist', getEventWaitlist)
router.get('/events/:id/settlement', getEventSettlement)
router.post('/events/:id/costs', createEventCost)
router.delete('/events/:id/costs/:costId', removeEventCost)
router.post('/events/:id/settlement/approve', approveEventSettlement)
router.post('/events/:eventId/ticket-types', createEventTicketType)
router.put('/events/:eventId/ticket-types/:typeId', updateEventTicketType)
router.delete('/events/:eventId/ticket-types/:typeId', deleteEventTicketType)
router.get('/products', getAdminProducts)
router.get('/product-categories', getAdminProductCategories)
router.get('/flash-sales', getAdminFlashSales)
router.get('/flash-share-links', getFlashShareLinks)
router.post('/flash-share-links', createFlashShareLink)
router.post('/flash-share-links/:id/revoke', revokeFlashShareLink)
router.get('/equipment/hire', getAdminEquipmentHire)
router.get('/tickets', getAdminTickets)
router.post('/tickets/:id/resend', resendAdminTicket)
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
router.get('/reach-out/stats', reachOut.getStats)
router.get('/reach-out/members', reachOut.getMembers)
router.get('/reach-out/members/:id/log', reachOut.getMemberLog)
router.post('/reach-out/members/:id/log', reachOut.createMemberLog)
router.get('/reach-out/export', reachOut.exportMembers)
router.get('/reach-out/saved-filters', reachOut.getSavedFilters)
router.post('/reach-out/saved-filters', reachOut.createSavedFilter)
router.delete('/reach-out/saved-filters/:id', reachOut.deleteSavedFilter)
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
router.delete('/captains/:id/photo', adminRemoveCaptainPhoto)
router.get('/captain-commissions', getAdminCommissions)
router.post('/captain-commissions/approve', approveCommissions)
router.post('/captain-commissions/sync', syncCommissions)
router.post('/captain-commissions/:id/reverse', reverseCommission)
router.get('/captain-payouts', getAdminPayouts)
router.get('/captain-payouts/preview', previewPayout)
router.post('/captain-payouts', createPayout)
router.get('/wallets', getAdminWallets)
router.get('/wallets/plans', getAdminPaymentPlans)
router.post('/wallets/credits', createAdminCredit)
router.post('/wallets/credits/:creditId/void', voidAdminCredit)
router.get('/ticket-rules', getTicketRulesHandler)
router.put('/ticket-rules', updateTicketRulesHandler)
router.get('/wallets/:userId', getAdminWalletLedger)
router.put('/page-videos/:slot', upsertPageVideo)
router.delete('/page-videos/:slot', deletePageVideo)
router.put('/site-images/:slot', upsertSiteImage)
router.delete('/site-images/:slot', deleteSiteImage)
router.get('/announcements', listAnnouncements)
router.post('/announcements', createAnnouncement)
router.get('/announcements/recipient-count', getRecipientCount)
router.post('/announcements/test-email', sendTestAnnouncementEmail)
router.post('/announcements/:id/archive', archiveAnnouncement)
router.get('/programs', programs.listAdminPrograms)
router.post('/programs', programs.createAdminProgram)
router.get('/programs/:id', programs.getAdminProgram)
router.put('/programs/:id/settings', programs.updateProgramSettings)
router.put('/programs/:id/draft/weeks/:week', programs.saveDraftWeek)
router.post('/programs/:id/draft/weeks/:week/move', programs.moveDraftWeek)
router.delete('/programs/:id/draft/weeks/:week', programs.removeDraftWeek)
router.post('/programs/:id/draft/weeks', programs.addDraftWeek)
router.put('/programs/:id/draft/:section', programs.saveDraftSection)
router.delete('/programs/:id/draft', programs.discardDraft)
router.get('/programs/:id/publish-check', programs.getPublishCheck)
router.post('/programs/:id/publish', programs.publishProgram)
router.post('/programs/:id/archive', programs.archiveProgram)
router.post('/programs/:id/unarchive', programs.unarchiveProgram)
router.get('/programs/:id/versions', programs.listProgramVersions)
router.post('/programs/:id/versions/:versionId/restore', programs.restoreProgramVersion)

router.get('/policies', policies.adminListPolicies)
router.post('/policies', policies.adminCreateDraft)
router.put('/policies/:id', policies.adminUpdateDraft)
router.post('/policies/:id/publish', policies.adminPublishDraft)
router.delete('/policies/:id', policies.adminDeleteDraft)
router.get('/privacy-settings', policies.adminGetPrivacySettings)
router.put('/privacy-settings', policies.adminUpdatePrivacySettings)
router.get('/users/:id/consents', policies.adminGetUserConsents)

router.get('/hiring', hiring.listApplications)
router.get('/hiring/export', hiring.exportApplications)
router.get('/hiring/settings', hiring.getHiringSettings)
router.put('/hiring/settings', hiring.updateHiringSettings)
router.get('/hiring/:id', hiring.getApplication)
router.patch('/hiring/:id', hiring.updateApplication)
router.delete('/hiring/:id', hiring.deleteApplication)

router.get('/membership/summary', membership.getSummary)
router.get('/membership/members', membership.listMembers)
router.get('/membership/members/export', membership.exportMembers)
router.get('/membership/members/:userId/years', membership.getMemberYears)
router.post('/membership/grant', membership.grant)
router.get('/membership/settings', membership.getSettings)
router.put('/membership/settings', membership.updateSettings)
router.get('/membership/perks', membership.listPerks)
router.post('/membership/perks/reorder', membership.reorderPerks)
router.put('/membership/perks/:key', membership.updatePerk)
router.get('/membership/guides', guides.listGuides)
router.post('/membership/guides', guides.receiveGuideFile, guides.createGuide)
router.post('/membership/guides/reorder', guides.reorderGuides)
router.put('/membership/guides/:id', guides.receiveGuideFile, guides.updateGuide)
router.delete('/membership/guides/:id', guides.deleteGuide)
router.get('/membership/live-qa', liveQa.getLiveQaAdmin)
router.put('/membership/live-qa', liveQa.updateLiveQa)
router.get('/membership/polls', polls.listPolls)
router.post('/membership/polls', polls.createPoll)
router.put('/membership/polls/:id', polls.updatePoll)
router.post('/membership/polls/:id/close', polls.closePoll)
router.delete('/membership/polls/:id', polls.deletePoll)
router.post('/membership/:id/cancel', membership.cancel)

export default router
