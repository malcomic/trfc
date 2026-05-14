export declare const getProductsForAdmin: () => Promise<any>;
export declare const createProduct: (data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    image_url?: string;
}) => Promise<any>;
export declare const updateProduct: (id: string, data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    image_url?: string;
    is_active: boolean;
}) => Promise<any>;
export declare const deleteProduct: (id: string) => Promise<any>;
//# sourceMappingURL=products.d.ts.map