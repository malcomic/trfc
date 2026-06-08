import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Plus, X, Edit } from 'lucide-react'
import { getGallery, uploadGalleryFile, uploadMedia, updateMedia, deleteMedia } from '../../api/admin/gallery'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'

interface GalleryItem {
  id: string
  media_url: string
  media_type?: string
  caption?: string
  uploaded_at: string
}

function GalleryMedia({ item }: { item: GalleryItem }) {
  if (item.media_type === 'video') {
    return (
      <video
        src={item.media_url}
        className="w-full h-full object-cover"
        controls
        onError={(e) => {
          (e.target as HTMLVideoElement).style.display = 'none'
        }}
      />
    )
  }
  return (
    <img
      src={item.media_url}
      alt={item.caption || 'Gallery item'}
      className="w-full h-full object-cover"
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Invalid+URL'
      }}
    />
  )
}

export default function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const fileInput = watch('file')

  useEffect(() => {
    fetchGallery()
  }, [])

  useEffect(() => {
    if (fileInput && fileInput.length > 0) {
      const file = fileInput[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }, [fileInput])

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
      setUploading(true)
      setError('')
      if (editingId) {
        await updateMedia(editingId, {
          caption: data.caption,
          media_type: data.media_type,
        })
      } else {
        let mediaUrl = data.media_url
        if (data.file && data.file.length > 0) {
          const file = data.file[0]
          const formData = new FormData()
          formData.append('file', file)
          formData.append('media_type', data.media_type || 'image')

          const result = await uploadGalleryFile(formData)
          mediaUrl = result.url
        }

        if (!mediaUrl) {
          setError('Please provide either a file or URL')
          setUploading(false)
          return
        }

        await uploadMedia({
          media_url: mediaUrl,
          media_type: data.media_type || 'image',
          caption: data.caption,
        })
      }
      setShowModal(false)
      setEditingId(null)
      setFilePreview(null)
      reset()
      fetchGallery()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to process request')
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMedia(deleteId)
      fetchGallery()
    } catch (err: any) {
      setError('Failed to delete media')
      console.error(err)
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading gallery...</div>
  }

  return (
    <div>
      <AdminPageHeader
        title="Gallery"
        actions={
          <button
            onClick={() => {
              setEditingId(null)
              setFilePreview(null)
              reset()
              setShowModal(true)
            }}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto min-h-[44px]"
          >
            <Plus size={20} />
            Upload Media
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No media in gallery yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90"
          >
            Upload First Media
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden hover:shadow-lg transition">
              <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <GalleryMedia item={item} />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {item.caption && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{item.caption}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.media_type || 'image'} • {new Date(item.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Media' : 'Upload Media'}</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingId(null)
                  setFilePreview(null)
                  reset()
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
              {!editingId && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Upload File</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      {...register('file')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {filePreview && (
                      <div className="mt-2 relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm">OR</div>

                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Media URL</label>
                    <input
                      type="url"
                      {...register('media_url')}
                      placeholder="https://example.com/image.jpg"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Media Type</label>
                <select
                  {...register('media_type')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Caption</label>
                <textarea
                  {...register('caption')}
                  placeholder="Optional caption for this media"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingId(null)
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
                  {uploading ? 'Uploading...' : editingId ? 'Update' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={deleteId !== null}
        title="Delete media"
        message="Are you sure you want to delete this media item?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
