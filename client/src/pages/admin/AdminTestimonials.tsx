import { useState, useEffect } from 'react'
import { Check, Loader, X } from 'lucide-react'
import { getPendingTestimonials, approveTestimonial, rejectTestimonial } from '../../api/admin/testimonials'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

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
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null)

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

  const handleReject = async (id: string) => {
    try {
      setRejectingId(id)
      setError('')
      await rejectTestimonial(id)
      setTestimonials(testimonials.filter((t) => t.id !== id))
      setRejectConfirmId(null)
    } catch (err) {
      setError('Failed to reject testimonial')
      console.error(err)
    } finally {
      setRejectingId(null)
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading testimonials...</div>
  }

  return (
    <div>
      <AdminPageHeader title="Testimonials" />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <AdminResponsiveData
        isEmpty={testimonials.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No pending testimonials to review</p>
          </div>
        }
        desktop={
          <table className="w-full min-w-[640px]">
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setConfirmId(t.id)}
                        disabled={approvingId === t.id || rejectingId === t.id}
                        className="flex items-center gap-1 text-green-600 dark:text-green-400 disabled:opacity-50 min-h-[44px]"
                      >
                        {approvingId === t.id ? <Loader className="w-4 h-4 animate-spin" /> : <Check size={18} />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectConfirmId(t.id)}
                        disabled={approvingId === t.id || rejectingId === t.id}
                        className="flex items-center gap-1 text-red-600 dark:text-red-400 disabled:opacity-50 min-h-[44px]"
                      >
                        {rejectingId === t.id ? <Loader className="w-4 h-4 animate-spin" /> : <X size={18} />}
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={testimonials.map((t) => (
          <AdminMobileCard
            key={t.id}
            footer={
              <>
                <button
                  onClick={() => setConfirmId(t.id)}
                  disabled={approvingId === t.id || rejectingId === t.id}
                  className="flex items-center gap-1 text-green-600 dark:text-green-400 disabled:opacity-50 min-h-[44px] px-3"
                >
                  {approvingId === t.id ? <Loader className="w-4 h-4 animate-spin" /> : <Check size={18} />}
                  Approve
                </button>
                <button
                  onClick={() => setRejectConfirmId(t.id)}
                  disabled={approvingId === t.id || rejectingId === t.id}
                  className="flex items-center gap-1 text-red-600 dark:text-red-400 disabled:opacity-50 min-h-[44px] px-3"
                >
                  {rejectingId === t.id ? <Loader className="w-4 h-4 animate-spin" /> : <X size={18} />}
                  Reject
                </button>
              </>
            }
          >
            <p className="font-semibold text-gray-900 dark:text-white">{t.member_name || 'Anonymous'}</p>
            <AdminMobileCardRow label="Rating" value={`${t.rating}/5`} />
            <AdminMobileCardRow label="Submitted" value={new Date(t.created_at).toLocaleDateString()} />
            <p className="text-sm text-gray-700 dark:text-gray-300 pt-1">{t.message}</p>
          </AdminMobileCard>
        ))}
      />

      <AdminConfirmDialog
        open={confirmId !== null}
        title="Approve testimonial"
        message="This testimonial will be published on the site."
        confirmLabel="Approve"
        onConfirm={() => confirmId && handleApprove(confirmId)}
        onCancel={() => setConfirmId(null)}
      />

      <AdminConfirmDialog
        open={rejectConfirmId !== null}
        title="Reject testimonial"
        message="This testimonial will be permanently deleted."
        confirmLabel="Reject"
        onConfirm={() => rejectConfirmId && handleReject(rejectConfirmId)}
        onCancel={() => setRejectConfirmId(null)}
      />
    </div>
  )
}
