import api from './index';
import { initiateSTKPush } from './payments';
export const getAvailableEquipment = async () => {
    const response = await api.get('/equipment/available/packages');
    return response.data;
};
export const createEquipmentHireRequest = async (data) => {
    const response = await api.post('/equipment/hire', data);
    return response.data;
};
export const getEquipmentHireById = async (id, phone) => {
    const params = phone ? { phone } : undefined;
    const response = await api.get(`/equipment/hire/${id}`, { params });
    return response.data;
};
export const initiateEquipmentPayment = async (data) => {
    return initiateSTKPush({
        phone: data.phone,
        amount: data.amount,
        equipmentHireId: data.equipmentHireId,
    });
};
//# sourceMappingURL=equipment.js.map