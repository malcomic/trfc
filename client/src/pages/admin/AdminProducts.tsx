import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { getProductsForAdmin, createProduct, updateProduct, deleteProduct } from '../../api/admin/products'
import { uploadImage } from '../../api/admin/upload'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  category: string
  image_url?: string
  is_active: boolean
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
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
      const data = await getProductsForAdmin()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to fetch products')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
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

      const payload = {
        name: data.name,
        category: data.category,
        description: data.description,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        image_url: imageUrl,
      }

      if (editingId) {
        await updateProduct(editingId, {
          ...payload,
          is_active: data.is_active === 'on',
        })
      } else {
        await createProduct(payload)
      }
      setShowModal(false)
      setEditingId(null)
      setFilePreview(null)
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
    reset(product)
    setShowModal(true)
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading products...</div>
  }

  return (
    <div>
      <AdminPageHeader
        title="Products"
        actions={
          <button
            onClick={() => {
              setEditingId(null)
              setFilePreview(null)
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

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <AdminResponsiveData
        isEmpty={products.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
            No products yet
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
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                  <td className="px-6 py-4">{product.name}</td>
                  <td className="px-6 py-4">{product.category}</td>
                  <td className="px-6 py-4">KES {(Number(product.price) || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">{product.stock}</td>
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
        mobile={products.map((product) => (
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
            <AdminMobileCardRow label="Category" value={product.category} />
            <AdminMobileCardRow label="Price" value={`KES ${(Number(product.price) || 0).toFixed(2)}`} />
            <AdminMobileCardRow label="Stock" value={product.stock} />
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
                <input
                  type="text"
                  {...register('category', { required: 'Category is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.category && <span className="text-red-600 dark:text-red-400 text-sm">{errors.category.message as string}</span>}
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

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Stock *</label>
                <input
                  type="number"
                  {...register('stock', { required: 'Stock is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.stock && <span className="text-red-600 dark:text-red-400 text-sm">{errors.stock.message as string}</span>}
              </div>

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
