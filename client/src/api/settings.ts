import axios from 'axios'

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api'

export async function getTypography() {
  const response = await axios.get(`${API_URL}/settings/typography`)
  return response.data
}
