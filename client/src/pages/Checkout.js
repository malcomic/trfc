import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../api/orders';
import { initiateSTKPush } from '../api/payments';
import { useCart } from '../store/cartStore';
import { AlertCircle, ShoppingCart, Truck } from 'lucide-react';
import { Button, FormInput, Card } from '../components/ui';
export default function Checkout() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const { items, getTotal, clearCart } = useCart();
    const total = getTotal();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    if (items.length === 0) {
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%] py-12", children: _jsxs("div", { className: "max-w-2xl w-full text-center", children: [_jsx("div", { className: "w-20 h-20 bg-ash rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10", children: _jsx(ShoppingCart, { size: 40, className: "text-fog" }) }), _jsx("h1", { className: "font-bebas text-5xl text-chalk mb-3 letter-spacing-tighter", children: "CART EMPTY" }), _jsx("p", { className: "text-lg text-fog mb-8", children: "Your shopping cart is empty. Browse our products and start adding items to your order." }), _jsx(Button, { onClick: () => navigate('/shop'), variant: "primary", size: "lg", children: "Continue Shopping" })] }) }));
    }
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setError('');
            // Format items for API
            const orderItems = items.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
            }));
            // Create order
            const order = {
                items: orderItems,
                total_amount: total,
                phone: data.phone,
                delivery_address: data.address,
            };
            const createdOrder = await createOrder(order);
            // Initiate M-Pesa payment
            const paymentResponse = await initiateSTKPush({
                phone: data.phone,
                amount: Math.round(total),
                orderId: createdOrder.id,
            });
            if (paymentResponse.checkoutRequestId) {
                // Payment initiated successfully
                clearCart();
                alert('M-Pesa prompt sent to your phone. Enter your PIN to complete payment.');
                navigate(`/order-confirmation/${createdOrder.id}`);
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
    return (_jsxs("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: [_jsx("section", { className: "bg-gradient-to-r from-ink via-ash to-ink border-b border-white/5 px-[6%] py-12", children: _jsxs("div", { className: "max-w-5xl mx-auto relative z-10", children: [_jsx("div", { className: "inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-3 before:block before:w-5 before:h-0.5 before:bg-fire", children: "Complete Your Order" }), _jsxs("h1", { className: "font-bebas text-4xl text-chalk letter-spacing-tighter", children: ["SECURE ", _jsx("span", { className: "text-fire", children: "CHECKOUT" })] })] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-12 pb-20", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, className: "space-y-8", children: [error && (_jsxs("div", { className: "flex items-start gap-3 bg-danger-red/10 border border-danger-red/30 p-5 rounded-sm", children: [_jsx(AlertCircle, { size: 20, className: "text-danger-red flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-danger-red", children: "Payment Error" }), _jsx("p", { className: "text-sm text-chalk/70 mt-1", children: error })] })] })), _jsx(Card, { children: _jsxs(Card.Body, { children: [_jsxs("h2", { className: "font-bebas text-2xl text-chalk mb-6 letter-spacing-tighter", children: ["DELIVERY ", _jsx("span", { className: "text-fire", children: "INFO" })] }), _jsxs("div", { className: "space-y-5", children: [_jsx(FormInput, { label: "Phone Number", id: "checkout-phone", type: "tel", placeholder: "254712345678", error: errors.phone ? errors.phone.message : undefined, ...register('phone', {
                                                                    required: 'Phone number is required',
                                                                    pattern: {
                                                                        value: /^254\d{9}$/,
                                                                        message: 'Format: 254XXXXXXXXX (Kenya)',
                                                                    },
                                                                }) }), _jsxs("div", { children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.5 block", htmlFor: "checkout-address", children: "Delivery Address" }), _jsx("textarea", { id: "checkout-address", rows: 4, className: "w-full bg-smoke border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-fire/50 resize-none", placeholder: "E.g., 123 Main Street, Nairobi, Kenya", ...register('address', { required: 'Delivery address is required' }) }), errors.address && (_jsx("p", { className: "text-xs text-danger-red mt-1.5", children: errors.address.message }))] })] })] }) }), _jsxs("div", { className: "flex items-start gap-4 bg-info-blue/10 border border-info-blue/30 p-5", children: [_jsx(Truck, { size: 20, className: "text-info-blue flex-shrink-0 mt-0.5" }), _jsxs("div", { className: "text-sm", children: [_jsx("p", { className: "font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase text-info-blue mb-1", children: "Free Delivery" }), _jsx("p", { className: "text-chalk/70", children: "Orders delivered within 2-3 business days after payment confirmation." })] })] }), _jsx(Button, { type: "submit", disabled: loading, isLoading: loading, variant: "primary", size: "lg", fullWidth: true, className: "h-13", children: loading ? 'Processing...' : 'Proceed to Payment' }), _jsx("p", { className: "text-xs text-fog text-center", children: "\uD83D\uDCA1 After clicking proceed, an M-Pesa prompt will appear on your phone. Enter your PIN to complete payment." })] }) }), _jsx("div", { className: "lg:col-span-1", children: _jsx(Card, { className: "sticky top-4", children: _jsxs(Card.Body, { children: [_jsxs("h3", { className: "font-bebas text-2xl text-chalk mb-6 letter-spacing-tighter", children: ["ORDER ", _jsx("span", { className: "text-fire", children: "SUMMARY" })] }), _jsx("div", { className: "space-y-3 mb-6 pb-6 border-b border-white/10", children: items.map((item) => (_jsxs("div", { className: "flex justify-between items-start gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk truncate", children: item.product.name }), _jsxs("p", { className: "text-xs text-fog mt-1", children: ["KES ", Number(item.product.price).toFixed(0), " \u00D7 ", item.quantity] })] }), _jsx("p", { className: "font-bebas text-lg text-fire flex-shrink-0", children: (Number(item.product.price) * item.quantity).toFixed(0) })] }, item.product.id))) }), _jsxs("div", { className: "space-y-3 mb-6 pb-6 border-b border-white/10 text-sm", children: [_jsxs("div", { className: "flex justify-between text-fog", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["KES ", total.toFixed(0)] })] }), _jsxs("div", { className: "flex justify-between text-fog", children: [_jsx("span", { children: "Delivery" }), _jsx("span", { className: "font-barlow-condensed font-bold text-success-green", children: "FREE" })] })] }), _jsxs("div", { className: "flex justify-between items-baseline mb-6", children: [_jsx("span", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-fog", children: "Total" }), _jsx("span", { className: "font-bebas text-4xl text-fire letter-spacing-tighter", children: total.toFixed(0) })] }), _jsxs("div", { className: "bg-ash p-4 space-y-2 text-xs text-fog", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\uD83D\uDCE6 Items" }), _jsx("span", { className: "font-bold text-chalk", children: items.length })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u23F1\uFE0F Delivery" }), _jsx("span", { className: "font-bold text-chalk", children: "2-3 days" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\uD83D\uDD12 Secure" }), _jsx("span", { className: "font-bold text-fire", children: "M-Pesa" })] })] })] }) }) })] }), _jsx("div", { className: "mt-16 grid grid-cols-1 md:grid-cols-3 gap-6", children: [
                            { icon: '🔒', title: 'Secure Payment', desc: 'M-Pesa encryption protects your data' },
                            { icon: '✓', title: 'Satisfaction Guaranteed', desc: 'Not satisfied? We offer full refunds' },
                            { icon: '⚡', title: 'Fast Processing', desc: 'Orders processed within hours' }
                        ].map((badge, idx) => (_jsx(Card, { children: _jsxs(Card.Body, { className: "text-center", children: [_jsx("div", { className: "text-4xl mb-3", children: badge.icon }), _jsx("h4", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2", children: badge.title }), _jsx("p", { className: "text-xs text-fog", children: badge.desc })] }) }, idx))) })] })] }));
}
//# sourceMappingURL=Checkout.js.map