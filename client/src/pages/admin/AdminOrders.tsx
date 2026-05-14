import { useState, useEffect } from 'react'
import { Eye } from 'lucide-react'
import api from '../../api/index'

interface OrderItem {
  product_id: string
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

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/orders')
      setOrders(Array.isArray(response.data) ? response.data : [])
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
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedOrder(null)
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

  if (loading) {
    return <div className="text-lg text-gray-600">Loading orders...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Orders</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="all">All Orders</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Order ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Payment Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">M-Pesa Receipt</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 font-semibold">
                      KES {order.total_amount.toFixed(2)}
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
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{order.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openModal(order)}
                        className="inline-flex items-center gap-2 px-3 py-1 text-primary hover:bg-primary hover:text-white rounded transition"
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

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-100 border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-600 hover:text-gray-900 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-mono font-semibold">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">
                      {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-primary">
                      KES {selectedOrder.total_amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        selectedOrder.payment_status
                      )}`}
                    >
                      {selectedOrder.payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-semibold">{selectedOrder.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Address</p>
                    <p className="font-semibold">{selectedOrder.delivery_address || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                <div className="space-y-3">
                  {selectedOrder.mpesa_receipt && (
                    <div>
                      <p className="text-sm text-gray-600">M-Pesa Receipt</p>
                      <p className="font-mono font-semibold">{selectedOrder.mpesa_receipt}</p>
                    </div>
                  )}
                  {selectedOrder.checkout_request_id && (
                    <div>
                      <p className="text-sm text-gray-600">Checkout Request ID</p>
                      <p className="font-mono text-sm">{selectedOrder.checkout_request_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items (if available) */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                  <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          Product {idx + 1} x {item.quantity}
                        </span>
                        <span className="font-semibold">
                          KES {(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-100 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
