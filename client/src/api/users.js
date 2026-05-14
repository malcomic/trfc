import api from './index';
export const getAllUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};
export const updateUserRole = async (userId, role) => {
    const response = await api.put(`/users/${userId}/role`, { role });
    return response.data;
};
//# sourceMappingURL=users.js.map