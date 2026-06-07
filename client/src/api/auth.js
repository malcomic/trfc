import api from './index';
export const registerUser = async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
};
export const loginUser = async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
};
export const logoutUser = async () => {
    const response = await api.post('/auth/logout');
    return response.data;
};
export const refreshToken = async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
};
export const getUserProfile = async () => {
    const response = await api.get('/auth/me');
    return response.data.user;
};
//# sourceMappingURL=auth.js.map