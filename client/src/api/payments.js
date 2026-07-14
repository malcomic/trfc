import api from './index';
export async function initiateSTKPush(data) {
    const response = await api.post('/payments/mpesa/stkpush', data);
    return response.data;
}
export async function checkPaymentStatus(checkoutRequestId) {
    const response = await api.get(`/payments/status/${checkoutRequestId}`);
    return response.data;
}
export async function pollPaymentStatus(checkoutRequestId, options = { interval: 5000, timeout: 300000 }) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            try {
                const status = await checkPaymentStatus(checkoutRequestId);
                if (status.ResultCode === '0' ||
                    status.ResultCode === 0 ||
                    status.payment_status === 'paid') {
                    clearInterval(interval);
                    resolve(status);
                }
                if (Date.now() - startTime > options.timeout) {
                    clearInterval(interval);
                    reject(new Error('Payment status check timeout. Please verify payment manually.'));
                }
            }
            catch (error) {
                if (Date.now() - startTime > options.timeout) {
                    clearInterval(interval);
                    reject(error);
                }
            }
        }, options.interval);
    });
}
export async function getPaymentHistory() {
    const response = await api.get('/payments/history');
    return response.data;
}
export async function initializePaystackPayment(data) {
    const response = await api.post('/payments/paystack/initialize', data);
    return response.data;
}
export async function verifyPaystackPayment(reference) {
    const response = await api.get(`/payments/paystack/verify/${encodeURIComponent(reference)}`);
    return response.data;
}
export async function initiateEquipmentPayment(data) {
    return initiateSTKPush({
        ...data,
        equipmentHireId: data.equipmentHireId,
    });
}
//# sourceMappingURL=payments.js.map