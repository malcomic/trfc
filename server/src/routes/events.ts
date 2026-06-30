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
<<<<<<< HEAD
  downloadTicketPDF,
=======
  getTicketsByCheckoutRequestId,
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
} from '../controllers/ticketsController.js'
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', getEvents)
router.get('/tickets/list/user', authMiddleware, getUserTickets)
router.get('/tickets/checkout/:checkoutRequestId', optionalAuthMiddleware, getTicketsByCheckoutRequestId)
router.get('/tickets/:id', optionalAuthMiddleware, getTicketById)
router.post('/:eventId/tickets', optionalAuthMiddleware, buyTicket)
router.get('/:id', getEventById)
router.post('/', authMiddleware, adminMiddleware, createEvent)
router.put('/:id', authMiddleware, adminMiddleware, updateEvent)
router.delete('/:id', authMiddleware, adminMiddleware, deleteEvent)

<<<<<<< HEAD
router.post('/:eventId/tickets', authMiddleware, buyTicket)
router.get('/tickets/list/user', authMiddleware, getUserTickets)
router.get('/tickets/:id', authMiddleware, getTicketById)
router.get('/tickets/:ticketId/download', authMiddleware, downloadTicketPDF)

=======
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
export default router
