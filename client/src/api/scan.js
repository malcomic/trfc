import api from './index';
export const listScanEvents = async () => {
    const response = await api.get('/scan/events');
    return response.data;
};
export const lookupScan = async (body) => {
    const response = await api.post('/scan/lookup', body);
    return response.data;
};
export const admitScan = async (body) => {
    const response = await api.post('/scan/admit', body);
    return response.data;
};
//# sourceMappingURL=scan.js.map