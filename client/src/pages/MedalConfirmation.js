import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { pollPaymentStatus } from '../api/payments';
import { getMedalPurchasesByCheckoutRequestId, } from '../api/medals';
import { AlertCircle, CheckCircle, Clock, Award } from 'lucide-react';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
export default function MedalConfirmation() {
    const { checkoutRequestId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const state = (location.state || {});
    const emailFromUrl = searchParams.get('email') || '';
    const phoneFromUrl = searchParams.get('phone') || '';
    const [email, setEmail] = useState(emailFromUrl || state.email || '');
    const [phone, setPhone] = useState(phoneFromUrl || state.phone || '');
    const [gatePrompt, setGatePrompt] = useState(!emailFromUrl && !state.email && !phoneFromUrl && !state.phone);
    const [details, setDetails] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const loadDetails = async (verifyEmail, verifyPhone) => {
        if (!checkoutRequestId)
            return null;
        const data = await getMedalPurchasesByCheckoutRequestId(checkoutRequestId, {
            email: verifyEmail || undefined,
            phone: verifyPhone || undefined,
        });
        setDetails(data);
        if (data.payment_status === 'paid')
            setPaymentStatus('paid');
        return data;
    };
    useEffect(() => {
        if (!checkoutRequestId) {
            setLoading(false);
            return;
        }
        if (gatePrompt) {
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await loadDetails(email || undefined, phone || undefined);
                if (data?.payment_status !== 'paid') {
                    try {
                        await pollPaymentStatus(checkoutRequestId);
                        setPaymentStatus('paid');
                        await loadDetails(email || undefined, phone || undefined);
                    }
                    catch {
                        /* still pending */
                    }
                }
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load medal purchase details');
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [checkoutRequestId, email, phone, gatePrompt]);
    const handleGateVerify = async (e) => {
        e.preventDefault();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhone = phone.replace(/\s+/g, '');
        if (!normalizedEmail && !normalizedPhone) {
            setError('Enter the email or phone used at checkout');
            return;
        }
        if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setError('Enter a valid email address');
            return;
        }
        if (normalizedPhone && !/^254\d{9}$/.test(normalizedPhone)) {
            setError('Enter a valid phone number (254XXXXXXXXX)');
            return;
        }
        try {
            setLoading(true);
            setError('');
            setEmail(normalizedEmail);
            setPhone(normalizedPhone);
            const params = {};
            if (normalizedEmail)
                params.email = normalizedEmail;
            if (normalizedPhone)
                params.phone = normalizedPhone;
            setSearchParams(params);
            await loadDetails(normalizedEmail || undefined, normalizedPhone || undefined);
            setGatePrompt(false);
        }
        catch (err) {
            setError(err.response?.data?.error || 'Could not verify medal purchase');
        }
        finally {
            setLoading(false);
        }
    };
    if (!checkoutRequestId) {
        return (_jsxs("div", { className: `${pageRoot} py-16 px-6`, children: [_jsx("p", { className: "text-center text-fog", children: "Invalid confirmation link." }), _jsx("div", { className: "text-center mt-4", children: _jsx("button", { onClick: () => navigate('/medals'), className: "text-accent", children: "Back to Medals" }) })] }));
    }
    if (gatePrompt) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsxs("form", { onSubmit: handleGateVerify, className: `max-w-md mx-auto ${cardSurface} p-6 space-y-4`, children: [_jsx("h1", { className: "font-bebas text-3xl", children: "Verify Purchase" }), _jsx("p", { className: "text-sm text-fog light:text-fog-light", children: "Enter the email or M-Pesa phone used at checkout." }), error && (_jsxs("div", { className: "text-red-300 text-sm flex gap-2", children: [_jsx(AlertCircle, { size: 16 }), " ", error] })), _jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), className: `w-full px-4 py-2 ${inputField}` }), _jsx("input", { type: "tel", placeholder: "2547XXXXXXXX", value: phone, onChange: (e) => setPhone(e.target.value), className: `w-full px-4 py-2 ${inputField}` }), _jsx("button", { type: "submit", className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-bold tracking-widest uppercase", children: "Verify" })] }) }));
    }
    if (loading) {
        return (_jsx("div", { className: `${pageRoot} flex items-center justify-center py-24`, children: _jsx(Clock, { className: "w-10 h-10 animate-spin text-accent light:text-accent-light" }) }));
    }
    if (error && !details) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsxs("div", { className: "max-w-lg mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "text-red-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error }), _jsx("button", { onClick: () => navigate('/medals'), className: "text-accent underline", children: "Back to Medals" })] })] }) }));
    }
    const paid = paymentStatus === 'paid' || details?.payment_status === 'paid';
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-2xl mx-auto text-center", children: [paid ? (_jsx(CheckCircle, { className: "w-14 h-14 text-green-400 mx-auto mb-4" })) : (_jsx(Clock, { className: "w-14 h-14 text-yellow-400 mx-auto mb-4" })), _jsx("h1", { className: "font-bebas text-5xl text-chalk light:text-chalk-light", children: paid ? (_jsxs(_Fragment, { children: ["MEDAL ", _jsx("span", { className: "text-accent light:text-accent-light", children: "CONFIRMED" })] })) : (_jsxs(_Fragment, { children: ["PAYMENT ", _jsx("span", { className: "text-yellow-400", children: "PENDING" })] })) })] }) }), _jsxs("div", { className: "max-w-2xl mx-auto px-[6%] py-10 pb-20 space-y-6", children: [_jsxs("div", { className: `${cardSurface} p-6`, children: [_jsxs("div", { className: "flex items-start gap-4 mb-6", children: [_jsx(Award, { className: "text-accent light:text-accent-light flex-shrink-0", size: 28 }), _jsxs("div", { children: [_jsx("h2", { className: "font-bebas text-3xl", children: details?.tier_name || state.tierName || 'Medal' }), _jsx("p", { className: "text-fog light:text-fog-light", children: (details?.distance_km ?? state.distanceKm) != null
                                                    ? `${details?.distance_km ?? state.distanceKm} km`
                                                    : '—' })] })] }), _jsxs("dl", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1", children: "Buyer" }), _jsx("dd", { className: "font-semibold", children: details?.buyer_name || '—' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1", children: "Quantity" }), _jsx("dd", { className: "font-semibold", children: details?.quantity ?? state.quantity ?? '—' })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1", children: "Total" }), _jsxs("dd", { className: "font-bebas text-2xl text-accent light:text-accent-light", children: ["KES", ' ', Number(details?.total_price ?? state.totalPrice ?? 0).toLocaleString()] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1", children: "M-Pesa Receipt" }), _jsx("dd", { className: "font-semibold", children: details?.mpesa_receipt || '—' })] })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Link, { to: "/medals", className: "bg-accent light:bg-accent-light text-black light:text-white px-6 py-3 font-barlow-condensed font-bold tracking-widest uppercase no-underline clip-angled-sm", children: "Browse Medals" }), _jsx(Link, { to: "/account/medals", className: "border border-white/20 light:border-black/20 px-6 py-3 font-barlow-condensed font-bold tracking-widest uppercase no-underline text-chalk light:text-chalk-light", children: "My Medals" })] })] })] }));
}
//# sourceMappingURL=MedalConfirmation.js.map