import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { getEventsForAdmin, createEvent, updateEvent, deleteEvent } from '../../api/admin/events'

interface Event {
  id: string
  title: string
  description?: string
  location?: string
  event_date: string
  price: number
  capacity?: number
  image_url?: string
  is_active: boolean
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await getEventsForAdmin()
      setEvents(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to fetch events')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      if (editingId) {
        await updateEvent(editingId, {
          ...data,
          price: parseFloat(data.price),
          capacity: data.capacity ? parseInt(data.capacity) : null,
          is_active: data.is_active === 'on',
        })
      } else {
        await createEvent({
          ...data,
          price: parseFloat(data.price),
          capacity: data.capacity ? parseInt(data.capacity) : null,
        })
      }
      setShowModal(false)
      setEditingId(null)
      reset()
      fetchEvents()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save event')
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(id)
        fetchEvents()
      } catch (err: any) {
        setError('Failed to delete event')
        console.error(err)
      }
    }
  }

  const handleEdit = (event: Event) => {
    setEditingId(event.id)
    reset(event)
    setShowModal(true)
  }

  if (loading) {
    return <div className="text-lg text-gray-600">Loading events...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Manage Events</h1>
        <button
          onClick={() => {
            setEditingId(null)
            reset()
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition"
        >
          <Plus size={20} />
          New Event
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Title</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{event.title}</td>
                <td className="px-6 py-4">{new Date(event.event_date).toLocaleDateString()}</td>
                <td className="px-6 py-4">KES {event.price}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    event.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(event)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
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
              <h2 className="text-2xl font-bold">{editingId ? 'Edit Event' : 'New Event'}</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  {...register('title', { required: 'Title is required' })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                {errors.title && <span className="text-red-600 text-sm">{errors.title.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Date *</label>
                <input
                  type="datetime-local"
                  {...register('event_date', { required: 'Date is required' })}
                  className="w-full border rounded-lg px-3 py-2"
                />
                {errors.event_date && <span className="text-red-600 text-sm">{errors.event_date.message as string}</span>}
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
                <label className="block text-sm font-semibold mb-1">Location</label>
                <input
                  type="text"
                  {...register('location')}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Capacity</label>
                <input
                  type="number"
                  {...register('capacity')}
                  className="w-full border rounded-lg px-3 py-2"
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
                      defaultChecked={events.find(e => e.id === editingId)?.is_active}
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
