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
} from '../controllers/ticketsController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', getEvents)
router.get('/:id', getEventById)
router.post('/', authMiddleware, adminMiddleware, createEvent)
router.put('/:id', authMiddleware, adminMiddleware, updateEvent)
router.delete('/:id', authMiddleware, adminMiddleware, deleteEvent)

router.post('/:eventId/tickets', authMiddleware, buyTicket)
router.get('/tickets/list/user', authMiddleware, getUserTickets)
router.get('/tickets/:id', authMiddleware, getTicketById)
router.get('/tickets/:ticketId/download', authMiddleware, downloadTicketPDF)

export default router
