import { useEffect, useState } from 'react'
import { getPaymentHistory, PaymentHistoryItem } from '../api/payments'
import { Calendar, DollarSign, Download, Eye, Loader, AlertCircle, FileText } from 'lucide-react'
import { downloadReceiptAsText, downloadReceiptAsCSV } from '../utils/receiptGenerator'
import { ToastStack, ToastMessage } from '../components/Toast'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = Date.now()
    setToasts((t) => [...t, { id, type, title, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  useEffect(() => {
    fetchPaymentHistory()
  }, [])

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getPaymentHistory()
      setPayments(data)
    } catch (err: any) {
      console.error('Error fetching payment history:', err)
      setError(err.response?.data?.error || 'Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const openReceiptModal = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedPayment(null)
  }

  const filteredPayments = payments.filter((payment) => {
    if (filterType !== 'all' && payment.type !== filterType) return false
    if (filterStatus !== 'all' && payment.payment_status !== filterStatus) return false
    return true
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order':
        return 'Product Order'
      case 'ticket':
        return 'Event Ticket'
      case 'equipment_hire':
        return 'Equipment Hire'
      default:
        return type
    }
  }

  const getStatusClasses = (status: string) => {
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

  const downloadReceipt = (payment: PaymentHistoryItem) => {
    downloadReceiptAsText(payment)
  }

  const downloadAllAsCSV = () => {
    if (filteredPayments.length === 0) {
      showToast('info', 'Nothing to export', 'No payments match your current filters.')
      return
    }
    downloadReceiptAsCSV(filteredPayments)
    showToast('success', 'Export started', 'Your CSV download should begin shortly.')
  }

  if (loading) {
    return (
      <div className={`${pageRoot} py-12 px-4 flex items-center justify-center`}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-accent light:text-accent-light mx-auto mb-4" />
          <p className="text-fog light:text-fog-light font-barlow-condensed font-bold text-xs tracking-widest uppercase">Loading payment history…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${pageRoot} py-12 px-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">
            Your Account
          </div>
          <h1 className="font-bebas text-5xl leading-tight text-chalk light:text-chalk-light">PAYMENT <span className="text-accent light:text-accent-light">HISTORY</span></h1>
          <p className="text-fog light:text-fog-light mt-2">View all your payments and download receipts</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
            <span>{error}</span>
          </div>
        )}

        <div className={`${cardSurface} p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2">Payment Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`w-full px-4 py-2.5 clip-angled-sm ${inputField} focus:border-accent/40 light:focus:border-accent-light/40`}
              >
                <option value="all">All Types</option>
                <option value="order">Product Orders</option>
                <option value="ticket">Event Tickets</option>
                <option value="equipment_hire">Equipment Hire</option>
              </select>
            </div>
            <div>
              <label className="block font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2">Payment Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full px-4 py-2.5 clip-angled-sm ${inputField} focus:border-accent/40 light:focus:border-accent-light/40`}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={downloadAllAsCSV}
                disabled={filteredPayments.length === 0}
                className="w-full bg-accent light:bg-accent-light text-black light:text-white px-4 py-2.5 font-barlow-condensed font-black text-xs tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className={`${cardSurface} p-12 text-center`}>
            <DollarSign className="w-16 h-16 text-accent/20 light:text-accent-light/20 mx-auto mb-4" />
            <p className="font-barlow-condensed font-bold text-lg tracking-widest uppercase text-fog light:text-fog-light mb-2">No payments found</p>
            <p className="text-sm text-mist light:text-mist-light">
              {payments.length === 0
                ? 'You have not made any payments yet'
                : 'No payments match your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <div
                key={`${payment.type}-${payment.id}`}
                className={`${cardSurface} hover:border-accent/25 light:hover:border-accent-light/25 transition-all duration-200 p-6`}
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <p className="text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold tracking-widest uppercase">Type</p>
                    <p className="font-barlow-condensed font-bold text-chalk light:text-chalk-light">{getTypeLabel(payment.type)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold tracking-widest uppercase">Date</p>
                    <p className="font-semibold flex items-center gap-2 text-chalk light:text-chalk-light">
                      <Calendar className="w-4 h-4 text-accent light:text-accent-light" />
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold tracking-widest uppercase">Amount</p>
                    <p className="font-bebas text-2xl text-accent light:text-accent-light flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {payment.amount ? `KES ${payment.amount.toLocaleString()}` : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold tracking-widest uppercase">Status</p>
                    <span
                      className={`inline-block px-3 py-1 border text-xs font-barlow-condensed font-bold tracking-widest uppercase ${getStatusClasses(
                        payment.payment_status
                      )}`}
                    >
                      {payment.payment_status}
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openReceiptModal(payment)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-accent light:text-accent-light hover:bg-accent/10 light:hover:bg-accent-light/10 border border-transparent hover:border-accent/20 light:hover:border-accent-light/20 transition clip-angled-sm"
                      title="View receipt"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-barlow-condensed font-bold">View</span>
                    </button>
                    {payment.payment_status === 'paid' && (
                      <button
                        onClick={() => downloadReceipt(payment)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-green-400 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 transition clip-angled-sm"
                        title="Download receipt"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-barlow-condensed font-bold">Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && selectedPayment && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className={`${cardSurface} border-white/10 light:border-black/10 clip-angled-sm shadow-lg max-w-md w-full`}>
              <div className="bg-accent light:bg-accent-light text-black light:text-white px-6 py-5">
                <h2 className="font-bebas text-3xl">RECEIPT</h2>
                <p className="font-barlow-condensed text-xs tracking-widest uppercase text-white/80 mt-1">
                  {new Date(selectedPayment.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="p-6 space-y-4 text-chalk light:text-chalk-light">
                <div className="bg-smoke light:bg-smoke-light border border-white/5 light:border-black/8 p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-fog light:text-fog-light">Payment Type</span>
                    <span className="font-semibold">{getTypeLabel(selectedPayment.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fog light:text-fog-light">Status</span>
                    <span
                      className={`px-2 py-1 border text-xs font-barlow-condensed font-bold uppercase ${getStatusClasses(
                        selectedPayment.payment_status
                      )}`}
                    >
                      {selectedPayment.payment_status}
                    </span>
                  </div>
                  {selectedPayment.amount && (
                    <div className="flex justify-between text-lg font-bebas border-t border-white/10 light:border-black/10 pt-3">
                      <span className="text-fog light:text-fog-light text-sm font-barlow">Amount</span>
                      <span className="text-accent light:text-accent-light">KES {selectedPayment.amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {selectedPayment.mpesa_receipt && (
                    <div>
                      <p className="text-fog light:text-fog-light font-barlow-condensed text-xs tracking-widest uppercase">M-Pesa Receipt</p>
                      <p className="font-mono font-semibold break-all">{selectedPayment.mpesa_receipt}</p>
                    </div>
                  )}
                  {selectedPayment.checkout_request_id && (
                    <div>
                      <p className="text-fog light:text-fog-light font-barlow-condensed text-xs tracking-widest uppercase">Transaction Reference</p>
                      <p className="font-mono font-semibold break-all">{selectedPayment.checkout_request_id}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-fog light:text-fog-light font-barlow-condensed text-xs tracking-widest uppercase">Transaction Date</p>
                    <p className="font-semibold">{new Date(selectedPayment.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 p-3 text-center text-sm text-green-300">
                  Thank you for your transaction with TRFC
                </div>
              </div>

              <div className="border-t border-white/10 light:border-black/10 px-6 py-4 flex justify-between gap-3 bg-night/40 light:bg-ash-light/80">
                <button
                  onClick={closeModal}
                  className={`flex-1 px-4 py-2.5 font-barlow-condensed font-bold text-sm hover:border-accent light:hover:border-accent-light transition clip-angled-sm ${inputField}`}
                >
                  Close
                </button>
                {selectedPayment.payment_status === 'paid' && (
                  <button
                    onClick={() => {
                      downloadReceipt(selectedPayment)
                      closeModal()
                    }}
                    className="flex-1 bg-accent light:bg-accent-light text-black light:text-white px-4 py-2.5 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  )
}
