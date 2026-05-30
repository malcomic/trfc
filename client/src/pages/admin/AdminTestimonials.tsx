import { useState, useEffect } from 'react'
import { Check, Loader } from 'lucide-react'
import { getPendingTestimonials, approveTestimonial } from '../../api/admin/testimonials'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'

interface Testimonial {
  id: string
  member_name: string
  message: string
  rating: number
  created_at: string
}

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    fetchPending()
  }, [])

  const fetchPending = async () => {
    try {
      setLoading(true)
      const data = await getPendingTestimonials()
      setTestimonials(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to fetch pending testimonials')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      setApprovingId(id)
      setError('')
      await approveTestimonial(id)
      setTestimonials(testimonials.filter((t) => t.id !== id))
      setConfirmId(null)
    } catch (err: any) {
      setError('Failed to approve testimonial')
      console.error(err)
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading testimonials...</div>
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-white">Testimonials</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {testimonials.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No pending testimonials to review</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Member</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Message</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Submitted</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                >
                  <td className="px-6 py-4 font-semibold">{t.member_name || 'Anonymous'}</td>
                  <td className="px-6 py-4">{t.rating}/5</td>
                  <td className="px-6 py-4 max-w-md truncate" title={t.message}>
                    {t.message}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setConfirmId(t.id)}
                      disabled={approvingId === t.id}
                      className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 disabled:opacity-50"
                    >
                      {approvingId === t.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check size={18} />
                      )}
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmDialog
        open={confirmId !== null}
        title="Approve testimonial"
        message="This testimonial will be published on the public site."
        confirmLabel="Approve"
        onConfirm={() => confirmId && handleApprove(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
