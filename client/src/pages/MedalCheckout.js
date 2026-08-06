import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { getMedalBySlug, createMedalPurchases } from '../api/medals';
import { initiateMedalPayment } from '../api/payments';
import PaymentStatusModal from '../components/PaymentStatusModal';
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
import { useAuth } from '../context/AuthContext';
export default function MedalCheckout() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const state = (location.state || {});
    const initialQty = state.quantity || 1;
    const initialOptionId = state.optionId;
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            quantity: initialQty,
            buyerName: '',
            email: '',
            phone: '',
        },
    });
    const [tier, setTier] = useState(null);
    const [option, setOption] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [checkoutRequestId, setCheckoutRequestId] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [purchaseMeta, setPurchaseMeta] = useState(null);
    const quantity = watch('quantity');
    const totalPrice = option ? Number(option.price) * Number(quantity) : 0;
    useEffect(() => {
        if (user?.name)
            setValue('buyerName', user.name);
        if (user?.email)
            setValue('email', user.email);
        if (user?.phone && /^254\d{9}$/.test(user.phone))
            setValue('phone', user.phone);
    }, [user, setValue]);
    useEffect(() => {
        const fetchTier = async () => {
            try {
                setLoading(true);
                if (!slug) {
                    setError('Medal not found');
                    return;
                }
                const data = await getMedalBySlug(slug);
                setTier(data);
                const selected = data.options.find((o) => o.id === initialOptionId) || data.options[0] || null;
                setOption(selected);
                if (!selected) {
                    setError('No distance options available for this medal');
                }
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load medal');
            }
            finally {
                setLoading(false);
            }
        };
        fetchTier();
    }, [slug, initialOptionId]);
    const onSubmit = async (data) => {
        if (!option || !slug)
            return;
        try {
            setSubmitting(true);
            setError('');
            const normalizedEmail = data.email.trim().toLowerCase();
            const normalizedName = data.buyerName.trim();
            setPhone(data.phone);
            setEmail(normalizedEmail);
            const purchaseResult = await createMedalPurchases(slug, {
                optionId: option.id,
                quantity: Number(data.quantity),
                email: normalizedEmail,
                phone: data.phone,
                buyerName: normalizedName,
            });
            const paymentResponse = await initiateMedalPayment({
                phone: data.phone,
                amount: Math.round(purchaseResult.totalPrice),
                medalBatchId: purchaseResult.purchaseBatchId,
            });
            if (paymentResponse.checkoutRequestId) {
                setCheckoutRequestId(paymentResponse.checkoutRequestId);
                setPurchaseMeta({
                    tierName: purchaseResult.tierName,
                    distanceKm: purchaseResult.distanceKm,
                    quantity: purchaseResult.quantity,
                    totalPrice: purchaseResult.totalPrice,
                });
                setShowPaymentModal(true);
            }
            else {
                setError('Failed to initiate payment. Please try again.');
            }
        }
        catch (err) {
            setError(err.response?.data?.error ||
                err.response?.data?.customerMessage ||
                'Payment initiation failed.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleModalClose = () => {
        setShowPaymentModal(false);
        const params = new URLSearchParams({ phone, email });
        navigate(`/medal-confirmation/${checkoutRequestId}?${params.toString()}`, {
            state: {
                ...purchaseMeta,
                phone,
                email,
                tierName: purchaseMeta?.tierName || tier?.name,
            },
        });
    };
    if (loading) {
        return (_jsx("div", { className: `${pageRoot} flex items-center justify-center`, children: _jsx(Loader, { className: "w-12 h-12 animate-spin text-accent light:text-accent-light" }) }));
    }
    if (error && !tier) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsxs("div", { className: "max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error }), _jsx("button", { onClick: () => navigate('/medals'), className: "bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm", children: "Back to Medals" })] })] }) }));
    }
    if (!tier || !option)
        return null;
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("button", { onClick: () => navigate(`/medals/${slug}`), className: "inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer hover:underline", children: [_jsx(ArrowLeft, { size: 14 }), " Back to ", tier.name] }), _jsxs("h1", { className: "font-bebas text-4xl text-chalk light:text-chalk-light", children: ["CLAIM YOUR ", _jsx("span", { className: "text-accent light:text-accent-light", children: "MEDAL" })] }), _jsxs("p", { className: "text-fog light:text-fog-light mt-1", children: [tier.name, " \u00B7 ", option.distance_km, " km"] })] }) }), _jsxs("div", { className: "max-w-2xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("form", { onSubmit: handleSubmit(onSubmit), className: `md:col-span-2 ${cardSurface} p-6 space-y-4`, children: [error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 p-3 text-red-300 text-sm flex gap-2", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.5" }), error] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Quantity" }), _jsx("select", { ...register('quantity', { required: true, min: 1, max: 10, valueAsNumber: true }), className: `w-full px-4 py-2 ${inputField}`, children: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (_jsx("option", { value: n, children: n }, n))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Full name" }), _jsx("input", { type: "text", ...register('buyerName', {
                                            required: 'Name is required',
                                            minLength: { value: 2, message: 'Enter your full name' },
                                            maxLength: { value: 150, message: 'Name is too long' },
                                        }), className: `w-full px-4 py-2 ${inputField}` }), errors.buyerName && (_jsx("p", { className: "text-red-400 text-xs mt-1", children: errors.buyerName.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Email" }), _jsx("input", { type: "email", ...register('email', { required: 'Email is required' }), className: `w-full px-4 py-2 ${inputField}` }), errors.email && (_jsx("p", { className: "text-red-400 text-xs mt-1", children: errors.email.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "M-Pesa Phone" }), _jsx("input", { type: "tel", placeholder: "2547XXXXXXXX", ...register('phone', {
                                            required: 'Phone is required',
                                            pattern: {
                                                value: /^254\d{9}$/,
                                                message: 'Format: 254XXXXXXXXX',
                                            },
                                        }), className: `w-full px-4 py-2 ${inputField}` }), errors.phone && (_jsx("p", { className: "text-red-400 text-xs mt-1", children: errors.phone.message }))] }), _jsx("button", { type: "submit", disabled: submitting, className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-4 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled disabled:opacity-60", children: submitting ? 'Processing…' : 'Pay with M-Pesa' })] }), _jsxs("div", { className: `${cardSurface} p-6 h-fit`, children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4", children: "Summary" }), _jsx("p", { className: "font-semibold mb-1", children: tier.name }), _jsxs("p", { className: "text-sm text-fog light:text-fog-light mb-4", children: [option.distance_km, " km"] }), _jsxs("p", { className: "text-sm text-fog light:text-fog-light", children: ["KES ", Number(option.price).toLocaleString(), " \u00D7 ", quantity] }), _jsxs("p", { className: "font-bebas text-3xl text-accent light:text-accent-light mt-2", children: ["KES ", totalPrice.toLocaleString()] })] })] }), showPaymentModal && (_jsx(PaymentStatusModal, { isOpen: showPaymentModal, checkoutRequestId: checkoutRequestId, phone: phone, onClose: handleModalClose }))] }));
}
//# sourceMappingURL=MedalCheckout.js.map