import api from '../index';
export const getPartnershipsForAdmin = async (status) => {
    const params = status && status !== 'all' ? { status } : {};
    const response = await api.get('/admin/partnerships', { params });
    return response.data;
};
export const updatePartnershipStatus = async (id, status) => {
    const response = await api.patch(`/admin/partnerships/${id}`, { status });
    return response.data;
};
//# sourceMappingURL=partnerships.js.map