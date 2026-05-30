import api from './index'

export interface Testimonial {
  id: string
  member_name: string
  message: string
  rating: number
  created_at: string
}

export const getTestimonials = async (): Promise<Testimonial[]> => {
  const response = await api.get('/testimonials')
  return response.data
}

export const submitTestimonial = async (data: {
  member_name: string
  message: string
  rating: number
}) => {
  const response = await api.post('/testimonials', data)
  return response.data
}
