import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { getProductsForAdmin, createProduct, updateProduct, deleteProduct } from '../../api/admin/products'

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
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    fetchProducts()
  }, [])

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
      if (editingId) {
        await updateProduct(editingId, {
          ...data,
          price: parseFloat(data.price),
          stock: parseInt(data.stock),
          is_active: data.is_active === 'on',
        })
      } else {
        await createProduct({
          ...data,
          price: parseFloat(data.price),
          stock: parseInt(data.stock),
        })
      }
      setShowModal(false)
      setEditingId(null)
      reset()
      fetchProducts()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save product')
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id)
        fetchProducts()
      } catch (err: any) {
        setError('Failed to delete product')
        console.error(err)
      }
    }
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    reset(product)
    setShowModal(true)
  }

  if (loading) {
    return <div className="text-lg text-gray-600">Loading products...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Manage Products</h1>
        <button
          onClick={() => {
            setEditingId(null)
            reset()
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition"
        >
          <Plus size={20} />
          New Product
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Stock</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{product.name}</td>
                <td className="px-6 py-4">{product.category}</td>
                <td className="px-6 py-4">KES {product.price.toFixed(2)}</td>
                <td className="px-6 py-4">{product.stock}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    product.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">{editingId ? 'Edit Product' : 'New Product'}</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                {errors.name && <span className="text-red-600 text-sm">{errors.name.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Category *</label>
                <input
                  type="text"
                  {...register('category', { required: 'Category is required' })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                {errors.category && <span className="text-red-600 text-sm">{errors.category.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Price (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { required: 'Price is required' })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                {errors.price && <span className="text-red-600 text-sm">{errors.price.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Stock *</label>
                <input
                  type="number"
                  {...register('stock', { required: 'Stock is required' })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                {errors.stock && <span className="text-red-600 text-sm">{errors.stock.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Image URL</label>
                <input
                  type="url"
                  {...register('image_url')}
                  className="w-full border rounded-lg px-3 py-2"
                />
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
                    <span className="text-sm font-semibold">Active</span>
                  </label>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    reset()
                  }}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
