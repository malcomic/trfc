import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getPaymentHistory } from '../api/payments';
import { Calendar, DollarSign, Download, Eye, Loader, AlertCircle, FileText } from 'lucide-react';
import { downloadReceiptAsText, downloadReceiptAsCSV } from '../utils/receiptGenerator';
export default function PaymentHistory() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    useEffect(() => {
        fetchPaymentHistory();
    }, []);
    const fetchPaymentHistory = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getPaymentHistory();
            setPayments(data);
        }
        catch (err) {
            console.error('Error fetching payment history:', err);
            setError(err.response?.data?.error || 'Failed to load payment history');
        }
        finally {
            setLoading(false);
        }
    };
    const openReceiptModal = (payment) => {
        setSelectedPayment(payment);
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setSelectedPayment(null);
    };
    const filteredPayments = payments.filter((payment) => {
        if (filterType !== 'all' && payment.type !== filterType)
            return false;
        if (filterStatus !== 'all' && payment.payment_status !== filterStatus)
            return false;
        return true;
    });
    const getTypeLabel = (type) => {
        switch (type) {
            case 'order':
                return 'Product Order';
            case 'ticket':
                return 'Event Ticket';
            case 'equipment_hire':
                return 'Equipment Hire';
            default:
                return type;
        }
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
    const downloadReceipt = (payment) => {
        downloadReceiptAsText(payment);
    };
    const downloadAllAsCSV = () => {
        if (filteredPayments.length === 0) {
            alert('No payments to export');
            return;
        }
        downloadReceiptAsCSV(filteredPayments);
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Loader, { className: "w-12 h-12 animate-spin text-primary mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading payment history..." })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen py-12 px-4 bg-gray-50", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-4xl font-bold mb-2", children: "Payment History" }), _jsx("p", { className: "text-gray-600", children: "View all your payments and download receipts" })] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-700 font-semibold mb-2", children: "Error" }), _jsx("p", { className: "text-red-600 text-sm", children: error })] })] })), _jsx("div", { className: "bg-white rounded-lg shadow p-6 mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Payment Type" }), _jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary", children: [_jsx("option", { value: "all", children: "All Types" }), _jsx("option", { value: "order", children: "Product Orders" }), _jsx("option", { value: "ticket", children: "Event Tickets" }), _jsx("option", { value: "equipment_hire", children: "Equipment Hire" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Payment Status" }), _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary", children: [_jsx("option", { value: "all", children: "All Statuses" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "failed", children: "Failed" })] })] }), _jsx("div", { className: "flex items-end", children: _jsxs("button", { onClick: downloadAllAsCSV, disabled: filteredPayments.length === 0, className: "w-full bg-primary text-white px-4 py-2 rounded hover:bg-opacity-90 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4" }), "Export as CSV"] }) })] }) }), filteredPayments.length === 0 ? (_jsxs("div", { className: "bg-white rounded-lg shadow p-12 text-center", children: [_jsx(DollarSign, { className: "w-16 h-16 text-gray-300 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 text-lg mb-2", children: "No payments found" }), _jsx("p", { className: "text-gray-500", children: payments.length === 0
                                ? 'You have not made any payments yet'
                                : 'No payments match your filters' })] })) : (_jsx("div", { className: "space-y-4", children: filteredPayments.map((payment) => (_jsx("div", { className: "bg-white rounded-lg shadow hover:shadow-lg transition p-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4 items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Type" }), _jsx("p", { className: "font-semibold", children: getTypeLabel(payment.type) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Date" }), _jsxs("p", { className: "font-semibold flex items-center gap-2", children: [_jsx(Calendar, { className: "w-4 h-4" }), new Date(payment.created_at).toLocaleDateString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Amount" }), _jsxs("p", { className: "font-semibold flex items-center gap-2", children: [_jsx(DollarSign, { className: "w-4 h-4" }), payment.amount ? `KES ${payment.amount.toFixed(2)}` : '—'] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: "Status" }), _jsx("span", { className: `inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(payment.payment_status)}`, children: payment.payment_status.toUpperCase() })] }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsxs("button", { onClick: () => openReceiptModal(payment), className: "inline-flex items-center gap-2 px-3 py-2 text-primary hover:bg-blue-50 rounded transition", title: "View receipt", children: [_jsx(Eye, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-semibold", children: "View" })] }), payment.payment_status === 'paid' && (_jsxs("button", { onClick: () => downloadReceipt(payment), className: "inline-flex items-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded transition", title: "Download receipt", children: [_jsx(Download, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-semibold", children: "Download" })] }))] })] }) }, `${payment.type}-${payment.id}`))) })), showModal && selectedPayment && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-lg max-w-md w-full", children: [_jsxs("div", { className: "bg-primary text-white p-6 rounded-t-lg", children: [_jsx("h2", { className: "text-2xl font-bold", children: "Receipt" }), _jsx("p", { className: "text-sm opacity-90", children: new Date(selectedPayment.created_at).toLocaleDateString() })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "bg-gray-50 p-4 rounded space-y-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Payment Type:" }), _jsx("span", { className: "font-semibold", children: getTypeLabel(selectedPayment.type) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Status:" }), _jsx("span", { className: `px-2 py-1 rounded text-sm font-semibold ${getStatusColor(selectedPayment.payment_status)}`, children: selectedPayment.payment_status.toUpperCase() })] }), selectedPayment.amount && (_jsxs("div", { className: "flex justify-between text-lg font-bold border-t border-gray-200 pt-3", children: [_jsx("span", { children: "Amount:" }), _jsxs("span", { className: "text-primary", children: ["KES ", selectedPayment.amount.toFixed(2)] })] }))] }), _jsxs("div", { className: "space-y-2 text-sm", children: [selectedPayment.mpesa_receipt && (_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "M-Pesa Receipt Number" }), _jsx("p", { className: "font-mono font-semibold break-all", children: selectedPayment.mpesa_receipt })] })), selectedPayment.checkout_request_id && (_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Transaction Reference" }), _jsx("p", { className: "font-mono font-semibold break-all", children: selectedPayment.checkout_request_id })] })), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Transaction Date" }), _jsx("p", { className: "font-semibold", children: new Date(selectedPayment.created_at).toLocaleString() })] })] }), _jsx("div", { className: "bg-green-50 border border-green-200 rounded p-3 text-center", children: _jsx("p", { className: "text-sm text-green-800", children: "Thank you for your transaction with TRFC" }) })] }), _jsxs("div", { className: "bg-gray-100 border-t px-6 py-4 flex justify-between gap-3", children: [_jsx("button", { onClick: closeModal, className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold", children: "Close" }), selectedPayment.payment_status === 'paid' && (_jsxs("button", { onClick: () => {
                                            downloadReceipt(selectedPayment);
                                            closeModal();
                                        }, className: "flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 font-semibold flex items-center justify-center gap-2", children: [_jsx(Download, { className: "w-4 h-4" }), "Download"] }))] })] }) }))] }) }));
}
//# sourceMappingURL=PaymentHistory.js.map