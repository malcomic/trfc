import api from './index';
export const getSponsorshipTiers = async () => {
    const response = await api.get('/sponsorship-tiers');
    return response.data;
};
//# sourceMappingURL=sponsorshipTiers.js.map