import { useEffect, useState } from 'react'
import { getGallery } from '../api/gallery'

interface GalleryItem {
  id: string
  media_url: string
  media_type?: string
  caption?: string
  uploaded_at: string
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      setLoading(false)
      const data = await getGallery()
      setItems(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to load gallery')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">Loading gallery...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4">Gallery</h1>
        <p className="text-center text-gray-600 mb-12">Moments from our community</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">Gallery coming soon!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="relative w-full h-64 bg-gray-100 overflow-hidden">
                    <img
                      src={item.media_url}
                      alt={item.caption || 'Gallery item'}
                      className="w-full h-full object-cover hover:scale-105 transition"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Invalid+URL'
                      }}
                    />
                  </div>
                  {item.caption && (
                    <div className="p-4">
                      <p className="text-gray-700">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-96 bg-gray-100">
              <img
                src={selectedItem.media_url}
                alt={selectedItem.caption || 'Gallery item'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Invalid+URL'
                }}
              />
            </div>
            {selectedItem.caption && (
              <div className="p-6">
                <p className="text-gray-700 text-lg mb-2">{selectedItem.caption}</p>
                <p className="text-xs text-gray-500">{new Date(selectedItem.uploaded_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
