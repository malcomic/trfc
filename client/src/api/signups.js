import api from './index';
export async function createSignup(data) {
    const response = await api.post('/signups', data);
    return response.data;
}
export async function getSignupStatus(signupId) {
    const response = await api.get(`/signups/${signupId}/status`);
    return response.data;
}
export async function getAdminSignups(filters = {}) {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const response = await api.get('/admin/signups', { params });
    return response.data;
}
//# sourceMappingURL=signups.js.map