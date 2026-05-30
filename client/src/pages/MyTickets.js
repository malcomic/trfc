import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserTickets } from '../api/events';
import { AlertCircle, Loader, Ticket, ArrowLeft } from 'lucide-react';
export default function MyTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getUserTickets();
                setTickets(data);
            }
            catch (err) {
                setError(err.response?.data?.error || 'Failed to load tickets');
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, []);
    return (_jsxs("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: [_jsx("section", { className: "bg-ink border-b border-white/5 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-3xl mx-auto", children: [_jsxs(Link, { to: "/account", className: "inline-flex items-center gap-2 text-fire text-sm mb-4 no-underline hover:underline", children: [_jsx(ArrowLeft, { size: 14 }), " Account"] }), _jsxs("h1", { className: "font-bebas text-5xl", children: ["MY ", _jsx("span", { className: "text-fire", children: "TICKETS" })] })] }) }), _jsxs("div", { className: "max-w-3xl mx-auto px-[6%] py-10 pb-20", children: [loading && (_jsx("div", { className: "flex justify-center py-16", children: _jsx(Loader, { className: "w-10 h-10 animate-spin text-fire" }) })), error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 text-sm", children: [_jsx(AlertCircle, { size: 18 }), " ", error] })), !loading && !error && tickets.length === 0 && (_jsxs("div", { className: "text-center py-16 text-fog", children: [_jsx(Ticket, { className: "w-12 h-12 mx-auto mb-4 opacity-30" }), _jsx("p", { children: "No tickets yet." }), _jsx(Link, { to: "/events", className: "text-fire mt-4 inline-block no-underline hover:underline", children: "Browse events" })] })), _jsx("div", { className: "space-y-4", children: tickets.map((t) => (_jsxs("div", { className: "bg-ash border border-white/5 p-5 flex flex-wrap gap-4 justify-between items-start", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-lg", children: t.event_title }), _jsx("p", { className: "text-sm text-fog", children: t.location }), _jsx("p", { className: "text-sm text-fog mt-1", children: t.event_date ? new Date(t.event_date).toLocaleDateString() : '—' })] }), _jsxs("div", { className: "text-right", children: [_jsx("span", { className: `inline-block px-3 py-1 text-xs font-bold uppercase ${t.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`, children: t.payment_status }), t.price != null && _jsxs("p", { className: "font-bebas text-xl text-fire mt-2", children: ["KES ", Number(t.price).toLocaleString()] })] })] }, t.id))) })] })] }));
}
//# sourceMappingURL=MyTickets.js.map