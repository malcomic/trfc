import api from './index';

export const getProductById = async (id: string) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};
