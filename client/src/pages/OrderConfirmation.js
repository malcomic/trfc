import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getOrderById } from '../api/orders';
import { pollPaymentStatus } from '../api/payments';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
export default function OrderConfirmation() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const phoneFromState = location.state?.phone;
    const [phone, setPhone] = useState(phoneFromState || '');
    const [phonePrompt, setPhonePrompt] = useState(!phoneFromState);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const fetchOrder = async (verifyPhone) => {
        if (!orderId)
            return;
        const data = await getOrderById(orderId, verifyPhone);
        setOrder(data);
        const status = data.payment_status || data.status;
        setPaymentStatus(status === 'paid' ? 'paid' : 'pending');
        return data;
    };
    useEffect(() => {
        if (!orderId || phonePrompt) {
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const orderData = await fetchOrder(phone);
                if (orderData?.checkout_request_id && orderData.payment_status === 'pending') {
                    try {
                        await pollPaymentStatus(orderData.checkout_request_id);
                        await fetchOrder(phone);
                        setPaymentStatus('paid');
                    }
                    catch {
                        /* polling timeout is ok */
                    }
                }
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load order');
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [orderId, phone, phonePrompt]);
    const handlePhoneVerify = async (e) => {
        e.preventDefault();
        if (!/^254\d{9}$/.test(phone.replace(/\s+/g, ''))) {
            setError('Enter a valid phone number (254XXXXXXXXX)');
            return;
        }
        try {
            setLoading(true);
            setError('');
            await fetchOrder(phone);
            setPhonePrompt(false);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Could not verify order');
        }
        finally {
            setLoading(false);
        }
    };
    if (phonePrompt && !phoneFromState) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsxs("div", { className: `max-w-md mx-auto ${cardSurface} p-8`, children: [_jsxs("h1", { className: "font-bebas text-4xl mb-2 text-chalk light:text-chalk-light", children: ["ORDER ", _jsx("span", { className: "text-fire", children: "CONFIRMATION" })] }), _jsx("p", { className: "text-fog light:text-fog-light text-sm mb-6", children: "Enter the phone number used at checkout to view your order details." }), error && _jsx("p", { className: "text-red-400 text-sm mb-4", children: error }), _jsxs("form", { onSubmit: handlePhoneVerify, className: "space-y-4", children: [_jsx("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value.replace(/\s+/g, '')), placeholder: "254712345678", className: `w-full px-4 py-3 ${inputField}` }), _jsx("button", { type: "submit", className: "w-full bg-fire text-white py-3 font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember", children: "View Order" })] })] }) }));
    }
    if (loading) {
        return (_jsx("div", { className: `${pageRoot} flex items-center justify-center`, children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-fire mx-auto mb-4" }), _jsx("p", { className: "text-fog light:text-fog-light", children: "Loading your order..." })] }) }));
    }
    if (error || !order) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsxs("div", { className: "max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error || 'Order not found' }), _jsx("button", { onClick: () => navigate('/shop'), className: "bg-fire text-white px-4 py-2 clip-angled-sm", children: "Back to Shop" })] })] }) }));
    }
    return (_jsx("div", { className: `${pageRoot} py-12 px-6`, children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: `rounded-none p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-fire/10 border-fire'}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [paymentStatus === 'paid' ? _jsx(CheckCircle, { className: "w-6 h-6 text-green-400" }) : _jsx(Clock, { className: "w-6 h-6 text-fire" }), _jsx("h1", { className: "font-bebas text-3xl", children: paymentStatus === 'paid' ? 'Order Confirmed!' : 'Payment Pending' })] }), _jsx("p", { className: "text-fog light:text-fog-light text-sm", children: paymentStatus === 'paid'
                                ? 'Your payment has been received and your order is being processed.'
                                : 'Complete the M-Pesa payment on your phone to confirm your order.' })] }), _jsxs("div", { className: `${cardSurface} p-6 mb-6 space-y-3 text-sm`, children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4", children: "Order Details" }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Order ID" }), _jsxs("span", { className: "font-mono", children: [order.id.slice(0, 8), "\u2026"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Date" }), _jsx("span", { children: new Date(order.created_at).toLocaleDateString() })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Status" }), _jsx("span", { className: "text-fire font-bold uppercase", children: paymentStatus })] }), order.mpesa_receipt && _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "M-Pesa Receipt" }), _jsx("span", { className: "font-mono", children: order.mpesa_receipt })] })] }), order.delivery_address && (_jsxs("div", { className: `${cardSurface} p-6 mb-6 text-sm`, children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4", children: "Delivery" }), order.phone && _jsxs("p", { className: "mb-2", children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Phone: " }), order.phone] }), _jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Address: " }), order.delivery_address] })] })), order.items && order.items.length > 0 && (_jsxs("div", { className: `${cardSurface} p-6 mb-6 text-sm`, children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4", children: "Items" }), order.items.map((item, i) => (_jsxs("div", { className: "flex justify-between py-2 border-b border-white/5 light:border-black/8 last:border-0", children: [_jsxs("span", { children: [item.product_name || 'Product', " \u00D7 ", item.quantity] }), _jsxs("span", { children: ["KES ", (item.unit_price * item.quantity).toLocaleString()] })] }, i)))] })), _jsxs("div", { className: `${cardSurface} p-6 mb-6 flex justify-between font-bebas text-3xl text-fire`, children: [_jsx("span", { children: "Total" }), _jsxs("span", { children: ["KES ", Number(order.total_amount).toLocaleString()] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => navigate('/shop'), className: "flex-1 bg-fire text-white py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase hover:bg-ember", children: paymentStatus === 'paid' ? 'Continue Shopping' : 'Back to Shop' }), paymentStatus === 'pending' && (_jsx("button", { onClick: () => window.location.reload(), className: `flex-1 py-3 font-barlow-condensed font-bold text-sm hover:border-fire ${inputField}`, children: "Refresh Status" }))] })] }) }));
}
//# sourceMappingURL=OrderConfirmation.js.map