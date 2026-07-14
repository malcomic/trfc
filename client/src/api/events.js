import api from './index';
export const getEvents = async () => {
    const response = await api.get('/events');
    return response.data;
};
export const getEventById = async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
};
export const createEvent = async (data) => {
    const response = await api.post('/events', data);
    return response.data;
};
export const updateEvent = async (id, data) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
};
export const deleteEvent = async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
};
export const buyEventTickets = async (eventId, data) => {
    const response = await api.post(`/events/${eventId}/tickets`, data);
    return response.data;
};
export const getUserTickets = async () => {
    const response = await api.get('/events/tickets/list/user');
    return response.data;
};
export const getTicketsByCheckoutRequestId = async (checkoutRequestId, options) => {
    const response = await api.get(`/events/tickets/checkout/${checkoutRequestId}`, {
        params: {
            ...(options.email ? { email: options.email } : {}),
            ...(options.phone ? { phone: options.phone } : {}),
        },
    });
    return response.data;
};
//# sourceMappingURL=events.js.map