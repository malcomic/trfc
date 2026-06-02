import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getPaymentHistory } from '../api/payments';
import { Calendar, DollarSign, Download, Eye, Loader, AlertCircle, FileText } from 'lucide-react';
import { downloadReceiptAsText, downloadReceiptAsCSV } from '../utils/receiptGenerator';
import { ToastStack } from '../components/Toast';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
export default function PaymentHistory() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [toasts, setToasts] = useState([]);
    const showToast = (type, title, message) => {
        const id = Date.now();
        setToasts((t) => [...t, { id, type, title, message }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    };
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
    const getStatusClasses = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-green-500/15 text-green-400 border-green-500/25';
            case 'pending':
                return 'bg-fire/15 text-fire border-fire/25';
            case 'failed':
                return 'bg-red-500/15 text-red-400 border-red-500/25';
            default:
                return 'bg-smoke light:bg-smoke-light text-fog light:text-fog-light border-white/10 light:border-black/10';
        }
    };
    const downloadReceipt = (payment) => {
        downloadReceiptAsText(payment);
    };
    const downloadAllAsCSV = () => {
        if (filteredPayments.length === 0) {
            showToast('info', 'Nothing to export', 'No payments match your current filters.');
            return;
        }
        downloadReceiptAsCSV(filteredPayments);
        showToast('success', 'Export started', 'Your CSV download should begin shortly.');
    };
    if (loading) {
        return (_jsx("div", { className: `${pageRoot} py-12 px-4 flex items-center justify-center`, children: _jsxs("div", { className: "text-center", children: [_jsx(Loader, { className: "w-12 h-12 animate-spin text-fire mx-auto mb-4" }), _jsx("p", { className: "text-fog light:text-fog-light font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase", children: "Loading payment history\u2026" })] }) }));
    }
    return (_jsxs("div", { className: `${pageRoot} py-12 px-4`, children: [_jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-fire", children: "Your Account" }), _jsxs("h1", { className: "font-bebas text-5xl leading-tight text-chalk light:text-chalk-light", children: ["PAYMENT ", _jsx("span", { className: "text-fire", children: "HISTORY" })] }), _jsx("p", { className: "text-fog light:text-fog-light mt-2", children: "View all your payments and download receipts" })] }), error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: error })] })), _jsx("div", { className: `${cardSurface} p-6 mb-6`, children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mb-2", children: "Payment Type" }), _jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: `w-full px-4 py-2.5 clip-angled-sm ${inputField} focus:border-fire/40`, children: [_jsx("option", { value: "all", children: "All Types" }), _jsx("option", { value: "order", children: "Product Orders" }), _jsx("option", { value: "ticket", children: "Event Tickets" }), _jsx("option", { value: "equipment_hire", children: "Equipment Hire" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mb-2", children: "Payment Status" }), _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: `w-full px-4 py-2.5 clip-angled-sm ${inputField} focus:border-fire/40`, children: [_jsx("option", { value: "all", children: "All Statuses" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "failed", children: "Failed" })] })] }), _jsx("div", { className: "flex items-end", children: _jsxs("button", { onClick: downloadAllAsCSV, disabled: filteredPayments.length === 0, className: "w-full bg-fire text-white px-4 py-2.5 font-barlow-condensed font-black text-xs letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4" }), "Export as CSV"] }) })] }) }), filteredPayments.length === 0 ? (_jsxs("div", { className: `${cardSurface} p-12 text-center`, children: [_jsx(DollarSign, { className: "w-16 h-16 text-fire/20 mx-auto mb-4" }), _jsx("p", { className: "font-barlow-condensed font-bold text-lg letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mb-2", children: "No payments found" }), _jsx("p", { className: "text-sm text-mist light:text-mist-light", children: payments.length === 0
                                    ? 'You have not made any payments yet'
                                    : 'No payments match your filters' })] })) : (_jsx("div", { className: "space-y-3", children: filteredPayments.map((payment) => (_jsx("div", { className: `${cardSurface} hover:border-fire/25 transition-all duration-200 p-6`, children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4 items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase", children: "Type" }), _jsx("p", { className: "font-barlow-condensed font-bold text-chalk light:text-chalk-light", children: getTypeLabel(payment.type) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase", children: "Date" }), _jsxs("p", { className: "font-semibold flex items-center gap-2 text-chalk light:text-chalk-light", children: [_jsx(Calendar, { className: "w-4 h-4 text-fire" }), new Date(payment.created_at).toLocaleDateString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase", children: "Amount" }), _jsxs("p", { className: "font-bebas text-2xl text-fire flex items-center gap-2", children: [_jsx(DollarSign, { className: "w-4 h-4" }), payment.amount ? `KES ${payment.amount.toLocaleString()}` : '—'] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light mb-1 font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase", children: "Status" }), _jsx("span", { className: `inline-block px-3 py-1 border text-xs font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase ${getStatusClasses(payment.payment_status)}`, children: payment.payment_status })] }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsxs("button", { onClick: () => openReceiptModal(payment), className: "inline-flex items-center gap-2 px-3 py-2 text-fire hover:bg-fire/10 border border-transparent hover:border-fire/20 transition clip-angled-sm", title: "View receipt", children: [_jsx(Eye, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-barlow-condensed font-bold", children: "View" })] }), payment.payment_status === 'paid' && (_jsxs("button", { onClick: () => downloadReceipt(payment), className: "inline-flex items-center gap-2 px-3 py-2 text-green-400 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 transition clip-angled-sm", title: "Download receipt", children: [_jsx(Download, { className: "w-4 h-4" }), _jsx("span", { className: "text-sm font-barlow-condensed font-bold", children: "Download" })] }))] })] }) }, `${payment.type}-${payment.id}`))) })), showModal && selectedPayment && (_jsx("div", { className: "fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: `${cardSurface} border-white/10 light:border-black/10 clip-angled-sm shadow-lg max-w-md w-full`, children: [_jsxs("div", { className: "bg-fire text-white px-6 py-5", children: [_jsx("h2", { className: "font-bebas text-3xl", children: "RECEIPT" }), _jsx("p", { className: "font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-white/80 mt-1", children: new Date(selectedPayment.created_at).toLocaleDateString() })] }), _jsxs("div", { className: "p-6 space-y-4 text-chalk light:text-chalk-light", children: [_jsxs("div", { className: "bg-smoke light:bg-smoke-light border border-white/5 light:border-black/8 p-4 space-y-3 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Payment Type" }), _jsx("span", { className: "font-semibold", children: getTypeLabel(selectedPayment.type) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Status" }), _jsx("span", { className: `px-2 py-1 border text-xs font-barlow-condensed font-bold uppercase ${getStatusClasses(selectedPayment.payment_status)}`, children: selectedPayment.payment_status })] }), selectedPayment.amount && (_jsxs("div", { className: "flex justify-between text-lg font-bebas border-t border-white/10 light:border-black/10 pt-3", children: [_jsx("span", { className: "text-fog light:text-fog-light text-sm font-barlow", children: "Amount" }), _jsxs("span", { className: "text-fire", children: ["KES ", selectedPayment.amount.toLocaleString()] })] }))] }), _jsxs("div", { className: "space-y-2 text-sm", children: [selectedPayment.mpesa_receipt && (_jsxs("div", { children: [_jsx("p", { className: "text-fog light:text-fog-light font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase", children: "M-Pesa Receipt" }), _jsx("p", { className: "font-mono font-semibold break-all", children: selectedPayment.mpesa_receipt })] })), selectedPayment.checkout_request_id && (_jsxs("div", { children: [_jsx("p", { className: "text-fog light:text-fog-light font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase", children: "Transaction Reference" }), _jsx("p", { className: "font-mono font-semibold break-all", children: selectedPayment.checkout_request_id })] })), _jsxs("div", { children: [_jsx("p", { className: "text-fog light:text-fog-light font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase", children: "Transaction Date" }), _jsx("p", { className: "font-semibold", children: new Date(selectedPayment.created_at).toLocaleString() })] })] }), _jsx("div", { className: "bg-green-500/10 border border-green-500/20 p-3 text-center text-sm text-green-300", children: "Thank you for your transaction with TRFC" })] }), _jsxs("div", { className: "border-t border-white/10 light:border-black/10 px-6 py-4 flex justify-between gap-3 bg-night/40 light:bg-ash-light/80", children: [_jsx("button", { onClick: closeModal, className: `flex-1 px-4 py-2.5 font-barlow-condensed font-bold text-sm hover:border-fire transition clip-angled-sm ${inputField}`, children: "Close" }), selectedPayment.payment_status === 'paid' && (_jsxs("button", { onClick: () => {
                                                downloadReceipt(selectedPayment);
                                                closeModal();
                                            }, className: "flex-1 bg-fire text-white px-4 py-2.5 font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember flex items-center justify-center gap-2", children: [_jsx(Download, { className: "w-4 h-4" }), "Download"] }))] })] }) }))] }), _jsx(ToastStack, { toasts: toasts, onDismiss: (id) => setToasts((t) => t.filter((x) => x.id !== id)) })] }));
}
//# sourceMappingURL=PaymentHistory.js.map