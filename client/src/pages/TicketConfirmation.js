import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { pollPaymentStatus, verifyPaystackPayment } from '../api/payments';
import { getTicketsByCheckoutRequestId } from '../api/events';
import { getUserTickets } from '../api/tickets';
import { AlertCircle, CheckCircle, Clock, Ticket } from 'lucide-react';
import TicketDownloadButton from '../components/TicketDownloadButton';
export default function TicketConfirmation() {
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
    const [details, setDetails] = useState(state);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ticketIds, setTicketIds] = useState([]);
    const loadDetails = async (verifyEmail, verifyPhone) => {
        if (!checkoutRequestId)
            return null;
        const data = await getTicketsByCheckoutRequestId(checkoutRequestId, {
            email: verifyEmail || undefined,
            phone: verifyPhone || undefined,
        });
        setDetails({
            eventTitle: data.event_title,
            quantity: data.quantity,
            totalPrice: data.total_price,
            phone: data.phone || undefined,
            email: data.email || undefined,
        });
        if (data.payment_status === 'paid')
            setPaymentStatus('paid');
        return data;
    };
    const loadDownloadableTicketIds = async () => {
        try {
            const tickets = await getUserTickets();
            const matching = tickets.filter((t) => t.checkout_request_id === checkoutRequestId && t.payment_status === 'paid');
            setTicketIds(matching.map((t) => t.id));
        }
        catch {
            /* guest checkout — no authenticated account, downloads unavailable */
        }
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
                        await verifyPaystackPayment(checkoutRequestId);
                        setPaymentStatus('paid');
                        await loadDetails(email || undefined, phone || undefined);
                    }
                    catch {
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
                await loadDownloadableTicketIds();
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load ticket details');
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
            setError('Enter the email used at checkout');
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
            setError(err.response?.data?.error || 'Could not verify ticket purchase');
        }
        finally {
            setLoading(false);
        }
    };
    if (gatePrompt) {
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow py-16 px-6", children: _jsxs("div", { className: "max-w-md mx-auto bg-ash border border-white/5 p-8", children: [_jsxs("h1", { className: "font-bebas text-4xl mb-2", children: ["TICKET ", _jsx("span", { className: "text-accent light:text-accent-light", children: "CONFIRMATION" })] }), _jsx("p", { className: "text-fog text-sm mb-6", children: "Enter the email used at checkout to view your tickets." }), error && _jsx("p", { className: "text-red-400 text-sm mb-4", children: error }), _jsxs("form", { onSubmit: handleGateVerify, className: "space-y-4", children: [_jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", className: "w-full bg-smoke border border-white/10 px-4 py-3 text-chalk focus:outline-none focus:border-accent light:focus:border-accent-light" }), _jsx("button", { type: "submit", className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90", children: "View Tickets" })] })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow py-12 px-6", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: error })] })), _jsxs("div", { className: `p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [loading ? (_jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-accent light:border-accent-light" })) : paymentStatus === 'paid' ? (_jsx(CheckCircle, { className: "w-6 h-6 text-green-400" })) : (_jsx(Clock, { className: "w-6 h-6 text-accent light:text-accent-light" })), _jsx("h1", { className: "font-bebas text-3xl", children: loading ? 'Confirming Payment…' : paymentStatus === 'paid' ? 'Tickets Confirmed!' : 'Payment Pending' })] }), _jsx("p", { className: "text-fog text-sm", children: paymentStatus === 'paid'
                                ? 'Your ticket payment was successful. Check your email for your tickets.'
                                : 'Complete payment in the Paystack window to confirm your tickets.' })] }), _jsxs("div", { className: "bg-ash border border-white/5 p-6 mb-6 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-accent light:text-accent-light mb-4", children: [_jsx(Ticket, { size: 18 }), _jsx("h2", { className: "font-barlow-condensed font-bold tracking-widest uppercase", children: "Ticket Details" })] }), details.eventTitle && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Event: " }), details.eventTitle] }), details.quantity && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Tickets: " }), details.quantity] }), details.totalPrice != null && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Total: " }), "KES ", details.totalPrice.toLocaleString()] }), (details.email || email) && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Email: " }), details.email || email] }), (details.phone || phone) && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Phone: " }), details.phone || phone] }), checkoutRequestId && (_jsxs("p", { className: "text-xs text-fog font-mono break-all", children: ["Ref: ", checkoutRequestId] }))] }), paymentStatus === 'paid' && ticketIds.length > 0 && (_jsxs("div", { className: "bg-ash border border-white/5 p-6 mb-6 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-accent light:text-accent-light mb-2", children: [_jsx(Ticket, { size: 18 }), _jsx("h2", { className: "font-barlow-condensed font-bold tracking-widest uppercase", children: "Download Your Tickets" })] }), _jsx("div", { className: "space-y-3", children: ticketIds.map((ticketId, index) => (_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("span", { className: "text-fog text-sm", children: ["Ticket ", index + 1, ":"] }), _jsx(TicketDownloadButton, { ticketId: ticketId, paymentStatus: "paid", eventTitle: details.eventTitle || `Ticket ${index + 1}` })] }, ticketId))) })] })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => navigate('/events'), className: "flex-1 bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90", children: "Back to Events" }), paymentStatus === 'pending' && !loading && (_jsx("button", { onClick: () => window.location.reload(), className: "flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-accent light:hover:border-accent-light", children: "Refresh" }))] }), paymentStatus === 'pending' && !loading && (_jsxs("div", { className: "mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-300", children: "If payment was not received, return to the event page and try again." })] }))] }) }));
}
//# sourceMappingURL=TicketConfirmation.js.map