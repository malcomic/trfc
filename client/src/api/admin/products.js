import api from '../index';
export const getProductsForAdmin = async () => {
    const response = await api.get('/admin/products');
    return response.data;
};
export const createProduct = async (data) => {
    const response = await api.post('/products', data);
    return response.data;
};
export const updateProduct = async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
};
export const deleteProduct = async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
};
//# sourceMappingURL=products.js.map