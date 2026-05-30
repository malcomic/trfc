import { useState, useEffect } from 'react'
import { Eye } from 'lucide-react'
import { getOrdersForAdmin, updateOrderStatus } from '../../api/admin/orders'

interface OrderItem {
  product_id: string
  product_name?: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  user_id: string
  total_amount: number
  payment_status: string
  mpesa_receipt: string | null
  checkout_request_id: string | null
  phone?: string
  delivery_address?: string
  created_at: string
  items?: OrderItem[]
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editReceipt, setEditReceipt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await getOrdersForAdmin()
      setOrders(Array.isArray(response) ? response : [])
    } catch (err: any) {
      setError('Failed to fetch orders')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders =
    filterStatus === 'all'
      ? orders
      : orders.filter((order) => order.payment_status === filterStatus)

  const openModal = (order: Order) => {
    setSelectedOrder(order)
    setEditStatus(order.payment_status)
    setEditReceipt(order.mpesa_receipt || '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedOrder(null)
  }

  const handleSaveStatus = async () => {
    if (!selectedOrder) return
    try {
      setSaving(true)
      setError('')
      const updated = await updateOrderStatus(selectedOrder.id, {
        payment_status: editStatus,
        mpesa_receipt: editReceipt || undefined,
      })
      setOrders(orders.map((o) => (o.id === selectedOrder.id ? { ...o, ...updated } : o)))
      setSelectedOrder({ ...selectedOrder, ...updated })
    } catch (err: any) {
      setError('Failed to update order status')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading orders...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Orders</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary dark:focus:border-primary-dark bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Orders</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Order ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Payment Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">M-Pesa Receipt</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Date</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                  >
                    <td className="px-6 py-4 font-mono text-sm">{order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-semibold">
                      KES {(Number(order.total_amount) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                          order.payment_status
                        )}`}
                      >
                        {order.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {order.mpesa_receipt ? (
                        <span title={order.mpesa_receipt}>{order.mpesa_receipt}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{order.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openModal(order)}
                        className="inline-flex items-center gap-2 px-3 py-1 text-primary dark:text-primary-dark hover:bg-primary dark:hover:bg-primary-dark hover:text-white rounded transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6 text-gray-900 dark:text-gray-100">
              <div>
                <h3 className="text-lg font-semibold mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Order ID</p>
                    <p className="font-mono font-semibold">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                    <p className="font-semibold">
                      {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                    <p className="text-xl font-bold text-primary dark:text-primary-dark">
                      KES {(Number(selectedOrder.total_amount) || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                    <p className="font-semibold">{selectedOrder.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Address</p>
                    <p className="font-semibold">{selectedOrder.delivery_address || '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Update Payment</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">M-Pesa Receipt</label>
                    <input
                      type="text"
                      value={editReceipt}
                      onChange={(e) => setEditReceipt(e.target.value)}
                      placeholder="Optional receipt number"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  {selectedOrder.checkout_request_id && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Checkout Request ID</p>
                      <p className="font-mono text-sm">{selectedOrder.checkout_request_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.product_name || 'Unknown product'} x {item.quantity}
                        </span>
                        <span className="font-semibold">
                          KES {(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-gray-900 dark:text-gray-100"
              >
                Close
              </button>
              <button
                onClick={handleSaveStatus}
                disabled={saving}
                className="px-4 py-2 bg-primary dark:bg-primary-dark text-white rounded-lg hover:opacity-90 font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
