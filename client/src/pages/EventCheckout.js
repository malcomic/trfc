import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { getEventById, buyEventTickets } from '../api/events';
import { initiateTicketPayment } from '../api/payments';
import PaymentStatusModal from '../components/PaymentStatusModal';
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
export default function EventCheckout() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const initialQty = location.state?.quantity || 1;
    const { register, handleSubmit, formState: { errors }, watch } = useForm({
        defaultValues: { quantity: initialQty, phone: '' },
    });
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [checkoutRequestId, setCheckoutRequestId] = useState('');
    const [phone, setPhone] = useState('');
    const [ticketMeta, setTicketMeta] = useState(null);
    const quantity = watch('quantity');
    const totalPrice = event ? Number(event.price) * Number(quantity) : 0;
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setLoading(true);
                if (!eventId) {
                    setError('Event ID not found');
                    return;
                }
                const data = await getEventById(eventId);
                setEvent(data);
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load event');
            }
            finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);
    const onSubmit = async (data) => {
        try {
            setSubmitting(true);
            setError('');
            setPhone(data.phone);
            const ticketResult = await buyEventTickets(eventId, {
                quantity: Number(data.quantity),
                phone: data.phone,
            });
            const paymentResponse = await initiateTicketPayment({
                phone: data.phone,
                amount: Math.round(ticketResult.totalPrice),
                ticketBatchId: ticketResult.purchaseBatchId,
            });
            if (paymentResponse.checkoutRequestId) {
                setCheckoutRequestId(paymentResponse.checkoutRequestId);
                setTicketMeta({
                    eventTitle: ticketResult.eventTitle,
                    quantity: ticketResult.quantity,
                    totalPrice: ticketResult.totalPrice,
                });
                setShowPaymentModal(true);
            }
            else {
                setError('Failed to initiate payment. Please try again.');
            }
        }
        catch (err) {
            setError(err.response?.data?.error || err.response?.data?.customerMessage || 'Payment initiation failed.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleModalClose = () => {
        setShowPaymentModal(false);
        const params = new URLSearchParams({ phone });
        navigate(`/ticket-confirmation/${checkoutRequestId}?${params.toString()}`, {
            state: { ...ticketMeta, phone, eventTitle: ticketMeta?.eventTitle || event?.title },
        });
    };
    if (loading) {
        return (_jsx("div", { className: `${pageRoot} flex items-center justify-center`, children: _jsx(Loader, { className: "w-12 h-12 animate-spin text-accent light:text-accent-light" }) }));
    }
    if (error && !event) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsxs("div", { className: "max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error }), _jsx("button", { onClick: () => navigate('/events'), className: "bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm", children: "Back to Events" })] })] }) }));
    }
    if (!event)
        return null;
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("button", { onClick: () => navigate(`/events/${eventId}`), className: "inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer hover:underline", children: [_jsx(ArrowLeft, { size: 14 }), " Back to Event"] }), _jsxs("h1", { className: "font-bebas text-4xl text-chalk light:text-chalk-light", children: ["BUY ", _jsx("span", { className: "text-accent light:text-accent-light", children: "TICKETS" })] }), _jsx("p", { className: "text-fog light:text-fog-light mt-1", children: event.title })] }) }), _jsxs("div", { className: "max-w-2xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("form", { onSubmit: handleSubmit(onSubmit), className: `md:col-span-2 ${cardSurface} p-6 space-y-4`, children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Number of Tickets" }), _jsx("select", { ...register('quantity', { required: true, min: 1, max: 10, valueAsNumber: true }), className: `w-full px-4 py-2 ${inputField}`, children: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (_jsxs("option", { value: n, children: [n, " ", n === 1 ? 'Ticket' : 'Tickets'] }, n))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Phone (254XXXXXXXXX)" }), _jsx("input", { ...register('phone', {
                                            required: 'Phone is required',
                                            pattern: { value: /^254\d{9}$/, message: 'Format: 254XXXXXXXXX' },
                                        }), placeholder: "254712345678", className: `w-full px-4 py-2 ${inputField}` }), errors.phone && _jsx("p", { className: "text-red-400 text-sm mt-1", children: errors.phone.message })] }), error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex gap-2", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0" }), " ", error] })), _jsx("button", { type: "submit", disabled: submitting, className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-50 flex items-center justify-center gap-2", children: submitting ? _jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 animate-spin" }), " Processing\u2026"] }) : 'Complete Purchase' })] }), _jsxs("div", { className: `${cardSurface} p-6 sticky top-20 h-fit`, children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4", children: "Summary" }), _jsxs("p", { className: "text-sm text-fog light:text-fog-light mb-2", children: [quantity, " ticket(s)"] }), _jsxs("p", { className: "font-bebas text-3xl text-accent light:text-accent-light", children: ["KES ", totalPrice.toLocaleString()] }), _jsx("p", { className: "text-xs text-fog light:text-fog-light mt-4", children: "M-Pesa prompt will appear on your phone after checkout." })] })] }), _jsx(PaymentStatusModal, { isOpen: showPaymentModal, checkoutRequestId: checkoutRequestId, phone: phone, onClose: handleModalClose })] }));
}
//# sourceMappingURL=EventCheckout.js.map