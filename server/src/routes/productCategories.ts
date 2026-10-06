import { Router } from 'express'
import {
  getProductCategories,
  getProductCategoryBySlug,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from '../controllers/productCategoriesController.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', getProductCategories)
router.get('/:slug', getProductCategoryBySlug)
router.post('/', authMiddleware, adminMiddleware, createProductCategory)
router.put('/:id', authMiddleware, adminMiddleware, updateProductCategory)
router.delete('/:id', authMiddleware, adminMiddleware, deleteProductCategory)

export default router
