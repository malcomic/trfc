import api from '../index';
export const getTicketsForAdmin = async () => {
    const response = await api.get('/admin/tickets');
    return response.data;
};
//# sourceMappingURL=tickets.js.map