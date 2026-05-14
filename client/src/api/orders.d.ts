export declare const getOrders: () => Promise<any>;
export declare const getOrderById: (id: string) => Promise<any>;
export declare const createOrder: (data: {
    items: any[];
    total_amount: number;
    phone: string;
    delivery_address: string;
}) => Promise<any>;
export declare const updateOrderStatus: (id: string, data: {
    payment_status: string;
    mpesa_receipt?: string;
}) => Promise<any>;
//# sourceMappingURL=orders.d.ts.map