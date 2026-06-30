import api from '../index'

export const uploadImage = async (formData: FormData) => {
  const response = await api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data as { url: string }
}
