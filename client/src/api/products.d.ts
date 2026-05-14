import { Product } from '../types';
export declare const getProducts: () => Promise<any>;
export declare const getProductById: (id: string) => Promise<any>;
export declare const createProduct: (data: Partial<Product>) => Promise<any>;
export declare const updateProduct: (id: string, data: Partial<Product>) => Promise<any>;
export declare const deleteProduct: (id: string) => Promise<any>;
//# sourceMappingURL=products.d.ts.map