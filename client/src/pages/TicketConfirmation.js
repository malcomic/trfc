import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { pollPaymentStatus } from '../api/payments';
import { AlertCircle, CheckCircle, Clock, Ticket } from 'lucide-react';
export default function TicketConfirmation() {
    const { checkoutRequestId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state || {});
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!checkoutRequestId) {
            setLoading(false);
            return;
        }
        const poll = async () => {
            try {
                await pollPaymentStatus(checkoutRequestId);
                setPaymentStatus('paid');
            }
            catch {
                /* timeout — user can refresh */
            }
            finally {
                setLoading(false);
            }
        };
        poll();
    }, [checkoutRequestId]);
    return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow py-12 px-6", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs("div", { className: `p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-fire/10 border-fire'}`, children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [loading ? (_jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-fire" })) : paymentStatus === 'paid' ? (_jsx(CheckCircle, { className: "w-6 h-6 text-green-400" })) : (_jsx(Clock, { className: "w-6 h-6 text-fire" })), _jsx("h1", { className: "font-bebas text-3xl", children: loading ? 'Confirming Payment…' : paymentStatus === 'paid' ? 'Tickets Confirmed!' : 'Payment Pending' })] }), _jsx("p", { className: "text-fog text-sm", children: paymentStatus === 'paid'
                                ? 'Your ticket payment was successful. See you at the event!'
                                : 'Complete the M-Pesa payment on your phone to confirm your tickets.' })] }), _jsxs("div", { className: "bg-ash border border-white/5 p-6 mb-6 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-fire mb-4", children: [_jsx(Ticket, { size: 18 }), _jsx("h2", { className: "font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase", children: "Ticket Details" })] }), state.eventTitle && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Event: " }), state.eventTitle] }), state.quantity && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Tickets: " }), state.quantity] }), state.totalPrice != null && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Total: " }), "KES ", state.totalPrice.toLocaleString()] }), state.phone && _jsxs("p", { children: [_jsx("span", { className: "text-fog", children: "Phone: " }), state.phone] }), checkoutRequestId && (_jsxs("p", { className: "text-xs text-fog font-mono break-all", children: ["Ref: ", checkoutRequestId] }))] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => navigate('/events'), className: "flex-1 bg-fire text-white py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase hover:bg-ember", children: "Back to Events" }), paymentStatus === 'pending' && !loading && (_jsx("button", { onClick: () => window.location.reload(), className: "flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-fire", children: "Refresh" }))] }), paymentStatus === 'pending' && !loading && (_jsxs("div", { className: "mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-300", children: "If payment was not received, return to the event page and try again." })] }))] }) }));
}
//# sourceMappingURL=TicketConfirmation.js.map