import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import eventsRoutes from './routes/events.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import testimonialsRoutes from './routes/testimonials.js';
import galleryRoutes from './routes/gallery.js';
import equipmentRoutes from './routes/equipment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/testimonials', testimonialsRoutes);
app.use('/api/gallery', galleryRoutes);

// Start server
const startServer = async () => {
  try {
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL database');
    client.release();

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    process.exit(1);
  }
};

startServer();

export default app;
