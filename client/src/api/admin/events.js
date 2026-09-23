import api from '../index';
export const getEventsForAdmin = async () => {
    const response = await api.get('/admin/events');
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
export const createEventTicketType = async (eventId, data) => {
    const response = await api.post(`/admin/events/${eventId}/ticket-types`, data);
    return response.data;
};
export const updateEventTicketType = async (eventId, typeId, data) => {
    const response = await api.put(`/admin/events/${eventId}/ticket-types/${typeId}`, data);
    return response.data;
};
export const deleteEventTicketType = async (eventId, typeId) => {
    const response = await api.delete(`/admin/events/${eventId}/ticket-types/${typeId}`);
    return response.data;
};
//# sourceMappingURL=events.js.map