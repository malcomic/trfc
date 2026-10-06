import api from '../index'
import type { ProductCategory } from '../../types'

export interface ProductCategoryPayload {
  name: string
  slug?: string
  description?: string
  image_url?: string
  sort_order: number
  is_active: boolean
}

export const getProductCategoriesForAdmin = async (): Promise<ProductCategory[]> => {
  const response = await api.get('/admin/product-categories')
  return response.data
}

export const createProductCategory = async (data: ProductCategoryPayload) => {
  const response = await api.post('/product-categories', data)
  return response.data as ProductCategory
}

export const updateProductCategory = async (id: string, data: ProductCategoryPayload) => {
  const response = await api.put(`/product-categories/${id}`, data)
  return response.data as ProductCategory
}

export const deleteProductCategory = async (id: string) => {
  const response = await api.delete(`/product-categories/${id}`)
  return response.data
}
