import api from './index';
export const submitPartnership = async (data) => {
    const response = await api.post('/partnerships', data);
    return response.data;
};
//# sourceMappingURL=partnerships.js.map