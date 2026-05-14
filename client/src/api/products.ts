import api from './index';
import { Product } from '../types';

export const getProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

export const getProductById = async (id: string) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (data: Partial<Product>) => {
  const response = await api.post('/products', data);
  return response.data;
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const response = await api.put(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};
