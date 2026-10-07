import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { getProductsForAdmin, createProduct, updateProduct, deleteProduct } from '../../api/admin/products'
import { getProductCategoriesForAdmin } from '../../api/admin/productCategories'
import { uploadImage } from '../../api/admin/upload'
import type { ProductCategory, ProductVariant } from '../../types'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import ProductsSectionTabs from '../../components/admin/ProductsSectionTabs'
import ProductOptionsEditor, {
  EMPTY_OPTIONS_FORM,
  ProductOptionsFormValue,
  optionsFormFromProduct,
  optionsPayload,
  validateOptionsForm,
} from '../../components/admin/ProductOptionsEditor'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  category: string
  category_id?: string | null
  category_name?: string | null
  image_url?: string
  is_active: boolean
  variants?: ProductVariant[]
  distance_options?: string[]
}

function sizeStockHint(product: Product): string | null {
  const active = (product.variants ?? []).filter((v) => v.is_active)
  if (active.length === 0) return null
  return active.map((v) => `${v.size}:${v.stock}`).join(' ')
}

function StockCell({ product }: { product: Product }) {
  const hint = sizeStockHint(product)
  return (
    <span>
      {product.stock}
      {hint && <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
      {(product.distance_options?.length ?? 0) > 0 && (
        <span className="block text-xs text-gray-500 dark:text-gray-400">Distances: {product.distance_options!.join(', ')}</span>
      )}
    </span>
  )
}

const UNCATEGORISED = '__none__'

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [optionsForm, setOptionsForm] = useState<ProductOptionsFormValue>(EMPTY_OPTIONS_FORM)
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const fileInput = watch('file')

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (fileInput && fileInput.length > 0) {
      const file = fileInput[0]
      const reader = new FileReader()
      reader.onloadend = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }, [fileInput])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const [data, categoryData] = await Promise.all([
        getProductsForAdmin(),
        getProductCategoriesForAdmin(),
      ])
      setProducts(Array.isArray(data) ? data : [])
      setCategories(Array.isArray(categoryData) ? categoryData : [])
    } catch (err: any) {
      setError('Failed to fetch products')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const visibleProducts = useMemo(() => {
    if (!categoryFilter) return products
    if (categoryFilter === UNCATEGORISED) return products.filter((p) => !p.category_id)
    return products.filter((p) => p.category_id === categoryFilter)
  }, [products, categoryFilter])

  const categoryLabel = (product: Product) =>
    product.category_name || (product.category ? `${product.category} (unassigned)` : 'Unassigned')

  const onSubmit = async (data: any) => {
    const optionsError = validateOptionsForm(optionsForm)
    if (optionsError) {
      setError(optionsError)
      return
    }
    try {
      setUploading(true)
      setError('')

      let imageUrl = data.image_url || undefined
      if (data.file && data.file.length > 0) {
        const formData = new FormData()
        formData.append('file', data.file[0])
        formData.append('folder', 'trfc_products')
        const result = await uploadImage(formData)
        imageUrl = result.url
      }

      const { variants, distance_options, totalSizeStock } = optionsPayload(optionsForm)
      const payload = {
        name: data.name,
        category_id: data.category_id,
        description: data.description,
        price: parseFloat(data.price),
        stock: optionsForm.sizesEnabled ? totalSizeStock : parseInt(data.stock),
        image_url: imageUrl,
        variants,
        distance_options,
      }

      if (editingId) {
        await updateProduct(editingId, {
          ...payload,
          is_active: data.is_active === 'on' || data.is_active === true,
        })
      } else {
        await createProduct(payload)
      }
      setShowModal(false)
      setEditingId(null)
      setFilePreview(null)
      setOptionsForm(EMPTY_OPTIONS_FORM)
      reset()
      fetchProducts()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save product')
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteProduct(deleteId)
      fetchProducts()
    } catch (err: any) {
      setError('Failed to delete product')
      console.error(err)
    } finally {
      setDeleteId(null)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setFilePreview(null)
    reset({ ...product, category_id: product.category_id ?? '' })
    setOptionsForm(optionsFormFromProduct(product))
    setShowModal(true)
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading products...</div>
  }

  const hasUnassigned = products.some((p) => !p.category_id)

  return (
    <div>
      <AdminPageHeader
        title="Products"
        actions={
          <button
            onClick={() => {
              setEditingId(null)
              setFilePreview(null)
              setOptionsForm(EMPTY_OPTIONS_FORM)
              reset()
              setShowModal(true)
            }}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            New Product
          </button>
        }
      />

      <ProductsSectionTabs />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {categories.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-lg mb-6 text-sm">
          No categories yet. Products must belong to a category before they appear in the shop.{' '}
          <Link to="/admin/products/categories" className="font-semibold underline">Create a category</Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <label htmlFor="product-category-filter" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Filter by category
          </label>
          <select
            id="product-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:w-64"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {hasUnassigned && <option value={UNCATEGORISED}>Unassigned</option>}
          </select>
        </div>
      )}

      <AdminResponsiveData
        isEmpty={visibleProducts.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
            {products.length === 0 ? 'No products yet' : 'No products in this category'}
          </div>
        }
        desktop={
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Stock</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                  <td className="px-6 py-4">{product.name}</td>
                  <td className={`px-6 py-4 ${product.category_id ? '' : 'text-amber-600 dark:text-amber-400'}`}>{categoryLabel(product)}</td>
                  <td className="px-6 py-4">KES {(Number(product.price) || 0).toFixed(2)}</td>
                  <td className="px-6 py-4"><StockCell product={product} /></td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      product.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => handleEdit(product)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px]">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setDeleteId(product.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px]">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={visibleProducts.map((product) => (
          <AdminMobileCard
            key={product.id}
            footer={
              <>
                <button onClick={() => handleEdit(product)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3">
                  <Edit2 size={18} /> Edit
                </button>
                <button onClick={() => setDeleteId(product.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3">
                  <Trash2 size={18} /> Delete
                </button>
              </>
            }
          >
            <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
            <AdminMobileCardRow label="Category" value={categoryLabel(product)} />
            <AdminMobileCardRow label="Price" value={`KES ${(Number(product.price) || 0).toFixed(2)}`} />
            <AdminMobileCardRow label="Stock" value={<StockCell product={product} />} />
            <AdminMobileCardRow
              label="Status"
              value={
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  product.is_active
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              }
            />
          </AdminMobileCard>
        ))}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Product' : 'New Product'}</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Name *</label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.name && <span className="text-red-600 dark:text-red-400 text-sm">{errors.name.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Category *</label>
                <select
                  {...register('category_id', { required: 'Category is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.is_active ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <Link to="/admin/products/categories" className="text-primary dark:text-primary-dark font-semibold hover:underline">
                      Create a category first
                    </Link>
                  </p>
                )}
                {errors.category_id && <span className="text-red-600 dark:text-red-400 text-sm">{errors.category_id.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Price (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { required: 'Price is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.price && <span className="text-red-600 dark:text-red-400 text-sm">{errors.price.message as string}</span>}
              </div>

              {!optionsForm.sizesEnabled && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Stock *</label>
                  <input
                    type="number"
                    {...register('stock', {
                      validate: (v) => optionsForm.sizesEnabled || (v !== '' && v != null) || 'Stock is required',
                    })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {errors.stock && <span className="text-red-600 dark:text-red-400 text-sm">{errors.stock.message as string}</span>}
                </div>
              )}

              <ProductOptionsEditor value={optionsForm} onChange={setOptionsForm} />

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    {...register('file')}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {filePreview && (
                    <div className="mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {!filePreview && editingId && watch('image_url') && (
                    <div className="mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img src={watch('image_url')} alt="Current" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="text-center text-gray-500 dark:text-gray-400 text-sm">OR</div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Image URL</label>
                  <input
                    type="url"
                    {...register('image_url')}
                    placeholder="https://example.com/image.jpg"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('is_active')}
                      defaultChecked={products.find(p => p.id === editingId)?.is_active}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</span>
                  </label>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFilePreview(null)
                    setOptionsForm(EMPTY_OPTIONS_FORM)
                    reset()
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={deleteId !== null}
        title="Delete product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
