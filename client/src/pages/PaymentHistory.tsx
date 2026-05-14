import { useEffect, useState } from 'react'
import { getPaymentHistory, PaymentHistoryItem } from '../api/payments'
import { Calendar, DollarSign, Download, Eye, Loader, AlertCircle } from 'lucide-react'

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const downloadReceipt = (payment: PaymentHistoryItem) => {
    const receiptContent = `
TRFC - Payment Receipt
================================
Date: ${new Date(payment.created_at).toLocaleDateString()}
Type: ${getTypeLabel(payment.type)}
Status: ${payment.payment_status.toUpperCase()}

Amount: KES ${payment.amount ? payment.amount.toFixed(2) : 'N/A'}
${payment.mpesa_receipt ? `M-Pesa Receipt: ${payment.mpesa_receipt}` : ''}
${payment.checkout_request_id ? `Reference: ${payment.checkout_request_id}` : ''}

Thank you for your transaction!
    `

    const element = document.createElement('a')
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptContent)
    )
    element.setAttribute('download', `receipt-${payment.id}.txt`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading payment history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Payment History</h1>
          <p className="text-gray-600">View all your payments and download receipts</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-semibold mb-2">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Payment Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary"
              >
                <option value="all">All Types</option>
                <option value="order">Product Orders</option>
                <option value="ticket">Event Tickets</option>
                <option value="equipment_hire">Equipment Hire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Payment Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment List */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">No payments found</p>
            <p className="text-gray-500">
              {payments.length === 0
                ? 'You have not made any payments yet'
                : 'No payments match your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={`${payment.type}-${payment.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  {/* Type */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Type</p>
                    <p className="font-semibold">{getTypeLabel(payment.type)}</p>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Date</p>
                    <p className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="font-semibold flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {payment.amount ? `KES ${payment.amount.toFixed(2)}` : '—'}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        payment.payment_status
                      )}`}
                    >
                      {payment.payment_status.toUpperCase()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openReceiptModal(payment)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-primary hover:bg-blue-50 rounded transition"
                      title="View receipt"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-semibold">View</span>
                    </button>
                    {payment.payment_status === 'paid' && (
                      <button
                        onClick={() => downloadReceipt(payment)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded transition"
                        title="Download receipt"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-semibold">Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Receipt Modal */}
        {showModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="bg-primary text-white p-6 rounded-t-lg">
                <h2 className="text-2xl font-bold">Receipt</h2>
                <p className="text-sm opacity-90">
                  {new Date(selectedPayment.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Receipt Details */}
                <div className="bg-gray-50 p-4 rounded space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Type:</span>
                    <span className="font-semibold">{getTypeLabel(selectedPayment.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-semibold ${getStatusColor(
                        selectedPayment.payment_status
                      )}`}
                    >
                      {selectedPayment.payment_status.toUpperCase()}
                    </span>
                  </div>
                  {selectedPayment.amount && (
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                      <span>Amount:</span>
                      <span className="text-primary">KES {selectedPayment.amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Reference Information */}
                <div className="space-y-2 text-sm">
                  {selectedPayment.mpesa_receipt && (
                    <div>
                      <p className="text-gray-600">M-Pesa Receipt Number</p>
                      <p className="font-mono font-semibold break-all">
                        {selectedPayment.mpesa_receipt}
                      </p>
                    </div>
                  )}
                  {selectedPayment.checkout_request_id && (
                    <div>
                      <p className="text-gray-600">Transaction Reference</p>
                      <p className="font-mono font-semibold break-all">
                        {selectedPayment.checkout_request_id}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Transaction Date</p>
                    <p className="font-semibold">
                      {new Date(selectedPayment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Thank You Message */}
                <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                  <p className="text-sm text-green-800">
                    Thank you for your transaction with TRFC
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="bg-gray-100 border-t px-6 py-4 flex justify-between gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Close
                </button>
                {selectedPayment.payment_status === 'paid' && (
                  <button
                    onClick={() => {
                      downloadReceipt(selectedPayment)
                      closeModal()
                    }}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 font-semibold flex items-center justify-center gap-2"
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
    </div>
  )
}
