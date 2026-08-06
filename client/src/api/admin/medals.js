import api from '../index';
export async function getAdminMedals() {
    const response = await api.get('/admin/medals');
    return response.data;
}
export async function updateAdminMedalTier(id, data) {
    const response = await api.put(`/admin/medals/${id}`, data);
    return response.data;
}
export async function upsertAdminMedalOption(tierId, data) {
    const response = await api.post(`/admin/medals/${tierId}/options`, data);
    return response.data;
}
export async function deleteAdminMedalOption(tierId, optionId) {
    const response = await api.delete(`/admin/medals/${tierId}/options/${optionId}`);
    return response.data;
}
export async function getAdminMedalPurchases() {
    const response = await api.get('/admin/medals/purchases');
    return response.data;
}
//# sourceMappingURL=medals.js.map