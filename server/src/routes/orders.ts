import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrderStatus } from '../controllers/ordersController.js';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, getOrders);
router.get('/:id', optionalAuthMiddleware, getOrderById);
router.post('/', optionalAuthMiddleware, createOrder);
router.put('/:id', authMiddleware, adminMiddleware, updateOrderStatus);

export default router;
