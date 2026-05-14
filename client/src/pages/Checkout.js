import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../api/orders';
import { initiateSTKPush } from '../api/payments';
import { useCart } from '../store/cartStore';
import { AlertCircle, Loader, ShoppingCart, Truck } from 'lucide-react';
export default function Checkout() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const { items, getTotal, clearCart } = useCart();
    const total = getTotal();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    if (items.length === 0) {
        return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsxs("div", { className: "max-w-2xl mx-auto text-center", children: [_jsx(ShoppingCart, { className: "w-16 h-16 text-gray-300 mx-auto mb-4" }), _jsx("h1", { className: "text-4xl font-bold mb-4", children: "Checkout" }), _jsx("p", { className: "text-gray-600 mb-6", children: "Your cart is empty" }), _jsx("button", { onClick: () => navigate('/shop'), className: "bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 font-semibold", children: "Continue Shopping" })] }) }));
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
    return (_jsx("div", { className: "min-h-screen py-12 px-4 bg-gray-50", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-4xl font-bold mb-2", children: "Checkout" }), _jsx("p", { className: "text-gray-600", children: "Complete your purchase securely with M-Pesa" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "bg-white rounded-lg shadow-lg p-8 space-y-6", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "Delivery Information" }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-800 font-semibold", children: "Payment Error" }), _jsx("p", { className: "text-red-700 text-sm", children: error })] })] })), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2", children: ["Phone Number ", _jsx("span", { className: "text-red-600", children: "*" })] }), _jsx("div", { className: "relative", children: _jsx("input", { type: "tel", ...register('phone', {
                                                        required: 'Phone number is required',
                                                        pattern: {
                                                            value: /^254\d{9}$/,
                                                            message: 'Phone must be in format 254XXXXXXXXX',
                                                        },
                                                    }), placeholder: "254712345678", className: "w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" }) }), errors.phone && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.phone.message })), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Format: 254712345678 (Kenya number)" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-semibold mb-2", children: ["Delivery Address ", _jsx("span", { className: "text-red-600", children: "*" })] }), _jsx("textarea", { ...register('address', { required: 'Delivery address is required' }), placeholder: "E.g., 123 Main Street, Nairobi, Kenya", className: "w-full border border-gray-300 rounded-lg px-4 py-3 h-24 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none" }), errors.address && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: errors.address.message }))] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3", children: [_jsx(Truck, { className: "w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" }), _jsxs("div", { className: "text-sm text-blue-800", children: [_jsx("p", { className: "font-semibold mb-1", children: "Free Delivery" }), _jsx("p", { children: "We will deliver your order to the address you provide within 2-3 business days after payment." })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 animate-spin" }), "Processing..."] })) : ('Proceed to Payment') }), _jsx("p", { className: "text-xs text-gray-600 text-center", children: "\uD83D\uDCA1 After clicking \"Proceed to Payment\", an M-Pesa prompt will appear on your phone. Enter your M-Pesa PIN to complete the transaction." })] }) }), _jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "bg-white rounded-lg shadow-lg p-6 sticky top-4", children: [_jsx("h3", { className: "text-xl font-bold mb-6", children: "Order Summary" }), _jsx("div", { className: "space-y-3 mb-6 pb-6 border-b", children: items.map((item) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-semibold text-gray-800", children: item.product.name }), _jsxs("p", { className: "text-gray-600 text-xs", children: ["KES ", (Number(item.product.price)).toFixed(2), " \u00D7 ", item.quantity] })] }), _jsxs("p", { className: "font-semibold text-gray-800", children: ["KES ", (Number(item.product.price) * item.quantity).toFixed(2)] })] }, item.product.id))) }), _jsxs("div", { className: "space-y-2 mb-6 pb-6 border-b text-sm", children: [_jsxs("div", { className: "flex justify-between text-gray-600", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["KES ", total.toFixed(2)] })] }), _jsxs("div", { className: "flex justify-between text-gray-600", children: [_jsx("span", { children: "Delivery" }), _jsx("span", { className: "font-semibold text-green-600", children: "Free" })] })] }), _jsxs("div", { className: "flex justify-between text-lg font-bold mb-6", children: [_jsx("span", { children: "Total" }), _jsxs("span", { className: "text-primary text-2xl", children: ["KES ", total.toFixed(2)] })] }), _jsxs("div", { className: "bg-gray-50 p-4 rounded-lg text-xs text-gray-600 space-y-2", children: [_jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDCCD Items:" }), " ", items.length, " item(s)"] }), _jsxs("p", { children: [_jsx("strong", { children: "\u23F1\uFE0F Delivery:" }), " 2-3 business days"] }), _jsxs("p", { children: [_jsx("strong", { children: "\uD83D\uDD12 Secure:" }), " Powered by M-Pesa"] })] }), _jsxs("div", { className: "mt-6 pt-6 border-t", children: [_jsx("p", { className: "text-xs font-semibold text-gray-600 mb-3", children: "ITEMS IN ORDER" }), _jsx("div", { className: "space-y-2 text-xs", children: items.map((item, idx) => (_jsxs("div", { className: "flex justify-between py-1", children: [_jsxs("span", { className: "text-gray-600", children: [idx + 1, ". ", item.product.name] }), _jsxs("span", { className: "font-mono text-gray-700", children: ["\u00D7", item.quantity] })] }, idx))) })] })] }) })] }), _jsxs("div", { className: "mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center", children: [_jsxs("div", { className: "bg-white rounded-lg p-6", children: [_jsx("div", { className: "text-3xl mb-2", children: "\uD83D\uDD12" }), _jsx("h4", { className: "font-semibold mb-1", children: "Secure Payment" }), _jsx("p", { className: "text-sm text-gray-600", children: "M-Pesa encryption protects your data" })] }), _jsxs("div", { className: "bg-white rounded-lg p-6", children: [_jsx("div", { className: "text-3xl mb-2", children: "\u2713" }), _jsx("h4", { className: "font-semibold mb-1", children: "Money-Back Guarantee" }), _jsx("p", { className: "text-sm text-gray-600", children: "Unsatisfied? We'll refund you" })] }), _jsxs("div", { className: "bg-white rounded-lg p-6", children: [_jsx("div", { className: "text-3xl mb-2", children: "\uD83D\uDE9A" }), _jsx("h4", { className: "font-semibold mb-1", children: "Fast Delivery" }), _jsx("p", { className: "text-sm text-gray-600", children: "Free delivery within 2-3 business days" })] })] })] }) }));
}
//# sourceMappingURL=Checkout.js.map