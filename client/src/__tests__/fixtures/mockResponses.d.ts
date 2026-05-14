export declare const mockPaymentResponses: {
    initiateSTKPush: {
        checkoutRequestId: string;
        ResponseCode: string;
        ResponseDescription: string;
    };
    paymentStatus: {
        status: string;
        amount: number;
        mpesaReceipt: string;
        checkoutRequestId: string;
    };
    paymentHistory: {
        id: string;
        type: string;
        amount: number;
        payment_status: string;
        mpesa_receipt: string;
        created_at: string;
    }[];
};
export declare const mockOrderResponses: {
    createOrder: {
        id: string;
        user_id: string;
        total_amount: number;
        payment_status: string;
        delivery_address: string;
        created_at: string;
    };
    getOrder: {
        id: string;
        user_id: string;
        items: {
            product_id: string;
            quantity: number;
            unit_price: number;
        }[];
        total_amount: number;
        payment_status: string;
        delivery_address: string;
        created_at: string;
    };
};
export declare const mockAuthResponses: {
    login: {
        token: string;
        user: {
            id: string;
            email: string;
            name: string;
            phone: string;
        };
    };
    register: {
        id: string;
        email: string;
        name: string;
        phone: string;
    };
};
export declare const mockAxios: {
    get: any;
    post: any;
    put: any;
    patch: any;
    delete: any;
    create: any;
};
export declare const createMockApiClient: () => {
    payments: {
        initiateSTKPush: any;
        getPaymentStatus: any;
        getPaymentHistory: any;
    };
    orders: {
        createOrder: any;
        getOrder: any;
    };
    auth: {
        login: any;
        register: any;
    };
};
export declare const mockCartStore: {
    items: never[];
    getTotal: any;
    addItem: any;
    removeItem: any;
    clearCart: any;
    updateQuantity: any;
};
export declare const mockAuthStore: {
    user: null;
    token: null;
    isAuthenticated: boolean;
    login: any;
    logout: any;
    register: any;
};
export declare const waitFor: (callback: () => void, options?: {}) => Promise<void>;
export declare const mockNavigate: any;
export declare const renderWithProviders: (component: any) => Promise<any>;
//# sourceMappingURL=mockResponses.d.ts.map