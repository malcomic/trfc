import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Plus, X, Edit } from 'lucide-react'
import { getGallery, uploadMedia, updateMedia, deleteMedia } from '../../api/admin/gallery'

interface GalleryItem {
  id: string
  media_url: string
  media_type?: string
  caption?: string
  uploaded_at: string
}

export default function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm()

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      setLoading(true)
      const data = await getGallery()
      setItems(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to fetch gallery')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: GalleryItem) => {
    setEditingId(item.id)
    setValue('caption', item.caption || '')
    setValue('media_type', item.media_type || 'image')
    setShowModal(true)
  }

  const onSubmit = async (data: any) => {
    try {
      if (editingId) {
        await updateMedia(editingId, {
          caption: data.caption,
          media_type: data.media_type,
        })
      } else {
        await uploadMedia({
          media_url: data.media_url,
          media_type: data.media_type || 'image',
          caption: data.caption,
        })
      }
      setShowModal(false)
      setEditingId(null)
      reset()
      fetchGallery()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process request')
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this media?')) {
      try {
        await deleteMedia(id)
        fetchGallery()
      } catch (err: any) {
        setError('Failed to delete media')
        console.error(err)
      }
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600">Loading gallery...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Gallery Manager</h1>
        <button
          onClick={() => {
            setEditingId(null)
            reset()
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition"
        >
          <Plus size={20} />
          Upload Media
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 text-lg">No media in gallery yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90"
          >
            Upload First Media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                <img
                  src={item.media_url}
                  alt={item.caption || 'Gallery item'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Invalid+URL'
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {item.caption && (
                  <p className="text-sm text-gray-700 mb-2">{item.caption}</p>
                )}
                <p className="text-xs text-gray-500">
                  {item.media_type || 'image'} • {new Date(item.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">{editingId ? 'Edit Media' : 'Upload Media'}</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingId(null)
                  reset()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Media URL *</label>
                  <input
                    type="url"
                    {...register('media_url', { required: !editingId ? 'Media URL is required' : false })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {errors.media_url && <span className="text-red-600 text-sm">{errors.media_url.message as string}</span>}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">Media Type</label>
                <select
                  {...register('media_type')}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Caption</label>
                <textarea
                  {...register('caption')}
                  placeholder="Optional caption for this media"
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingId(null)
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
                  {editingId ? 'Update' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
