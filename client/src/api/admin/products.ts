import api from '../index';

export const getProductsForAdmin = async () => {
  const response = await api.get('/admin/products');
  return response.data;
};

export const createProduct = async (data: {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
}) => {
  const response = await api.post('/products', data);
  return response.data;
};

export const updateProduct = async (
  id: string,
  data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    image_url?: string;
    is_active: boolean;
  }
) => {
  const response = await api.put(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};
