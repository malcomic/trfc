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
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
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
        return (_jsx("div", { className: pageRoot, children: _jsxs("div", { className: "max-w-2xl mx-auto text-center px-6 py-24", children: [_jsx(ShoppingCart, { className: "w-16 h-16 text-fog light:text-fog-light mx-auto mb-4" }), _jsx("h1", { className: "font-bebas text-5xl mb-4 text-chalk light:text-chalk-light", children: "CHECKOUT" }), _jsx("p", { className: "text-fog light:text-fog-light mb-6", children: "Your cart is empty" }), _jsx(Link, { to: "/shop", className: "inline-flex bg-accent light:bg-accent-light text-black light:text-white px-6 py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase no-underline hover:bg-accent/90 light:hover:bg-accent-light/90", children: "Continue Shopping" })] }) }));
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
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsxs(Link, { to: "/cart", className: "inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline font-barlow-condensed font-bold", children: [_jsx(ArrowLeft, { size: 14 }), " Back to Cart"] }), _jsxs("h1", { className: "font-bebas text-5xl text-chalk light:text-chalk-light leading-tight", children: ["CHECK", _jsx("span", { className: "text-accent light:text-accent-light", children: "OUT" })] }), _jsx("p", { className: "text-fog light:text-fog-light mt-2", children: "Complete your purchase securely with M-Pesa" })] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: `${cardSurface} p-8 space-y-6`, children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-xl tracking-widest uppercase text-accent light:text-accent-light", children: "Delivery Information" }), error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3 flex gap-3 text-sm", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-300", children: error })] })), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2", children: ["Phone Number ", _jsx("span", { className: "text-accent light:text-accent-light", children: "*" })] }), _jsx("input", { type: "tel", ...register('phone', {
                                                required: 'Phone number is required',
                                                pattern: { value: /^254\d{9}$/, message: 'Phone must be in format 254XXXXXXXXX' },
                                            }), placeholder: "254712345678", className: `w-full rounded-none px-4 py-3 placeholder-fog light:placeholder-fog-light ${inputField}` }), errors.phone && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.phone.message })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2", children: ["Delivery Address ", _jsx("span", { className: "text-accent light:text-accent-light", children: "*" })] }), _jsx("textarea", { ...register('address', { required: 'Delivery address is required' }), placeholder: "E.g., 123 Main Street, Nairobi, Kenya", className: `w-full rounded-none px-4 py-3 h-24 resize-none placeholder-fog light:placeholder-fog-light ${inputField}` }), errors.address && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.address.message })] }), _jsxs("div", { className: "bg-accent/10 light:bg-accent-light/10 border border-accent/15 light:border-accent-light/15 p-4 flex gap-3 text-sm text-fog light:text-fog-light", children: [_jsx(Truck, { className: "w-5 h-5 text-accent light:text-accent-light flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-chalk light:text-chalk-light mb-1", children: shipping === 0 ? 'Free Delivery' : `Delivery — KES ${shipping}` }), _jsx("p", { children: "Orders over KES 3,000 qualify for free delivery. Delivered within 2\u20133 business days after payment." })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 transition disabled:opacity-50 flex items-center justify-center gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 animate-spin" }), " Processing..."] })) : 'Proceed to Payment' })] }) }), _jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: `${cardSurface} p-6 sticky top-20`, children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-6", children: "Order Summary" }), _jsx("div", { className: "space-y-3 mb-6 pb-6 border-b border-white/5 light:border-black/8 text-sm", children: items.map((item) => (_jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { className: "text-fog light:text-fog-light", children: [item.product.name, " \u00D7 ", item.quantity] }), _jsxs("span", { className: "text-chalk light:text-chalk-light", children: ["KES ", (Number(item.product.price) * item.quantity).toLocaleString()] })] }, item.product.id))) }), _jsxs("div", { className: "space-y-2 mb-6 text-sm", children: [_jsxs("div", { className: "flex justify-between text-fog light:text-fog-light", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["KES ", subtotal.toLocaleString()] })] }), _jsxs("div", { className: "flex justify-between text-fog light:text-fog-light", children: [_jsx("span", { children: "Delivery" }), _jsx("span", { className: shipping === 0 ? 'text-green-400' : 'text-chalk light:text-chalk-light', children: shipping === 0 ? 'FREE' : `KES ${shipping}` })] })] }), _jsxs("div", { className: "flex justify-between font-bebas text-3xl text-accent light:text-accent-light", children: [_jsx("span", { children: "Total" }), _jsxs("span", { children: ["KES ", grandTotal.toLocaleString()] })] })] }) })] }), _jsx(PaymentStatusModal, { isOpen: showPaymentModal, checkoutRequestId: checkoutRequestId, phone: phone, onClose: handlePaymentModalClose })] }));
}
//# sourceMappingURL=Checkout.js.map