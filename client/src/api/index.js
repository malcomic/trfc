import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(error);
            }
            const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            const { token, refreshToken: newRefreshToken } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
        }
        catch (refreshError) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
    }
    return Promise.reject(error);
});
export default api;
//# sourceMappingURL=index.js.map