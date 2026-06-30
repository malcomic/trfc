import api from '../index';
export const getGallery = async () => {
    const response = await api.get('/gallery');
    return response.data;
};
export const uploadGalleryFile = async (formData) => {
    const response = await api.post('/gallery/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};
export const uploadMedia = async (data) => {
    const response = await api.post('/gallery', data);
    return response.data;
};
export const updateMedia = async (id, data) => {
    const response = await api.put(`/gallery/${id}`, data);
    return response.data;
};
export const reorderHeroSlides = async (items) => {
    const response = await api.patch('/gallery/hero/reorder', { items });
    return response.data;
};
export const deleteMedia = async (id) => {
    const response = await api.delete(`/gallery/${id}`);
    return response.data;
};
//# sourceMappingURL=gallery.js.map