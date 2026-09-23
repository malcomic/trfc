import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus, Ticket } from 'lucide-react'
import {
  getEventsForAdmin,
  createEvent,
  updateEvent,
  deleteEvent,
  createEventTicketType,
  updateEventTicketType,
  deleteEventTicketType,
  AdminEvent,
  AdminTicketType,
} from '../../api/admin/events'
import { uploadImage } from '../../api/admin/upload'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import { formatEventDate, toDatetimeLocalValue } from '../../utils/eventDate'

function formatMinPrice(event: AdminEvent) {
  if (event.min_price == null) return 'No types'
  if (Number(event.min_price) === 0) return 'From FREE'
  return `From KES ${Number(event.min_price).toLocaleString()}`
}

export default function AdminEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const fileInput = watch('file')

  const [typesEvent, setTypesEvent] = useState<AdminEvent | null>(null)
  const [editingType, setEditingType] = useState<AdminTicketType | null>(null)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [typeForm, setTypeForm] = useState({
    name: '',
    price: 0,
    capacity: '' as string | number,
    is_active: true,
  })
  const [savingType, setSavingType] = useState(false)
  const [deleteType, setDeleteType] = useState<{ eventId: string; typeId: string } | null>(null)

  useEffect(() => {
    fetchEvents()
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

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await getEventsForAdmin()
      const list = Array.isArray(data) ? data : []
      setEvents(list)
      if (typesEvent) {
        const refreshed = list.find((e) => e.id === typesEvent.id) || null
        setTypesEvent(refreshed)
      }
    } catch (err: any) {
      setError('Failed to fetch events')
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
        formData.append('folder', 'trfc_events')
        const result = await uploadImage(formData)
        imageUrl = result.url
      }

      const payload = {
        title: data.title,
        description: data.description,
        event_date: data.event_date,
        location: data.location,
        image_url: imageUrl,
      }

      if (editingId) {
        await updateEvent(editingId, {
          ...payload,
          is_active: Boolean(data.is_active),
        })
      } else {
        await createEvent(payload)
      }
      setShowModal(false)
      setEditingId(null)
      setFilePreview(null)
      reset()
      fetchEvents()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save event')
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteEvent(deleteId)
      fetchEvents()
    } catch (err: any) {
      setError('Failed to delete event')
      console.error(err)
    } finally {
      setDeleteId(null)
    }
  }

  const handleEdit = (event: AdminEvent) => {
    setEditingId(event.id)
    setFilePreview(null)
    reset({
      ...event,
      event_date: toDatetimeLocalValue(event.event_date),
    })
    setShowModal(true)
  }

  const openTypeModal = (event: AdminEvent, type?: AdminTicketType) => {
    setTypesEvent(event)
    setEditingType(type || null)
    setTypeForm({
      name: type?.name ?? '',
      price: type?.price ?? 0,
      capacity: type?.capacity ?? '',
      is_active: type?.is_active ?? true,
    })
    setShowTypeModal(true)
  }

  const saveType = async () => {
    if (!typesEvent) return
    const trimmedName = typeForm.name.trim()
    if (!trimmedName) {
      setError('Ticket type name is required')
      return
    }
    try {
      setSavingType(true)
      setError('')
      const payload = {
        name: trimmedName,
        price: Number(typeForm.price),
        capacity:
          typeForm.capacity === '' || typeForm.capacity === null
            ? null
            : Number(typeForm.capacity),
        is_active: typeForm.is_active,
      }
      if (editingType) {
        await updateEventTicketType(typesEvent.id, editingType.id, payload)
      } else {
        await createEventTicketType(typesEvent.id, payload)
      }
      setShowTypeModal(false)
      setEditingType(null)
      await fetchEvents()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save ticket type')
    } finally {
      setSavingType(false)
    }
  }

  const confirmDeleteType = async () => {
    if (!deleteType) return
    try {
      await deleteEventTicketType(deleteType.eventId, deleteType.typeId)
      await fetchEvents()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete ticket type')
    } finally {
      setDeleteType(null)
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading events...</div>
  }

  return (
    <div>
      <AdminPageHeader
        title="Events"
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
            New Event
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <AdminResponsiveData
        isEmpty={events.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
            No events yet
          </div>
        }
        desktop={
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Tickets</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                  <td className="px-6 py-4">{event.title}</td>
                  <td className="px-6 py-4">{formatEventDate(event.event_date, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="px-6 py-4">{event.location || '—'}</td>
                  <td className="px-6 py-4">
                    <div>{formatMinPrice(event)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {event.ticket_types?.length || 0} type(s)
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      event.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setTypesEvent(event)}
                      className="flex items-center gap-1 text-primary dark:text-primary-dark hover:opacity-80 min-h-[44px]"
                      title="Manage tickets"
                    >
                      <Ticket size={18} />
                    </button>
                    <button onClick={() => handleEdit(event)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 min-h-[44px]">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setDeleteId(event.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 min-h-[44px]">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={events.map((event) => (
          <AdminMobileCard
            key={event.id}
            footer={
              <>
                <button onClick={() => setTypesEvent(event)} className="flex items-center gap-1 text-primary dark:text-primary-dark min-h-[44px] px-3">
                  <Ticket size={18} /> Tickets
                </button>
                <button onClick={() => handleEdit(event)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3">
                  <Edit2 size={18} /> Edit
                </button>
                <button onClick={() => setDeleteId(event.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3">
                  <Trash2 size={18} /> Delete
                </button>
              </>
            }
          >
            <p className="font-semibold text-gray-900 dark:text-white">{event.title}</p>
            <AdminMobileCardRow label="Date" value={formatEventDate(event.event_date, { year: 'numeric', month: 'short', day: 'numeric' })} />
            <AdminMobileCardRow label="Location" value={event.location || '—'} />
            <AdminMobileCardRow label="Tickets" value={formatMinPrice(event)} />
            <AdminMobileCardRow
              label="Status"
              value={
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  event.is_active
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}>
                  {event.is_active ? 'Active' : 'Inactive'}
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Event' : 'New Event'}</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Title *</label>
                <input
                  type="text"
                  {...register('title', { required: 'Title is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.title && <span className="text-red-600 dark:text-red-400 text-sm">{errors.title.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Description</label>
                <textarea
                  {...register('description')}
                  rows={6}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Date *</label>
                <input
                  type="datetime-local"
                  {...register('event_date', { required: 'Date is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.event_date && <span className="text-red-600 dark:text-red-400 text-sm">{errors.event_date.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Location</label>
                <input
                  type="text"
                  {...register('location')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                After creating the event, use Manage tickets to add ticket types and prices.
              </p>

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

      {typesEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ticket types</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{typesEvent.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setTypesEvent(null)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 min-h-[44px] px-2"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                type="button"
                onClick={() => openTypeModal(typesEvent)}
                className="flex items-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-4 py-2 rounded-lg hover:opacity-90"
              >
                <Plus size={16} /> Add ticket type
              </button>

              {(typesEvent.ticket_types || []).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No ticket types yet. Add at least one so buyers can purchase tickets.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(typesEvent.ticket_types || []).map((type) => (
                    <li
                      key={type.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {type.name}{' '}
                          {!type.is_active && (
                            <span className="text-xs font-normal text-gray-500">(inactive)</span>
                          )}
                          {type.is_sold_out && (
                            <span className="ml-2 text-xs font-semibold text-red-600 dark:text-red-400">
                              Sold out
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          KES {Number(type.price).toLocaleString()}
                          {type.capacity != null
                            ? ` · Capacity ${type.capacity}${
                                type.remaining != null ? ` · ${type.remaining} left` : ''
                              }`
                            : ' · Unlimited'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openTypeModal(typesEvent, type)}
                          className="text-blue-600 dark:text-blue-400 min-h-[44px] px-2"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteType({ eventId: typesEvent.id, typeId: type.id })}
                          className="text-red-600 dark:text-red-400 min-h-[44px] px-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showTypeModal && typesEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingType ? 'Edit ticket type' : 'Add ticket type'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Name *</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="General, VIP, Early bird…"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Price (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={typeForm.price}
                  onChange={(e) => setTypeForm({ ...typeForm, price: Number(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Capacity</label>
                <input
                  type="number"
                  min={0}
                  value={typeForm.capacity}
                  onChange={(e) => setTypeForm({ ...typeForm, capacity: e.target.value })}
                  placeholder="Leave blank for unlimited"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={typeForm.is_active}
                  onChange={(e) => setTypeForm({ ...typeForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTypeModal(false)
                    setEditingType(null)
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingType}
                  onClick={saveType}
                  className="px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg disabled:opacity-50"
                >
                  {savingType ? 'Saving…' : editingType ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={deleteId !== null}
        title="Delete event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <AdminConfirmDialog
        open={deleteType !== null}
        title="Delete ticket type"
        message="Delete this ticket type? If it has purchases it will be deactivated instead."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteType}
        onCancel={() => setDeleteType(null)}
      />
    </div>
  )
}
