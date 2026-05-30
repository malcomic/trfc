import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../api/orders';
import { initiateSTKPush } from '../api/payments';
import { useCart } from '../store/cartStore';
import { getGrandTotal, getShipping } from '../utils/shipping';
import PaymentStatusModal from '../components/PaymentStatusModal';
import { AlertCircle, Loader, ShoppingCart, Truck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function Checkout() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const { items, getTotal, clearCart } = useCart();
    const subtotal = getTotal();
    const shipping = getShipping(subtotal);
    const grandTotal = getGrandTotal(subtotal);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [checkoutRequestId, setCheckoutRequestId] = useState('');
    const [phone, setPhone] = useState('');
    const [orderId, setOrderId] = useState('');
    if (items.length === 0) {
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: _jsxs("div", { className: "max-w-2xl mx-auto text-center px-6 py-24", children: [_jsx(ShoppingCart, { className: "w-16 h-16 text-fog mx-auto mb-4" }), _jsx("h1", { className: "font-bebas text-5xl mb-4", children: "CHECKOUT" }), _jsx("p", { className: "text-fog mb-6", children: "Your cart is empty" }), _jsx(Link, { to: "/shop", className: "inline-flex bg-fire text-white px-6 py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase no-underline hover:bg-ember", children: "Continue Shopping" })] }) }));
    }
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setError('');
            setPhone(data.phone);
            const orderItems = items.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
            }));
            const createdOrder = await createOrder({
                items: orderItems,
                total_amount: grandTotal,
                phone: data.phone,
                delivery_address: data.address,
            });
            setOrderId(createdOrder.id);
            const paymentResponse = await initiateSTKPush({
                phone: data.phone,
                amount: Math.round(grandTotal),
                orderId: createdOrder.id,
            });
            if (paymentResponse.checkoutRequestId) {
                setCheckoutRequestId(paymentResponse.checkoutRequestId);
                setShowPaymentModal(true);
                clearCart();
            }
            else {
                setError('Failed to initiate payment. Please try again.');
            }
        }
        catch (err) {
            console.error('Checkout failed:', err);
            setError(err.response?.data?.error || err.response?.data?.customerMessage || 'Checkout failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const handlePaymentModalClose = () => {
        setShowPaymentModal(false);
        if (orderId) {
            navigate(`/order-confirmation/${orderId}`, { state: { phone } });
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: [_jsx("section", { className: "bg-ink border-b border-white/5 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsxs(Link, { to: "/cart", className: "inline-flex items-center gap-2 text-fire text-sm mb-4 no-underline hover:underline font-barlow-condensed font-bold", children: [_jsx(ArrowLeft, { size: 14 }), " Back to Cart"] }), _jsxs("h1", { className: "font-bebas text-5xl text-chalk leading-tight", children: ["CHECK", _jsx("span", { className: "text-fire", children: "OUT" })] }), _jsx("p", { className: "text-fog mt-2", children: "Complete your purchase securely with M-Pesa" })] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "bg-ash border border-white/5 p-8 space-y-6", children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-xl letter-spacing-widest text-transform-uppercase text-fire", children: "Delivery Information" }), error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3 flex gap-3 text-sm", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-300", children: error })] })), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2", children: ["Phone Number ", _jsx("span", { className: "text-fire", children: "*" })] }), _jsx("input", { type: "tel", ...register('phone', {
                                                required: 'Phone number is required',
                                                pattern: { value: /^254\d{9}$/, message: 'Phone must be in format 254XXXXXXXXX' },
                                            }), placeholder: "254712345678", className: "w-full border border-white/10 rounded-none px-4 py-3 bg-smoke text-chalk placeholder-fog focus:outline-none focus:border-fire" }), errors.phone && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.phone.message })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2", children: ["Delivery Address ", _jsx("span", { className: "text-fire", children: "*" })] }), _jsx("textarea", { ...register('address', { required: 'Delivery address is required' }), placeholder: "E.g., 123 Main Street, Nairobi, Kenya", className: "w-full border border-white/10 rounded-none px-4 py-3 h-24 bg-smoke text-chalk placeholder-fog focus:outline-none focus:border-fire resize-none" }), errors.address && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.address.message })] }), _jsxs("div", { className: "bg-fire/10 border border-fire/15 p-4 flex gap-3 text-sm text-fog", children: [_jsx(Truck, { className: "w-5 h-5 text-fire flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-chalk mb-1", children: shipping === 0 ? 'Free Delivery' : `Delivery — KES ${shipping}` }), _jsx("p", { children: "Orders over KES 3,000 qualify for free delivery. Delivered within 2\u20133 business days after payment." })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-fire text-white py-3 font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember transition disabled:opacity-50 flex items-center justify-center gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 animate-spin" }), " Processing..."] })) : 'Proceed to Payment' })] }) }), _jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "bg-ash border border-white/5 p-6 sticky top-20", children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-6", children: "Order Summary" }), _jsx("div", { className: "space-y-3 mb-6 pb-6 border-b border-white/5 text-sm", children: items.map((item) => (_jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { className: "text-fog", children: [item.product.name, " \u00D7 ", item.quantity] }), _jsxs("span", { className: "text-chalk", children: ["KES ", (Number(item.product.price) * item.quantity).toLocaleString()] })] }, item.product.id))) }), _jsxs("div", { className: "space-y-2 mb-6 text-sm", children: [_jsxs("div", { className: "flex justify-between text-fog", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["KES ", subtotal.toLocaleString()] })] }), _jsxs("div", { className: "flex justify-between text-fog", children: [_jsx("span", { children: "Delivery" }), _jsx("span", { className: shipping === 0 ? 'text-green-400' : 'text-chalk', children: shipping === 0 ? 'FREE' : `KES ${shipping}` })] })] }), _jsxs("div", { className: "flex justify-between font-bebas text-3xl text-fire", children: [_jsx("span", { children: "Total" }), _jsxs("span", { children: ["KES ", grandTotal.toLocaleString()] })] })] }) })] }), _jsx(PaymentStatusModal, { isOpen: showPaymentModal, checkoutRequestId: checkoutRequestId, phone: phone, onClose: handlePaymentModalClose })] }));
}
//# sourceMappingURL=Checkout.js.map