import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkPaymentStatus } from '../api/payments';
export default function PaymentStatusModal({ isOpen, checkoutRequestId, phone, onClose, }) {
    const [status, setStatus] = useState('pending');
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    useEffect(() => {
        if (!isOpen || !checkoutRequestId)
            return;
        const timer = setTimeout(() => {
            checkStatus();
        }, 1000);
        return () => clearTimeout(timer);
    }, [isOpen, checkoutRequestId, attempts]);
    const checkStatus = async () => {
        try {
            const result = await checkPaymentStatus(checkoutRequestId);
            if (result.ResultCode === '0' || result.ResultCode === 0) {
                setStatus('success');
            }
            else if (result.ResultCode === '1') {
                setError('Payment was rejected. Please try again.');
                setStatus('failed');
            }
            else {
                if (attempts < 60) {
                    setAttempts(attempts + 1);
                }
                else {
                    setError('Payment confirmation timeout. Please check your M-Pesa');
                    setStatus('failed');
                }
            }
        }
        catch (err) {
            if (attempts < 60) {
                setAttempts(attempts + 1);
            }
            else {
                setError('Unable to verify payment status. Please check M-Pesa.');
                setStatus('failed');
            }
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-lg max-w-md w-full", children: [_jsxs("div", { className: "bg-primary text-white p-6 rounded-t-lg", children: [_jsx("h2", { className: "text-2xl font-bold", children: "Payment Status" }), _jsx("p", { className: "text-sm opacity-90", children: "M-Pesa transaction" })] }), _jsxs("div", { className: "p-6", children: [status === 'pending' && (_jsxs("div", { className: "text-center", children: [_jsx(Loader, { className: "w-16 h-16 text-primary animate-spin mx-auto mb-4" }), _jsx("p", { className: "font-semibold text-lg mb-2", children: "Waiting for Payment Confirmation" }), _jsx("p", { className: "text-gray-600 text-sm mb-4", children: "We're waiting for payment confirmation on" }), _jsx("div", { className: "bg-gray-50 p-3 rounded mb-4 font-mono text-sm font-semibold break-all", children: phone }), _jsx("p", { className: "text-xs text-gray-500", children: "Check your phone for the M-Pesa prompt. Enter your PIN to complete the transaction." }), _jsx("div", { className: "mt-6 text-sm text-gray-600", children: _jsx("p", { children: "This window will close automatically once payment is confirmed." }) })] })), status === 'success' && (_jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-16 h-16 text-green-500 mx-auto mb-4" }), _jsx("p", { className: "font-semibold text-lg mb-2", children: "Payment Successful!" }), _jsx("p", { className: "text-gray-600 text-sm mb-4", children: "Your order has been confirmed." }), _jsxs("div", { className: "bg-green-50 border border-green-200 p-4 rounded text-sm text-green-800 mb-4", children: [_jsx("p", { className: "font-semibold", children: "Transaction Confirmed" }), _jsx("p", { className: "text-xs mt-1", children: "You will receive a confirmation email shortly." })] })] })), status === 'failed' && (_jsxs("div", { className: "text-center", children: [_jsx(AlertCircle, { className: "w-16 h-16 text-red-500 mx-auto mb-4" }), _jsx("p", { className: "font-semibold text-lg mb-2", children: "Payment Failed" }), _jsx("p", { className: "text-gray-600 text-sm mb-4", children: error }), _jsx("div", { className: "bg-red-50 border border-red-200 p-4 rounded text-sm text-red-800", children: _jsx("p", { children: "Please try again or contact support for assistance." }) })] }))] }), _jsx("div", { className: "bg-gray-100 border-t px-6 py-4", children: status !== 'pending' && (_jsx("button", { onClick: onClose, className: "w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 font-semibold", children: "Close" })) })] }) }));
}
//# sourceMappingURL=PaymentStatusModal.js.map