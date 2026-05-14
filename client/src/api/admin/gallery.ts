import api from '../index';

export const getGallery = async () => {
  const response = await api.get('/gallery');
  return response.data;
};

export const uploadMedia = async (data: {
  media_url: string;
  media_type?: string;
  caption?: string;
}) => {
  const response = await api.post('/gallery', data);
  return response.data;
};

export const updateMedia = async (id: string, data: {
  caption?: string;
  media_type?: string;
}) => {
  const response = await api.put(`/gallery/${id}`, data);
  return response.data;
};

export const deleteMedia = async (id: string) => {
  const response = await api.delete(`/gallery/${id}`);
  return response.data;
};
