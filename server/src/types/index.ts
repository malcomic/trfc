export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'member' | 'admin' | 'scanner';
  created_at: Date;
}

export interface EventTicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  price: number;
  capacity?: number | null;
  sort_order: number;
  is_active: boolean;
  remaining?: number | null;
  is_sold_out?: boolean;
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
  ticket_types?: EventTicketType[];
  min_price?: number | null;
  all_types_sold_out?: boolean;
}

export interface Ticket {
  id: string;
  user_id: string | null;
  event_id: string | null;
  ticket_type_id?: string | null;
  unit_price?: number | null;
  purchase_batch_id?: string | null;
  phone?: string | null;
  email?: string | null;
  attendee_name?: string | null;
  payment_provider?: string | null;
  payment_status: 'pending' | 'paid' | 'failed';
  mpesa_receipt?: string | null;
  checkout_request_id?: string | null;
  checked_in_at?: Date | null;
  checked_in_by?: string | null;
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

export interface MedalTier {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  benefits: string[];
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
}

export interface MedalOption {
  id: string;
  tier_id: string;
  distance_km: number;
  price: number;
  capacity?: number | null;
  is_active: boolean;
}

export interface MedalPurchase {
  id: string;
  user_id: string | null;
  medal_option_id: string;
  purchase_batch_id?: string | null;
  buyer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  payment_provider?: string | null;
  payment_status: 'pending' | 'paid' | 'failed';
  mpesa_receipt?: string | null;
  checkout_request_id?: string | null;
  redeemed_at?: Date | null;
  redeemed_by?: string | null;
  created_at: Date;
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
