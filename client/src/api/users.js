import api from './index';
export const getAllUsers = async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
};
export const createUser = async (data) => {
    const response = await api.post('/users', data);
    return response.data;
};
export const updateUser = async (userId, data) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
};
export const updateUserRole = async (userId, role) => {
    const response = await api.put(`/users/${userId}/role`, { role });
    return response.data;
};
export const resetUserPassword = async (userId, password) => {
    const response = await api.put(`/users/${userId}/password`, { password });
    return response.data;
};
export const deleteUser = async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
};
//# sourceMappingURL=users.js.map