import api from './index';
export const getGallery = async () => {
    const response = await api.get('/gallery');
    return response.data;
};
//# sourceMappingURL=gallery.js.map