import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById } from '../api/orders';
import { pollPaymentStatus } from '../api/payments';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
export default function OrderConfirmation() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    useEffect(() => {
        const fetchOrderAndPollPayment = async () => {
            try {
                setLoading(true);
                setError('');
                if (!orderId) {
                    setError('Order ID not found');
                    setLoading(false);
                    return;
                }
                const orderData = await getOrderById(orderId);
                setOrder(orderData);
                if (orderData.payment_status === 'paid') {
                    setPaymentStatus('paid');
                }
                else {
                    setPaymentStatus('pending');
                }
                if (orderData.checkout_request_id && orderData.payment_status === 'pending') {
                    try {
                        await pollPaymentStatus(orderData.checkout_request_id);
                        const updatedOrder = await getOrderById(orderId);
                        setOrder(updatedOrder);
                        setPaymentStatus('paid');
                    }
                    catch (err) {
                        console.log('Payment polling completed or timed out');
                    }
                }
            }
            catch (err) {
                console.error('Error fetching order:', err);
                setError(err.response?.data?.error || 'Failed to load order');
            }
            finally {
                setLoading(false);
            }
        };
        fetchOrderAndPollPayment();
    }, [orderId]);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading your order..." })] }) }));
    }
    if (error || !order) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsx("div", { className: "max-w-2xl mx-auto", children: _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 mb-2", children: "Error" }), _jsx("p", { className: "text-red-700 mb-4", children: error || 'Order not found' }), _jsx("button", { onClick: () => navigate('/shop'), className: "bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700", children: "Back to Shop" })] })] }) }) }));
    }
    return (_jsx("div", { className: "min-h-screen py-12 px-4 bg-gray-50", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: `rounded-lg p-6 mb-6 text-white ${paymentStatus === 'paid' ? 'bg-green-600' : 'bg-blue-600'}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [paymentStatus === 'paid' ? (_jsx(CheckCircle, { className: "w-6 h-6" })) : (_jsx(Clock, { className: "w-6 h-6" })), _jsx("h1", { className: "text-2xl font-bold", children: paymentStatus === 'paid' ? 'Order Confirmed!' : 'Payment Pending' })] }), _jsx("p", { className: "text-sm opacity-90", children: paymentStatus === 'paid'
                                ? 'Your payment has been received and your order is being processed.'
                                : 'Your order has been created. Please complete the M-Pesa payment on your phone.' })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6 mb-6", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Order Details" }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Order ID:" }), _jsx("span", { className: "font-mono font-semibold", children: order.id.slice(0, 8) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Date:" }), _jsx("span", { children: new Date(order.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            }) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Status:" }), _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-semibold ${paymentStatus === 'paid'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'}`, children: paymentStatus === 'paid' ? 'PAID' : 'PENDING' })] }), order.mpesa_receipt && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "M-Pesa Receipt:" }), _jsx("span", { className: "font-mono text-sm", children: order.mpesa_receipt })] }))] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6 mb-6", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Delivery Information" }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Phone Number:" }), _jsx("p", { className: "font-semibold", children: order.phone })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600 mb-1", children: "Delivery Address:" }), _jsx("p", { className: "font-semibold", children: order.delivery_address })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6 mb-6", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Order Summary" }), _jsxs("div", { className: "space-y-2 text-sm mb-4 pb-4 border-b", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Subtotal:" }), _jsxs("span", { children: ["KES ", order.total_amount.toFixed(2)] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Delivery:" }), _jsx("span", { children: "Free" })] })] }), _jsxs("div", { className: "flex justify-between text-lg font-bold", children: [_jsx("span", { children: "Total Amount:" }), _jsxs("span", { className: "text-primary", children: ["KES ", order.total_amount.toFixed(2)] })] })] }), _jsxs("div", { className: "flex gap-3", children: [paymentStatus === 'paid' && (_jsx("button", { onClick: () => navigate('/shop'), className: "flex-1 bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold", children: "Continue Shopping" })), paymentStatus === 'pending' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => window.location.reload(), className: "flex-1 bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold", children: "Refresh Status" }), _jsx("button", { onClick: () => navigate('/shop'), className: "flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 font-semibold", children: "Back to Shop" })] }))] }), _jsx("p", { className: "text-center text-sm text-gray-600 mt-6", children: "You will receive an SMS confirmation once your payment is received and your order is shipped." })] }) }));
}
//# sourceMappingURL=OrderConfirmation.js.map