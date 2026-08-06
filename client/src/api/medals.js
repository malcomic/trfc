import api from './index';
export const getMedals = async () => {
    const response = await api.get('/medals');
    return response.data;
};
export const getMedalBySlug = async (slug) => {
    const response = await api.get(`/medals/${slug}`);
    return response.data;
};
export const createMedalPurchases = async (slug, data) => {
    const response = await api.post(`/medals/${slug}/purchases`, data);
    return response.data;
};
export const getUserMedalPurchases = async () => {
    const response = await api.get('/medals/purchases/user');
    return response.data;
};
export const getMedalPurchasesByCheckoutRequestId = async (checkoutRequestId, options) => {
    const response = await api.get(`/medals/purchases/checkout/${checkoutRequestId}`, {
        params: {
            ...(options.email ? { email: options.email } : {}),
            ...(options.phone ? { phone: options.phone } : {}),
        },
    });
    return response.data;
};
//# sourceMappingURL=medals.js.map