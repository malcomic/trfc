import api from '../index';
export const getEquipmentHireForAdmin = async (status) => {
    const params = status && status !== 'all' ? { status } : {};
    const response = await api.get('/admin/equipment/hire', { params });
    return response.data;
};
//# sourceMappingURL=equipment.js.map