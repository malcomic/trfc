export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'member' | 'admin';
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date: string;
  price: number;
  capacity?: number;
  image_url?: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed';
  phone?: string;
  delivery_address?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}
