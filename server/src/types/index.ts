export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'member' | 'admin';
  created_at: Date;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date: Date;
  price: number;
  capacity?: number;
  image_url?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Ticket {
  id: string;
  user_id: string;
  event_id: string;
  payment_status: 'pending' | 'paid' | 'failed';
  mpesa_receipt?: string;
  created_at: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed';
  mpesa_receipt?: string;
  phone?: string;
  delivery_address?: string;
  created_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
