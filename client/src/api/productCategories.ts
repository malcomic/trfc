import api from './index'
import type { ProductCategory, ProductCategoryWithProducts } from '../types'

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const response = await api.get('/product-categories')
  return response.data
}

export const getProductCategory = async (slug: string): Promise<ProductCategoryWithProducts> => {
  const response = await api.get(`/product-categories/${encodeURIComponent(slug)}`)
  return response.data
}
