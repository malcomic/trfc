export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'member' | 'admin' | 'scanner' | 'captain';
  whatsapp?: string | null;
  marketing_opt_in?: boolean | null;
  created_at?: string;
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
  /** 0 = paying in parts is off; anything above 0 allows it. */
  installments_allowed?: number;
  /** Days before the event that a part-paid ticket must be fully paid; null uses the TRFC default. */
  payment_deadline_days?: number | null;
  /** Share of seats held for members until 7 days before the event. */
  member_priority_pct?: number | null;
  cancelled_at?: string | null;
  /** Public: the one-line member priority statement, if the event has one. */
  priority_note?: string | null;
  /** Public: seats this viewer can book right now (null = no limit). */
  seats_available?: number | null;
  sold_out_for_you?: boolean;
  payment_rules?: PaymentRules;
  /** Admin only */
  zones?: { id: string; name: string }[];
  seat_breakdown?: SeatBreakdown | null;
  scan_list_confirmed_at?: string | null;
}

export interface PaymentRules {
  credit_days: number;
  deposit_pct: number;
  deadline_days: number;
  early_notice_hours: number;
  terms_version: string;
}

export interface SeatBreakdown {
  total: number | null;
  priorityPct: number | null;
  memberSeats: number;
  memberTaken: number;
  openTaken: number;
  releaseAt: string | null;
  released: boolean;
  openAvailable: number | null;
  memberPoolAvailable: number | null;
  openedToAll: number;
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
  /** Clothing is delivered on Wednesdays only. */
  is_clothing?: boolean;
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
  product_zones?: ZoneRef[];
}

export interface ZoneRef {
  id: string;
  name: string;
  code?: string;
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

export interface FlashShareRedemption {
  id: string;
  phone: string;
  email: string;
  created_at: string;
  has_paid_order: boolean;
}

export interface FlashShareLink {
  id: string;
  code: string;
  url: string;
  max_uses: number;
  use_count: number;
  sent_to: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  zone_id: string | null;
  zone_name: string | null;
  created_by_name: string | null;
  redemptions: FlashShareRedemption[];
}

export interface FlashSalesResponse {
  accessExpiresAt: string;
  zone: ZoneRef | null;
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
