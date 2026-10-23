import { Router } from 'express'
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventsController.js'
import {
  buyTicket,
  getUserTickets,
  getTicketById,
  downloadTicketPDF,
  getTicketsByCheckoutRequestId,
  findTickets,
  updateTicketEmail,
  cancelMyTicket,
} from '../controllers/ticketsController.js'
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.js'
import { simpleRateLimit } from '../middleware/simpleRateLimit.js'

const router = Router()

router.get('/', getEvents)
router.post('/tickets/find', simpleRateLimit(5, 15 * 60_000), findTickets)
router.post('/tickets/update-email', simpleRateLimit(5, 15 * 60_000), updateTicketEmail)
router.get('/tickets/list/user', authMiddleware, getUserTickets)
router.get('/tickets/checkout/:checkoutRequestId', optionalAuthMiddleware, getTicketsByCheckoutRequestId)
router.get('/tickets/:ticketId/download', optionalAuthMiddleware, downloadTicketPDF)
router.get('/tickets/:id', optionalAuthMiddleware, getTicketById)
router.post('/tickets/:id/cancel', authMiddleware, simpleRateLimit(10, 15 * 60_000), cancelMyTicket)
router.post('/:eventId/tickets', optionalAuthMiddleware, buyTicket)
router.get('/:id', getEventById)
router.post('/', authMiddleware, adminMiddleware, createEvent)
router.put('/:id', authMiddleware, adminMiddleware, updateEvent)
router.delete('/:id', authMiddleware, adminMiddleware, deleteEvent)

export default router
