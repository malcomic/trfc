import api from '../index';
export const uploadImage = async (formData) => {
    const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};
//# sourceMappingURL=upload.js.map