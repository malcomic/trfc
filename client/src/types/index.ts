export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'member' | 'admin' | 'scanner';
}

export interface EventTicketType {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  price: number;
  capacity: number | null;
  sort_order: number;
  is_active: boolean;
  remaining: number | null;
  is_sold_out: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date: string;
  price?: number;
  capacity?: number;
  image_url?: string;
  is_active: boolean;
  ticket_types?: EventTicketType[];
  min_price?: number | null;
  all_types_sold_out?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  category_id?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
  variants?: ProductVariant[];
  distance_options?: string[];
}

export interface ProductVariant {
  id: string;
  size: string;
  stock: number;
  sort_order: number;
  is_active: boolean;
}

export interface ProductSelection {
  variantId: string | null;
  size: string | null;
  distance: string | null;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  product_count?: number;
}

export interface ProductCategoryWithProducts extends ProductCategory {
  products: Product[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice?: number;
  flashSaleId?: string | null;
  variantId?: string | null;
  size?: string | null;
  distance?: string | null;
}

export interface FlashSale {
  id: string;
  product_id: string;
  sale_price: number | string;
  quantity_limit: number | null;
  starts_at: string;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  sold_units: number;
  remaining: number | null;
  sold_out: boolean;
  product_name?: string;
  regular_price?: number | string;
  product_active?: boolean;
}

export interface FlashSaleOffer {
  id: string;
  product_id: string;
  sale_price: number | string;
  quantity_limit: number | null;
  starts_at: string;
  ends_at: string | null;
  sold_units: number;
  remaining: number | null;
  sold_out: boolean;
  product_name: string;
  product_description?: string | null;
  product_image_url?: string | null;
  regular_price: number | string;
  product_stock?: number | null;
  product_category?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  product_variants?: ProductVariant[];
  distance_options?: string[];
}

export interface FlashSalesResponse {
  accessExpiresAt: string;
  offers: FlashSaleOffer[];
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

export interface MedalOption {
  id: string;
  tier_id: string;
  distance_km: number;
  price: number;
  capacity: number | null;
  is_active: boolean;
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
  options: MedalOption[];
  min_price: number | null;
}
