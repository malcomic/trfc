import api from './index';
export const getGallery = async () => {
    const response = await api.get('/gallery');
    return response.data;
};
export const getHeroSlides = async () => {
    const response = await api.get('/gallery/hero');
    return response.data;
};
//# sourceMappingURL=gallery.js.map