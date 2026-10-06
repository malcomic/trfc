import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus, ImageOff } from 'lucide-react'
import {
  getProductCategoriesForAdmin,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from '../../api/admin/productCategories'
import { uploadImage } from '../../api/admin/upload'
import type { ProductCategory } from '../../types'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import ProductsSectionTabs from '../../components/admin/ProductsSectionTabs'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface CategoryFormValues {
  name: string
  slug: string
  description: string
  image_url: string
  sort_order: number | string
  is_active: boolean
  file?: FileList
}

function CategoryThumb({ category }: { category: ProductCategory }) {
  if (!category.image_url) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
        <ImageOff size={18} />
      </div>
    )
  }
  return (
    <img
      src={category.image_url}
      alt={category.name}
      className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
    />
  )
}

function StatusBadge({ active, small }: { active: boolean; small?: boolean }) {
  return (
    <span className={`${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-semibold ${
      active
        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function AdminProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CategoryFormValues>()

  const nameValue = watch('name')
  const fileInput = watch('file')
  const imageUrlValue = watch('image_url')

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (!slugTouched && showModal) {
      setValue('slug', slugify(nameValue || ''))
    }
  }, [nameValue, slugTouched, showModal, setValue])

  useEffect(() => {
    if (fileInput && fileInput.length > 0) {
      const reader = new FileReader()
      reader.onloadend = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(fileInput[0])
    } else {
      setFilePreview(null)
    }
  }, [fileInput])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const data = await getProductCategoriesForAdmin()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to fetch categories')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFilePreview(null)
    reset()
  }

  const openCreateModal = () => {
    setEditingId(null)
    setSlugTouched(false)
    setFilePreview(null)
    reset({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      sort_order: categories.length + 1,
      is_active: true,
    })
    setShowModal(true)
  }

  const handleEdit = (category: ProductCategory) => {
    setEditingId(category.id)
    setSlugTouched(true)
    setFilePreview(null)
    reset({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    })
    setShowModal(true)
  }

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      setSaving(true)
      setError('')

      let imageUrl = data.image_url?.trim() || undefined
      if (data.file && data.file.length > 0) {
        const formData = new FormData()
        formData.append('file', data.file[0])
        formData.append('folder', 'trfc_product_categories')
        const result = await uploadImage(formData)
        imageUrl = result.url
      }

      const payload = {
        name: data.name.trim(),
        slug: data.slug.trim() || undefined,
        description: data.description?.trim() || undefined,
        image_url: imageUrl,
        sort_order: parseInt(String(data.sort_order || '0'), 10) || 0,
        is_active: Boolean(data.is_active),
      }

      if (editingId) {
        await updateProductCategory(editingId, payload)
      } else {
        await createProductCategory(payload)
      }

      closeModal()
      fetchCategories()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      setError('')
      await deleteProductCategory(deleteId)
      fetchCategories()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete category')
      console.error(err)
    } finally {
      setDeleteId(null)
    }
  }

  const slugField = register('slug', {
    required: 'Slug is required',
    pattern: {
      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      message: 'Lowercase letters, numbers, and hyphens only',
    },
  })

  return (
    <div>
      <AdminPageHeader
        title="Products"
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            New Category
          </button>
        }
      />

      <ProductsSectionTabs />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading categories...</div>
      ) : (
        <AdminResponsiveData
          isEmpty={categories.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
              No categories yet. Create one to start organising the shop.
            </div>
          }
          desktop={
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Slug</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Products</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <CategoryThumb category={category} />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{category.slug}</td>
                    <td className="px-6 py-4">{category.product_count ?? 0}</td>
                    <td className="px-6 py-4">{category.sort_order}</td>
                    <td className="px-6 py-4"><StatusBadge active={category.is_active} /></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(category)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px]" aria-label={`Edit ${category.name}`}>
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => setDeleteId(category.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px]" aria-label={`Delete ${category.name}`}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={categories.map((category) => (
            <AdminMobileCard
              key={category.id}
              footer={
                <>
                  <button onClick={() => handleEdit(category)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3">
                    <Edit2 size={18} /> Edit
                  </button>
                  <button onClick={() => setDeleteId(category.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3">
                    <Trash2 size={18} /> Delete
                  </button>
                </>
              }
            >
              <div className="flex items-center gap-3 font-semibold text-gray-900 dark:text-white">
                <CategoryThumb category={category} />
                {category.name}
              </div>
              <AdminMobileCardRow label="Slug" value={category.slug} />
              <AdminMobileCardRow label="Products" value={category.product_count ?? 0} />
              <AdminMobileCardRow label="Order" value={category.sort_order} />
              <AdminMobileCardRow label="Status" value={<StatusBadge active={category.is_active} small />} />
            </AdminMobileCard>
          ))}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Category' : 'New Category'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Name *</label>
                <input
                  type="text"
                  maxLength={50}
                  {...register('name', {
                    required: 'Name is required',
                    maxLength: { value: 50, message: 'Name must be 50 characters or fewer' },
                  })}
                  placeholder="e.g. Apparel"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.name && <span className="text-red-600 dark:text-red-400 text-sm">{errors.name.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Slug *</label>
                <input
                  type="text"
                  {...slugField}
                  onChange={(e) => {
                    setSlugTouched(true)
                    slugField.onChange(e)
                  }}
                  placeholder="e.g. apparel"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Used in the shop link: /shop/c/{watch('slug') || 'slug'}
                </p>
                {errors.slug && <span className="text-red-600 dark:text-red-400 text-sm">{errors.slug.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Description</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Upload Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    {...register('file')}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {(filePreview || imageUrlValue) && (
                    <div className="mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img src={filePreview || imageUrlValue} alt="Cover preview" className="w-full h-full object-cover" />
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

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Sort Order</label>
                <input
                  type="number"
                  {...register('sort_order')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lower numbers appear first in the shop</p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('is_active')} className="w-4 h-4" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active (visible in the shop)</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={deleteId !== null}
        title="Delete category"
        message="Are you sure you want to delete this category? Categories that still have products cannot be deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
