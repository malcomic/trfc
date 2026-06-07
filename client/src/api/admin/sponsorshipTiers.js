import api from '../index';
export const getSponsorshipTiersForAdmin = async () => {
    const response = await api.get('/admin/sponsorship-tiers');
    return response.data;
};
export const createSponsorshipTier = async (data) => {
    const response = await api.post('/sponsorship-tiers', data);
    return response.data;
};
export const updateSponsorshipTier = async (id, data) => {
    const response = await api.put(`/sponsorship-tiers/${id}`, data);
    return response.data;
};
export const deleteSponsorshipTier = async (id) => {
    const response = await api.delete(`/sponsorship-tiers/${id}`);
    return response.data;
};
//# sourceMappingURL=sponsorshipTiers.js.map