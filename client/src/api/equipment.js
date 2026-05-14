import api from './index';
export const getAvailableEquipment = async () => {
    const response = await api.get('/equipment');
    return response.data;
};
export const createEquipmentHireRequest = async (data) => {
    const response = await api.post('/equipment-hire', data);
    return response.data;
};
export const initiateEquipmentPayment = async (data) => {
    const response = await api.post('/equipment-payment', data);
    return response.data;
};
//# sourceMappingURL=equipment.js.map