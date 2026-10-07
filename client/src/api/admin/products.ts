import api from '../index';

export interface ProductVariantInput {
  size: string;
  stock: number;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category_id: string;
  image_url?: string;
  variants?: ProductVariantInput[];
  distance_options?: string[];
}

export const getProductsForAdmin = async () => {
  const response = await api.get('/admin/products');
  return response.data;
};

export const createProduct = async (data: ProductPayload) => {
  const response = await api.post('/products', data);
  return response.data;
};

export const updateProduct = async (id: string, data: ProductPayload & { is_active: boolean }) => {
  const response = await api.put(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};
