import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkPaymentStatus } from '../api/payments';
export default function PaymentStatusModal({ isOpen, checkoutRequestId, phone, onClose, }) {
    const [status, setStatus] = useState('pending');
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 100;
    const POLL_INTERVAL_MS = 3000;
    const isPaymentSuccess = (result) => {
        const resultCode = result.ResultCode ?? result.resultCode;
        const responseCode = result.ResponseCode ?? result.responseCode;
        return (resultCode === '0' ||
            resultCode === 0 ||
            responseCode === '0' ||
            responseCode === 0 ||
            result.payment_status === 'paid');
    };
    const isPaymentFailed = (result) => {
        const resultCode = result.ResultCode ?? result.resultCode;
        return (resultCode === '1' ||
            resultCode === 1 ||
            result.payment_status === 'failed');
    };
    useEffect(() => {
        if (!isOpen || !checkoutRequestId || status !== 'pending')
            return;
        const timer = setTimeout(() => {
            void checkStatus();
        }, attempts === 0 ? 1000 : POLL_INTERVAL_MS);
        return () => clearTimeout(timer);
    }, [isOpen, checkoutRequestId, attempts, status]);
    const checkStatus = async () => {
        try {
            const result = await checkPaymentStatus(checkoutRequestId);
            if (isPaymentSuccess(result)) {
                setStatus('success');
                return;
            }
            if (isPaymentFailed(result)) {
                setError('Payment was rejected. Please try again.');
                setStatus('failed');
                return;
            }
            if (attempts < MAX_ATTEMPTS) {
                setAttempts((prev) => prev + 1);
            }
            else {
                setError('Payment confirmation timeout. If M-Pesa deducted your money, close this and check your ticket confirmation page.');
                setStatus('failed');
            }
        }
        catch {
            if (attempts < MAX_ATTEMPTS) {
                setAttempts((prev) => prev + 1);
            }
            else {
                setError('Unable to verify payment status. Please check M-Pesa.');
                setStatus('failed');
            }
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-ash border border-white/10 clip-angled-sm shadow-lg max-w-md w-full font-barlow", children: [_jsxs("div", { className: "bg-fire text-white px-6 py-5 border-b border-white/10", children: [_jsx("h2", { className: "font-bebas text-3xl leading-tight", children: "PAYMENT STATUS" }), _jsx("p", { className: "font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-white/80 mt-1", children: "M-Pesa transaction" })] }), _jsxs("div", { className: "p-6 text-chalk", children: [status === 'pending' && (_jsxs("div", { className: "text-center", children: [_jsx(Loader, { className: "w-14 h-14 text-fire animate-spin mx-auto mb-4" }), _jsx("p", { className: "font-barlow-condensed font-bold text-lg letter-spacing-tighter mb-2", children: "Waiting for Confirmation" }), _jsx("p", { className: "text-fog text-sm mb-4", children: "We're waiting for payment confirmation on" }), _jsx("div", { className: "bg-smoke border border-white/10 p-3 mb-4 font-mono text-sm font-semibold break-all text-chalk", children: phone }), _jsx("p", { className: "text-xs text-fog", children: "Check your phone for the M-Pesa prompt. Enter your PIN to complete the transaction." }), _jsx("p", { className: "mt-6 text-sm text-fog", children: "This window will close automatically once payment is confirmed." })] })), status === 'success' && (_jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-14 h-14 text-green-400 mx-auto mb-4" }), _jsx("p", { className: "font-barlow-condensed font-bold text-lg letter-spacing-tighter mb-2", children: "Payment Successful!" }), _jsx("p", { className: "text-fog text-sm mb-4", children: "Your order has been confirmed." }), _jsxs("div", { className: "bg-green-500/10 border border-green-500/25 p-4 text-sm text-green-300", children: [_jsx("p", { className: "font-semibold", children: "Transaction Confirmed" }), _jsx("p", { className: "text-xs mt-1 text-fog", children: "You will receive a confirmation email shortly." })] })] })), status === 'failed' && (_jsxs("div", { className: "text-center", children: [_jsx(AlertCircle, { className: "w-14 h-14 text-red-400 mx-auto mb-4" }), _jsx("p", { className: "font-barlow-condensed font-bold text-lg letter-spacing-tighter mb-2", children: "Payment Failed" }), _jsx("p", { className: "text-fog text-sm mb-4", children: error }), _jsx("div", { className: "bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300", children: _jsx("p", { children: "Please try again or contact support for assistance." }) })] }))] }), _jsx("div", { className: "border-t border-white/10 px-6 py-4 bg-night/50", children: status !== 'pending' && (_jsx("button", { onClick: onClose, className: "w-full bg-fire text-white px-4 py-3 font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember transition-colors duration-200", children: "Close" })) })] }) }));
}
//# sourceMappingURL=PaymentStatusModal.js.map