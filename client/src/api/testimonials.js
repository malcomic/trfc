import api from './index';
export const getTestimonials = async () => {
    const response = await api.get('/testimonials');
    return response.data;
};
export const submitTestimonial = async (data) => {
    const response = await api.post('/testimonials', data);
    return response.data;
};
//# sourceMappingURL=testimonials.js.map