import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader, AlertCircle, Ticket } from 'lucide-react';
import { getTicketsForAdmin } from '../../api/admin/tickets';
export default function AdminTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    useEffect(() => {
        fetchTickets();
    }, []);
    const fetchTickets = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getTicketsForAdmin();
            setTickets(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to load tickets');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const statusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'text-green-600 dark:text-green-400';
            case 'failed':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-yellow-600 dark:text-yellow-400';
        }
    };
    const filteredTickets = filterStatus === 'all'
        ? tickets
        : tickets.filter((t) => t.payment_status === filterStatus);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) }));
    }
    return (_jsxs("div", { children: [_jsxs("h1", { className: "text-4xl font-bold mb-8 text-gray-800 dark:text-white flex items-center gap-3", children: [_jsx(Ticket, { size: 36 }), "Tickets"] }), error && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3 mb-6", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-700 dark:text-red-400 mb-4", children: error }), _jsx("button", { onClick: fetchTickets, className: "bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition", children: "Try Again" })] })] })), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Filter by status" }), _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white", children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "failed", children: "Failed" })] })] }), filteredTickets.length === 0 ? (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No tickets yet" }) })) : (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[800px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Event" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Batch" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Date" })] }) }), _jsx("tbody", { children: filteredTickets.map((t) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsxs("td", { className: "px-6 py-4", children: [_jsx("div", { className: "font-semibold", children: t.event_title || '—' }), t.event_date && (_jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: new Date(t.event_date).toLocaleDateString() }))] }), _jsx("td", { className: "px-6 py-4", children: t.phone || '—' }), _jsx("td", { className: `px-6 py-4 capitalize font-medium ${statusColor(t.payment_status)}`, children: t.payment_status }), _jsx("td", { className: "px-6 py-4 text-xs font-mono text-gray-500 dark:text-gray-400", children: t.purchase_batch_id ? t.purchase_batch_id.slice(0, 8) + '…' : '—' }), _jsx("td", { className: "px-6 py-4 text-sm", children: new Date(t.created_at).toLocaleString() })] }, t.id))) })] }) }))] }));
}
//# sourceMappingURL=AdminTickets.js.map