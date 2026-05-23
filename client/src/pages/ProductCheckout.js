import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader, Phone, MapPin, Package } from 'lucide-react';
import { createOrder } from '../api/orders';
import { initiateSTKPush, pollPaymentStatus } from '../api/payments';
import PaymentStatusModal from '../components/PaymentStatusModal';
export default function ProductCheckout() {
    const navigate = useNavigate();
    const location = useLocation();
    const orderData = location.state;
    const items = orderData?.items || [];
    const total = orderData?.total_amount || 0;
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [checkoutRequestId, setCheckoutRequestId] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);
    useEffect(() => {
        if (!items.length) {
            navigate('/products');
        }
    }, [items.length, navigate]);
    const validatePhone = (value) => {
        const kenyanPhoneRegex = /^254[0-9]{9}$/;
        return kenyanPhoneRegex.test(value.replace(/\s+/g, ''));
    };
    const formatPhoneNumber = (value) => {
        return value.replace(/\s+/g, '');
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!phone.trim()) {
            setError('Phone number is required');
            return;
        }
        if (!validatePhone(phone)) {
            setError('Please enter a valid Kenyan phone number (254XXXXXXXXX)');
            return;
        }
        if (!address.trim()) {
            setError('Delivery address is required');
            return;
        }
        try {
            setLoading(true);
            const formattedPhone = formatPhoneNumber(phone);
            const orderPayload = {
                items: items.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    unit_price: item.product.price,
                })),
                total_amount: total,
                phone: formattedPhone,
                delivery_address: address,
            };
            const order = await createOrder(orderPayload);
            const paymentPayload = {
                phone: formattedPhone,
                amount: Math.round(total),
                orderId: order.id,
            };
            const paymentResponse = await initiateSTKPush(paymentPayload);
            setCheckoutRequestId(paymentResponse.checkoutRequestId);
            setShowPaymentModal(true);
            setPaymentLoading(true);
            try {
                await pollPaymentStatus(paymentResponse.checkoutRequestId);
                setPaymentLoading(false);
                setSuccess(true);
                setTimeout(() => {
                    navigate('/payment-history');
                }, 2000);
            }
            catch (pollError) {
                setPaymentLoading(false);
                setError(pollError.message ||
                    'Payment status check failed. Please verify in your payment history.');
                setShowPaymentModal(false);
            }
        }
        catch (err) {
            setError(err.response?.data?.error || 'Failed to initiate payment');
        }
        finally {
            setLoading(false);
        }
    };
    if (!items.length) {
        return null;
    }
    return (_jsxs("div", { className: "min-h-screen py-12 px-4 bg-gray-50", children: [_jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("button", { onClick: () => navigate(-1), className: "inline-flex items-center gap-2 text-primary hover:underline mb-4", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), "Back to shopping"] }), _jsx("h1", { className: "text-4xl font-bold mb-2", children: "Checkout" }), _jsx("p", { className: "text-gray-600", children: "Review your order and complete payment" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-2", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6 mb-6", children: [_jsxs("h2", { className: "text-2xl font-bold mb-4 flex items-center gap-2", children: [_jsx(Package, { className: "w-6 h-6" }), "Order Summary"] }), _jsx("div", { className: "space-y-4 mb-6 border-b pb-6", children: items.map((item) => (_jsxs("div", { className: "flex justify-between items-start p-4 bg-gray-50 rounded", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: item.product.name }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Qty: ", item.quantity] })] }), _jsxs("p", { className: "font-semibold", children: ["KES ", (item.product.price * item.quantity).toFixed(2)] })] }, item.product.id))) }), _jsxs("div", { className: "flex justify-between items-center text-lg font-bold", children: [_jsx("span", { children: "Total Amount:" }), _jsxs("span", { className: "text-primary text-2xl", children: ["KES ", total.toFixed(2)] })] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "Delivery Information" }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-700 font-semibold mb-1", children: "Error" }), _jsx("p", { className: "text-red-600 text-sm", children: error })] })] })), success && (_jsxs("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex gap-3", children: [_jsx(Package, { className: "w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-green-700 font-semibold", children: "Payment Successful!" }), _jsx("p", { className: "text-green-600 text-sm", children: "Your order has been confirmed. Redirecting..." })] })] })), _jsxs("div", { className: "space-y-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Phone Number (M-Pesa)" }), _jsxs("div", { className: "relative", children: [_jsx(Phone, { className: "absolute left-3 top-3 w-5 h-5 text-gray-400" }), _jsx("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "254XXXXXXXXX", className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary", disabled: loading || paymentLoading })] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Enter your M-Pesa phone number" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Delivery Address" }), _jsxs("div", { className: "relative", children: [_jsx(MapPin, { className: "absolute left-3 top-3 w-5 h-5 text-gray-400" }), _jsx("textarea", { value: address, onChange: (e) => setAddress(e.target.value), placeholder: "Enter your delivery address", rows: 3, className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary resize-none", disabled: loading || paymentLoading })] })] })] }), _jsx("button", { type: "submit", disabled: loading || paymentLoading, className: "w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 disabled:bg-gray-400 transition flex items-center justify-center gap-2", children: loading || paymentLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-5 h-5 animate-spin" }), "Processing..."] })) : ('Pay with M-Pesa') }), _jsx("p", { className: "text-xs text-gray-500 text-center mt-4", children: "You will be prompted to enter your M-Pesa PIN on your phone" })] })] }), _jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6 sticky top-20", children: [_jsx("h3", { className: "font-bold mb-4", children: "Order Details" }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Items:" }), _jsx("span", { className: "font-semibold", children: items.length })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Subtotal:" }), _jsxs("span", { className: "font-semibold", children: ["KES ", total.toFixed(2)] })] }), _jsxs("div", { className: "flex justify-between border-t pt-3", children: [_jsx("span", { className: "font-bold", children: "Total:" }), _jsxs("span", { className: "font-bold text-primary text-lg", children: ["KES ", total.toFixed(2)] })] })] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded p-4 mt-6 text-xs", children: [_jsx("p", { className: "font-semibold text-blue-900 mb-2", children: "Secure Payment" }), _jsx("p", { className: "text-blue-800", children: "Your payment is secured through M-Pesa. You will receive a confirmation on your phone." })] })] }) })] })] }), _jsx(PaymentStatusModal, { isOpen: showPaymentModal, checkoutRequestId: checkoutRequestId, phone: phone, onClose: () => setShowPaymentModal(false) })] }));
}
//# sourceMappingURL=ProductCheckout.js.map