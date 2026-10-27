import { useEffect, useState } from 'react'
import { AlertCircle, Calendar, DollarSign, Download, Eye, FileText, Loader } from 'lucide-react'
import { getPaymentHistory, paymentTypeLabel, type PaymentHistoryItem } from '../../api/payments'
import { downloadReceiptAsCSV, downloadReceiptAsText } from '../../utils/receiptGenerator'
import { cardSurface, inputField } from '../../utils/themeClasses'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import TicketDownloadButton from '../../components/TicketDownloadButton'
import MemberPageHeader from '../../components/member/MemberPageHeader'

const labelClass = 'block font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2'
const fieldLabel = 'text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold tracking-widest uppercase'

function statusClasses(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-500/15 text-green-400 border-green-500/25'
    case 'pending':
      return 'bg-accent/15 light:bg-accent-light/15 text-accent light:text-accent-light border-accent/25 light:border-accent-light/25'
    case 'failed':
      return 'bg-red-500/15 text-red-400 border-red-500/25'
    default:
      return 'bg-smoke light:bg-smoke-light text-fog light:text-fog-light border-white/10 light:border-black/10'
  }
}

export default function MemberPayments() {
  const { notify, refreshKey } = useMemberDashboard()
  const [payments, setPayments] = useState<PaymentHistoryItem[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<PaymentHistoryItem | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    setError('')
    getPaymentHistory()
      .then(setPayments)
      .catch((err: any) => {
        setError(err.response?.data?.error || 'Failed to load payment history')
        setPayments([])
      })
  }, [refreshKey])

  const filtered = (payments ?? []).filter((p) => {
    if (filterType !== 'all' && p.type !== filterType) return false
    if (filterStatus !== 'all' && p.payment_status !== filterStatus) return false
    return true
  })

  const exportCsv = () => {
    if (filtered.length === 0) {
      notify('info', 'Nothing to export', 'No payments match your current filters.')
      return
    }
    downloadReceiptAsCSV(filtered)
    notify('success', 'Export started', 'Your CSV download should begin shortly.')
  }

  return (
    <>
      <MemberPageHeader
        title="PAYMENT"
        highlight="HISTORY"
        subtitle="All your payments, with receipts to download."
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="bg-cta text-cta-ink px-4 py-2.5 font-barlow-condensed font-black text-xs tracking-widest uppercase clip-angled hover:bg-cta/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Export as CSV
          </button>
        }
      />

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className={`${cardSurface} p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
        <div>
          <label className={labelClass}>Payment type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`w-full px-4 py-2.5 clip-angled-sm ${inputField}`}
          >
            <option value="all">All types</option>
            <option value="order">Product orders</option>
            <option value="ticket">Event tickets</option>
            <option value="medal">Medal challenges</option>
            <option value="equipment_hire">Equipment hire</option>
            <option value="wallet">Wallet</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Payment status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full px-4 py-2.5 clip-angled-sm ${inputField}`}
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {payments === null ? (
        <div className="flex justify-center py-10">
          <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${cardSurface} p-12 text-center`}>
          <DollarSign className="w-16 h-16 text-accent/20 light:text-accent-light/20 mx-auto mb-4" />
          <p className="font-barlow-condensed font-bold text-lg tracking-widest uppercase text-fog light:text-fog-light mb-2">
            No payments found
          </p>
          <p className="text-sm text-fog light:text-fog-light">
            {payments.length === 0 ? 'You have not made any payments yet' : 'No payments match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => (
            <div
              key={`${payment.type}-${payment.id}`}
              className={`${cardSurface} hover:border-accent/25 light:hover:border-accent-light/25 transition-all duration-200 p-5`}
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                <div>
                  <p className={fieldLabel}>Type</p>
                  <p className="font-barlow-condensed font-bold">{paymentTypeLabel(payment)}</p>
                </div>
                <div>
                  <p className={fieldLabel}>Date</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent light:text-accent-light" />
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className={fieldLabel}>Amount</p>
                  <p className="font-bebas text-2xl text-accent light:text-accent-light">
                    {payment.amount ? `KES ${payment.amount.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div>
                  <p className={fieldLabel}>Status</p>
                  <span
                    className={`inline-block px-3 py-1 border text-xs font-barlow-condensed font-bold tracking-widest uppercase ${statusClasses(payment.payment_status)}`}
                  >
                    {payment.payment_status}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-1 flex gap-2 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelected(payment)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-accent light:text-accent-light hover:bg-accent/10 light:hover:bg-accent-light/10 transition clip-angled-sm"
                    title="View receipt"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-barlow-condensed font-bold">View</span>
                  </button>
                  {payment.payment_status === 'paid' && (
                    <>
                      <button
                        type="button"
                        onClick={() => downloadReceiptAsText(payment)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-green-400 hover:bg-green-500/10 transition clip-angled-sm"
                        title="Download receipt"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-barlow-condensed font-bold">Receipt</span>
                      </button>
                      {payment.type === 'ticket' && (
                        <TicketDownloadButton
                          ticketId={payment.id}
                          paymentStatus={payment.payment_status as 'paid' | 'pending' | 'failed'}
                          eventTitle="Event Ticket"
                          className="inline-flex"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div
            className={`${cardSurface} border-white/10 light:border-black/10 clip-angled-sm shadow-lg max-w-md w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-accent light:bg-accent-light text-black light:text-white px-6 py-5">
              <h2 className="font-bebas text-3xl">RECEIPT</h2>
              <p className="font-barlow-condensed text-xs tracking-widest uppercase text-black/70 light:text-white/80 mt-1">
                {new Date(selected.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="p-6 space-y-4 text-chalk light:text-chalk-light">
              <div className="bg-smoke light:bg-smoke-light border border-white/5 light:border-black/8 p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-fog light:text-fog-light">Payment type</span>
                  <span className="font-semibold">{paymentTypeLabel(selected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fog light:text-fog-light">Status</span>
                  <span className={`px-2 py-1 border text-xs font-barlow-condensed font-bold uppercase ${statusClasses(selected.payment_status)}`}>
                    {selected.payment_status}
                  </span>
                </div>
                {selected.amount && (
                  <div className="flex justify-between text-lg font-bebas border-t border-white/10 light:border-black/10 pt-3">
                    <span className="text-fog light:text-fog-light text-sm font-barlow">Amount</span>
                    <span className="text-accent light:text-accent-light">KES {selected.amount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {selected.mpesa_receipt && (
                  <div>
                    <p className="text-fog light:text-fog-light font-barlow-condensed text-xs tracking-widest uppercase">Payment receipt</p>
                    <p className="font-mono font-semibold break-all">{selected.mpesa_receipt}</p>
                  </div>
                )}
                {selected.checkout_request_id && (
                  <div>
                    <p className="text-fog light:text-fog-light font-barlow-condensed text-xs tracking-widest uppercase">Transaction reference</p>
                    <p className="font-mono font-semibold break-all">{selected.checkout_request_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-fog light:text-fog-light font-barlow-condensed text-xs tracking-widest uppercase">Transaction date</p>
                  <p className="font-semibold">{new Date(selected.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 light:border-black/10 px-6 py-4 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`flex-1 px-4 py-2.5 font-barlow-condensed font-bold text-sm clip-angled-sm ${inputField}`}
              >
                Close
              </button>
              {selected.payment_status === 'paid' && (
                <button
                  type="button"
                  onClick={() => {
                    downloadReceiptAsText(selected)
                    setSelected(null)
                  }}
                  className="flex-1 bg-cta text-cta-ink px-4 py-2.5 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-cta/90 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
