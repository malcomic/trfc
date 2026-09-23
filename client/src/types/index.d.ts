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
//# sourceMappingURL=index.d.ts.map