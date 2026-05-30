import { Router } from 'express'
import { analyticsController } from '../controllers/analyticsController'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = Router()

// All analytics endpoints require authentication and admin role
router.use(authMiddleware, adminMiddleware)

// Dashboard summary
router.get('/summary', analyticsController.getDashboardSummary)

// Revenue endpoints
router.get('/revenue/timeline', analyticsController.getRevenueTimeline)
router.get('/revenue/by-product', analyticsController.getTopProducts)
router.get('/revenue/by-category', analyticsController.getRevenueByCategory)
router.get('/revenue/by-event', analyticsController.getTopEvents)

// Payment endpoints
router.get('/payments/stats', analyticsController.getPaymentStats)
router.get('/payments/timeline', analyticsController.getPaymentTimeline)

// User endpoints
router.get('/users/stats', analyticsController.getUserStats)
router.get('/users/growth', analyticsController.getUserGrowth)

// Order endpoints
router.get('/orders/stats', analyticsController.getOrderStats)

// Equipment endpoints
router.get('/equipment/stats', analyticsController.getEquipmentStats)

// Events endpoints
router.get('/events/top', analyticsController.getTopEvents)
router.get('/events/attendance', analyticsController.getEventAttendance)

export default router
