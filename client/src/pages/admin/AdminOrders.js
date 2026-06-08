import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { getOrdersForAdmin, updateOrderStatus } from '../../api/admin/orders';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard';
import AdminResponsiveData from '../../components/admin/AdminResponsiveData';
export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editStatus, setEditStatus] = useState('');
    const [editReceipt, setEditReceipt] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        fetchOrders();
    }, []);
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await getOrdersForAdmin();
            setOrders(Array.isArray(response) ? response : []);
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
        setEditStatus(order.payment_status);
        setEditReceipt(order.mpesa_receipt || '');
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };
    const handleSaveStatus = async () => {
        if (!selectedOrder)
            return;
        try {
            setSaving(true);
            setError('');
            const updated = await updateOrderStatus(selectedOrder.id, {
                payment_status: editStatus,
                mpesa_receipt: editReceipt || undefined,
            });
            setOrders(orders.map((o) => (o.id === selectedOrder.id ? { ...o, ...updated } : o)));
            setSelectedOrder({ ...selectedOrder, ...updated });
        }
        catch (err) {
            setError('Failed to update order status');
            console.error(err);
        }
        finally {
            setSaving(false);
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
            case 'failed':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
        }
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading orders..." });
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Orders", actions: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto", children: [_jsx("label", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Filter by Status" }), _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "w-full sm:w-auto px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary dark:focus:border-primary-dark bg-white dark:bg-gray-700 text-gray-900 dark:text-white", children: [_jsx("option", { value: "all", children: "All Orders" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "failed", children: "Failed" })] })] }) }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), _jsx(AdminResponsiveData, { isEmpty: filteredOrders.length === 0, empty: _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400", children: "No orders found" }), desktop: _jsxs("table", { className: "w-full min-w-[720px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Order ID" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Amount" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Payment Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "M-Pesa Receipt" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Date" }), _jsx("th", { className: "px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: filteredOrders.map((order) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4 font-mono text-sm", children: order.id.slice(0, 8) }), _jsxs("td", { className: "px-6 py-4 font-semibold", children: ["KES ", (Number(order.total_amount) || 0).toFixed(2)] }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.payment_status)}`, children: order.payment_status.toUpperCase() }) }), _jsx("td", { className: "px-6 py-4 font-mono text-sm", children: order.mpesa_receipt || '—' }), _jsx("td", { className: "px-6 py-4", children: order.phone || '—' }), _jsx("td", { className: "px-6 py-4 text-sm", children: new Date(order.created_at).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4 text-center", children: _jsx("button", { onClick: () => openModal(order), className: "inline-flex items-center gap-2 px-3 py-2 min-h-[44px] text-primary dark:text-primary-dark hover:bg-primary/10 rounded transition", title: "View details", children: _jsx(Eye, { className: "w-4 h-4" }) }) })] }, order.id))) })] }), mobile: filteredOrders.map((order) => (_jsxs(AdminMobileCard, { footer: _jsxs("button", { onClick: () => openModal(order), className: "flex items-center gap-2 text-primary dark:text-primary-dark min-h-[44px] px-3 font-semibold", children: [_jsx(Eye, { className: "w-4 h-4" }), " View details"] }), children: [_jsxs("p", { className: "font-mono font-semibold text-gray-900 dark:text-white", children: [order.id.slice(0, 8), "\u2026"] }), _jsx(AdminMobileCardRow, { label: "Amount", value: `KES ${(Number(order.total_amount) || 0).toFixed(2)}` }), _jsx(AdminMobileCardRow, { label: "Status", value: _jsx("span", { className: `px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.payment_status)}`, children: order.payment_status.toUpperCase() }) }), _jsx(AdminMobileCardRow, { label: "Phone", value: order.phone || '—' }), _jsx(AdminMobileCardRow, { label: "Date", value: new Date(order.created_at).toLocaleDateString() })] }, order.id))) }), showModal && selectedOrder && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-4 sm:px-6 py-4 flex justify-between items-center", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "Order Details" }), _jsx("button", { onClick: closeModal, className: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl", children: "\u00D7" })] }), _jsxs("div", { className: "p-4 sm:p-6 space-y-6 text-gray-900 dark:text-gray-100", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Order Information" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Order ID" }), _jsx("p", { className: "font-mono font-semibold", children: selectedOrder.id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Date" }), _jsx("p", { className: "font-semibold", children: new Date(selectedOrder.created_at).toLocaleDateString() })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Total Amount" }), _jsxs("p", { className: "text-xl font-bold text-primary dark:text-primary-dark", children: ["KES ", (Number(selectedOrder.total_amount) || 0).toFixed(2)] })] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Customer Information" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Phone Number" }), _jsx("p", { className: "font-semibold", children: selectedOrder.phone || '—' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Delivery Address" }), _jsx("p", { className: "font-semibold", children: selectedOrder.delivery_address || '—' })] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Update Payment" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-gray-400 mb-1", children: "Payment Status" }), _jsxs("select", { value: editStatus, onChange: (e) => setEditStatus(e.target.value), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white", children: [_jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "failed", children: "Failed" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-gray-600 dark:text-gray-400 mb-1", children: "M-Pesa Receipt" }), _jsx("input", { type: "text", value: editReceipt, onChange: (e) => setEditReceipt(e.target.value), placeholder: "Optional receipt number", className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" })] }), selectedOrder.checkout_request_id && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Checkout Request ID" }), _jsx("p", { className: "font-mono text-sm", children: selectedOrder.checkout_request_id })] }))] })] }), selectedOrder.items && selectedOrder.items.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Order Items" }), _jsx("div", { className: "bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm space-y-2", children: selectedOrder.items.map((item, idx) => (_jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { children: [item.product_name || 'Unknown product', " x ", item.quantity] }), _jsxs("span", { className: "font-semibold", children: ["KES ", (Number(item.unit_price) * item.quantity).toFixed(2)] })] }, idx))) })] }))] }), _jsxs("div", { className: "bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3", children: [_jsx("button", { onClick: closeModal, className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-gray-900 dark:text-gray-100", children: "Close" }), _jsx("button", { onClick: handleSaveStatus, disabled: saving, className: "px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 font-semibold disabled:opacity-50", children: saving ? 'Saving...' : 'Save Changes' })] })] }) }))] }));
}
//# sourceMappingURL=AdminOrders.js.map