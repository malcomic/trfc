import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import api from '../../api/index';
export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    useEffect(() => {
        fetchOrders();
    }, []);
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/orders');
            setOrders(Array.isArray(response.data) ? response.data : []);
        }
        catch (err) {
            setError('Failed to fetch orders');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter((order) => order.payment_status === filterStatus);
    const openModal = (order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600", children: "Loading orders..." });
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-800", children: "Orders" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-sm font-semibold", children: "Filter by Status:" }), _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary", children: [_jsx("option", { value: "all", children: "All Orders" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "failed", children: "Failed" })] })] })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), _jsx("div", { className: "bg-white rounded-lg shadow-md overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Order ID" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Amount" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Payment Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "M-Pesa Receipt" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold", children: "Date" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold", children: "Actions" })] }) }), _jsx("tbody", { children: filteredOrders.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-6 py-8 text-center text-gray-600", children: "No orders found" }) })) : (filteredOrders.map((order) => (_jsxs("tr", { className: "border-b hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 font-mono text-sm", children: order.id.slice(0, 8) }), _jsxs("td", { className: "px-6 py-4 font-semibold", children: ["KES ", order.total_amount.toFixed(2)] }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.payment_status)}`, children: order.payment_status.toUpperCase() }) }), _jsx("td", { className: "px-6 py-4 font-mono text-sm", children: order.mpesa_receipt ? (_jsx("span", { title: order.mpesa_receipt, children: order.mpesa_receipt })) : (_jsx("span", { className: "text-gray-400", children: "\u2014" })) }), _jsx("td", { className: "px-6 py-4", children: order.phone || '—' }), _jsx("td", { className: "px-6 py-4 text-sm", children: new Date(order.created_at).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4 text-center", children: _jsx("button", { onClick: () => openModal(order), className: "inline-flex items-center gap-2 px-3 py-1 text-primary hover:bg-primary hover:text-white rounded transition", title: "View details", children: _jsx(Eye, { className: "w-4 h-4" }) }) })] }, order.id)))) })] }) }) }), showModal && selectedOrder && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-gray-100 border-b px-6 py-4 flex justify-between items-center", children: [_jsx("h2", { className: "text-xl font-bold", children: "Order Details" }), _jsx("button", { onClick: closeModal, className: "text-gray-600 hover:text-gray-900 text-2xl", children: "\u00D7" })] }), _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Order Information" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Order ID" }), _jsx("p", { className: "font-mono font-semibold", children: selectedOrder.id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Date" }), _jsx("p", { className: "font-semibold", children: new Date(selectedOrder.created_at).toLocaleDateString() })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Total Amount" }), _jsxs("p", { className: "text-xl font-bold text-primary", children: ["KES ", selectedOrder.total_amount.toFixed(2)] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Payment Status" }), _jsx("span", { className: `inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.payment_status)}`, children: selectedOrder.payment_status.toUpperCase() })] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Customer Information" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Phone Number" }), _jsx("p", { className: "font-semibold", children: selectedOrder.phone || '—' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Delivery Address" }), _jsx("p", { className: "font-semibold", children: selectedOrder.delivery_address || '—' })] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Payment Information" }), _jsxs("div", { className: "space-y-3", children: [selectedOrder.mpesa_receipt && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "M-Pesa Receipt" }), _jsx("p", { className: "font-mono font-semibold", children: selectedOrder.mpesa_receipt })] })), selectedOrder.checkout_request_id && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Checkout Request ID" }), _jsx("p", { className: "font-mono text-sm", children: selectedOrder.checkout_request_id })] }))] })] }), selectedOrder.items && selectedOrder.items.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Order Items" }), _jsx("div", { className: "bg-gray-50 rounded p-3 text-sm space-y-2", children: selectedOrder.items.map((item, idx) => (_jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { children: ["Product ", idx + 1, " x ", item.quantity] }), _jsxs("span", { className: "font-semibold", children: ["KES ", (item.unit_price * item.quantity).toFixed(2)] })] }, idx))) })] }))] }), _jsx("div", { className: "bg-gray-100 border-t px-6 py-4 flex justify-end gap-3", children: _jsx("button", { onClick: closeModal, className: "px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold", children: "Close" }) })] }) }))] }));
}
//# sourceMappingURL=AdminOrders.js.map