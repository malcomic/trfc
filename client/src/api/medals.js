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
export async function downloadMedalPdf(purchaseId, verify) {
    try {
        const response = await api.get(`/medals/purchases/${purchaseId}/download`, {
            responseType: 'blob',
            params: {
                ...(verify?.email ? { email: verify.email } : {}),
                ...(verify?.phone ? { phone: verify.phone } : {}),
            },
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `medal-${purchaseId.replace(/-/g, '').slice(0, 8).toUpperCase()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    catch (error) {
        console.error('❌ Error downloading medal PDF:', error);
        throw error;
    }
}
export async function resendMedalEmail(data) {
    const response = await api.post('/medals/purchases/resend', data);
    return response.data;
}
//# sourceMappingURL=medals.js.map