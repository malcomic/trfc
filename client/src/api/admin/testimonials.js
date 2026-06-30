import api from '../index';
export const getPendingTestimonials = async () => {
    const response = await api.get('/testimonials/pending');
    return response.data;
};
export const approveTestimonial = async (id) => {
    const response = await api.put(`/testimonials/${id}/approve`);
    return response.data;
};
export const rejectTestimonial = async (id) => {
    const response = await api.delete(`/testimonials/${id}`);
    return response.data;
};
//# sourceMappingURL=testimonials.js.map