import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { pollPaymentStatus } from '../api/payments';
import { getTicketsByCheckoutRequestId, } from '../api/events';
import { AlertCircle, CheckCircle, Clock, CalendarPlus } from 'lucide-react';
import TicketCard from '../components/TicketCard';
import { googleCalendarUrl, downloadIcs } from '../utils/calendar';
import { formatEventDateTime } from '../utils/eventDate';
import { pageRoot } from '../utils/themeClasses';
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
    const [details, setDetails] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const verify = {
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
    };
    const loadDetails = async (verifyEmail, verifyPhone) => {
        if (!checkoutRequestId)
            return null;
        const data = await getTicketsByCheckoutRequestId(checkoutRequestId, {
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
            setError(err.response?.data?.error || 'Could not verify ticket purchase');
        }
        finally {
            setLoading(false);
        }
    };
    if (gatePrompt) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsxs("div", { className: "max-w-md mx-auto bg-ash light:bg-ash-light border border-white/5 light:border-black/8 p-8", children: [_jsxs("h1", { className: "font-bebas text-4xl mb-2", children: ["TICKET ", _jsx("span", { className: "text-accent light:text-accent-light", children: "CONFIRMATION" })] }), _jsx("p", { className: "text-fog light:text-fog-light text-sm mb-6", children: "Enter the email or M-Pesa phone used at checkout to view your tickets." }), error && _jsx("p", { className: "text-red-400 text-sm mb-4", children: error }), _jsxs("form", { onSubmit: handleGateVerify, className: "space-y-4", children: [_jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", className: "w-full bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-4 py-3 text-chalk light:text-chalk-light focus:outline-none focus:border-accent light:focus:border-accent-light" }), _jsx("input", { type: "tel", value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "254712345678", className: "w-full bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-4 py-3 text-chalk light:text-chalk-light focus:outline-none focus:border-accent light:focus:border-accent-light" }), _jsx("button", { type: "submit", className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90", children: "View Tickets" })] })] }) }));
    }
    const eventTitle = details?.event_title || state.eventTitle || 'Event';
    const calendarHref = details?.event_date &&
        googleCalendarUrl({
            title: `TRFC: ${eventTitle}`,
            start: details.event_date,
            location: details.location,
            details: `Your TRFC event ticket. Attendee: ${details.attendee_name}`,
        });
    return (_jsx("div", { className: `${pageRoot} py-12 px-6`, children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400 print:hidden", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: error })] })), _jsxs("div", { className: `p-6 mb-6 border-l-4 print:hidden ${paymentStatus === 'paid'
                        ? 'bg-green-500/10 border-green-500'
                        : 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [loading ? (_jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-accent light:border-accent-light" })) : paymentStatus === 'paid' ? (_jsx(CheckCircle, { className: "w-6 h-6 text-green-400" })) : (_jsx(Clock, { className: "w-6 h-6 text-accent light:text-accent-light" })), _jsx("h1", { className: "font-bebas text-3xl", children: loading
                                        ? 'Confirming Payment…'
                                        : paymentStatus === 'paid'
                                            ? 'Tickets Confirmed!'
                                            : 'Payment Pending' })] }), _jsx("p", { className: "text-fog light:text-fog-light text-sm", children: paymentStatus === 'paid'
                                ? details?.attendee_name
                                    ? `${details.attendee_name}, your tickets are ready below. We also emailed PDF copies — check spam if you don’t see them.`
                                    : 'Your tickets are ready below. We also emailed PDF copies — check spam if you don’t see them.'
                                : 'Complete the M-Pesa payment on your phone to confirm your tickets.' })] }), paymentStatus === 'paid' && details?.tickets && details.tickets.length > 0 && (_jsx("div", { className: "space-y-4 mb-8", children: details.tickets.map((t, i) => (_jsx(TicketCard, { index: i, total: details.tickets.length, verify: verify, ticket: {
                            id: t.id,
                            shortCode: t.short_code,
                            attendeeName: t.attendee_name,
                            paymentStatus: t.payment_status,
                            qrDataUrl: t.qr_data_url,
                            eventTitle: details.event_title,
                            eventDate: details.event_date,
                            location: details.location,
                            unitPrice: details.unit_price,
                            mpesaReceipt: details.mpesa_receipt,
                            phone: details.phone,
                        } }, t.id))) })), _jsxs("div", { className: "bg-ash light:bg-ash-light border border-white/5 light:border-black/8 p-6 mb-6 space-y-3 print:hidden", children: [_jsx("h2", { className: "font-barlow-condensed font-bold tracking-widest uppercase text-accent light:text-accent-light mb-2", children: "Purchase summary" }), details?.attendee_name && (_jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Name: " }), details.attendee_name] })), _jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Event: " }), eventTitle] }), details?.event_date && (_jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "When: " }), formatEventDateTime(details.event_date)] })), details?.location && (_jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Venue: " }), details.location] })), _jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Tickets: " }), details?.quantity ?? state.quantity ?? '—'] }), (details?.total_price != null || state.totalPrice != null) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Total: " }), "KES ", (details?.total_price ?? state.totalPrice).toLocaleString()] })), (details?.email || email) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Email: " }), details?.email || email] })), (details?.phone || phone) && (_jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "Phone: " }), details?.phone || phone] })), details?.mpesa_receipt && (_jsxs("p", { children: [_jsx("span", { className: "text-fog light:text-fog-light", children: "M-Pesa: " }), details.mpesa_receipt] })), checkoutRequestId && (_jsxs("p", { className: "text-xs text-fog font-mono break-all", children: ["Ref: ", checkoutRequestId] }))] }), paymentStatus === 'paid' && details?.event_date && (_jsxs("div", { className: "flex flex-wrap gap-3 mb-6 print:hidden", children: [calendarHref && (_jsxs("a", { href: calendarHref, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-2 px-4 py-2.5 bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-xs tracking-widest uppercase hover:border-accent light:hover:border-accent-light", children: [_jsx(CalendarPlus, { size: 14 }), "Add to Google Calendar"] })), _jsxs("button", { type: "button", onClick: () => downloadIcs({
                                title: `TRFC: ${eventTitle}`,
                                start: details.event_date,
                                location: details.location,
                                details: `Attendee: ${details.attendee_name}`,
                                filename: `trfc-${eventTitle.replace(/\s+/g, '-').toLowerCase()}.ics`,
                            }), className: "inline-flex items-center gap-2 px-4 py-2.5 bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-xs tracking-widest uppercase hover:border-accent light:hover:border-accent-light", children: [_jsx(CalendarPlus, { size: 14 }), "Download .ics"] })] })), _jsxs("div", { className: "flex gap-3 print:hidden", children: [_jsx("button", { onClick: () => navigate('/events'), className: "flex-1 bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90", children: "Back to Events" }), paymentStatus === 'pending' && !loading && (_jsx("button", { onClick: () => window.location.reload(), className: "flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-accent light:hover:border-accent-light", children: "Refresh" }))] }), paymentStatus === 'pending' && !loading && (_jsxs("div", { className: "mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm print:hidden", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-300", children: "If payment was not received, return to the event page and try again." })] }))] }) }));
}
//# sourceMappingURL=TicketConfirmation.js.map