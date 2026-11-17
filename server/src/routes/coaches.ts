import { Router } from 'express'
import { authMiddleware, coachMiddleware } from '../middleware/auth.js'
import * as coaches from '../controllers/coachesController.js'
import * as reviews from '../controllers/coachReviewsController.js'
import * as engagement from '../controllers/coachEngagementController.js'
import * as messaging from '../controllers/coachMessagingController.js'

const router = Router()

router.use(authMiddleware, coachMiddleware)

router.get('/me', coaches.getCoachMe)
router.get('/me/engagement/attention', engagement.getEngagementAttention)
router.get('/me/reviews/queue', reviews.getReviewQueue)
router.get('/me/inbox', messaging.getInbox)
router.get('/me/inbox/unread-count', messaging.getInboxUnreadCount)
router.get('/me/programs', coaches.listMyPrograms)
router.get('/me/programs/:program', coaches.getMyProgram)
router.get('/me/programs/:program/participants/:userId', coaches.getMyParticipant)
router.get('/me/programs/:program/participants/:userId/messages', messaging.getThread)
router.post('/me/programs/:program/participants/:userId/messages', messaging.postThreadMessage)
router.get('/me/programs/:program/participants/:userId/reviews', reviews.listReviews)
router.put('/me/programs/:program/participants/:userId/reviews', reviews.upsertReview)
router.get('/me/programs/:program/participants/:userId/feedback', reviews.listFeedback)
router.post('/me/programs/:program/participants/:userId/feedback', reviews.createFeedback)

export default router
