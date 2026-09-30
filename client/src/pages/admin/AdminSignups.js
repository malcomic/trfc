import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader, AlertCircle, UserPlus, Download, MessageCircle } from 'lucide-react';
import { getAdminSignups } from '../../api/signups';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard';
import AdminResponsiveData from '../../components/admin/AdminResponsiveData';
import { PROGRAMS, PROGRAM_ORDER, isProgramId } from '../../content/programs';
import { TIER_LABELS } from '../../content/onboarding';
const selectClass = 'w-full sm:w-auto px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white';
function programName(id) {
    return isProgramId(id) ? PROGRAMS[id].name : id;
}
function tierLabel(tier) {
    return tier in TIER_LABELS ? TIER_LABELS[tier] : tier;
}
function statusColor(status) {
    switch (status) {
        case 'paid':
            return 'text-green-600 dark:text-green-400';
        case 'failed':
            return 'text-red-600 dark:text-red-400';
        case 'pending':
            return 'text-yellow-600 dark:text-yellow-400';
        default:
            return 'text-gray-500 dark:text-gray-400';
    }
}
function statusLabel(status) {
    return status === 'n/a' ? 'Free' : status;
}
function whatsappLink(number) {
    return number ? `https://wa.me/${number.replace(/\D/g, '')}` : null;
}
function csvEscape(value) {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function exportCsv(rows) {
    const header = [
        'Date', 'Name', 'Phone', 'WhatsApp', 'Program', 'Tier', 'Returning',
        'Amount', 'Payment Status', 'M-Pesa Receipt', 'WhatsApp Sent',
    ];
    const lines = rows.map((s) => [
        new Date(s.created_at).toISOString(),
        s.name,
        s.phone,
        s.whatsapp,
        programName(s.program),
        tierLabel(s.tier),
        s.is_returning ? 'Yes' : 'No',
        s.amount,
        statusLabel(s.payment_status),
        s.mpesa_receipt,
        s.whatsapp_sent_at ? new Date(s.whatsapp_sent_at).toISOString() : '',
    ]
        .map(csvEscape)
        .join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trfc-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
export default function AdminSignups() {
    const [signups, setSignups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({});
    useEffect(() => {
        fetchSignups();
    }, [filters]);
    const fetchSignups = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getAdminSignups(filters);
            setSignups(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to load signups');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Signups", actions: _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => exportCsv(signups), disabled: signups.length === 0, className: "inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition", children: [_jsx(Download, { size: 16 }), " Export CSV"] }), _jsx(UserPlus, { size: 28, className: "text-primary dark:text-primary-dark hidden sm:block" })] }) }), error && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3 mb-6", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-700 dark:text-red-400 mb-4", children: error }), _jsx("button", { onClick: fetchSignups, className: "bg-red-600 text-white px-4 py-2 min-h-[44px] rounded hover:bg-red-700 transition", children: "Try Again" })] })] })), _jsxs("div", { className: "mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3", children: [_jsxs("select", { value: filters.program ?? '', onChange: (e) => setFilter('program', e.target.value), className: selectClass, children: [_jsx("option", { value: "", children: "All programs" }), PROGRAM_ORDER.map((id) => (_jsx("option", { value: id, children: PROGRAMS[id].name }, id)))] }), _jsxs("select", { value: filters.tier ?? '', onChange: (e) => setFilter('tier', e.target.value), className: selectClass, children: [_jsx("option", { value: "", children: "All tiers" }), _jsx("option", { value: "free", children: "Free" }), _jsx("option", { value: "plus", children: "TRFC+" }), _jsx("option", { value: "elite", children: "Elite" })] }), _jsxs("select", { value: filters.payment_status ?? '', onChange: (e) => setFilter('payment_status', e.target.value), className: selectClass, children: [_jsx("option", { value: "", children: "All payment statuses" }), _jsx("option", { value: "n/a", children: "Free (no payment)" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "failed", children: "Failed" })] }), _jsx("input", { type: "date", "aria-label": "From date", value: filters.from ?? '', onChange: (e) => setFilter('from', e.target.value), className: selectClass }), _jsx("input", { type: "date", "aria-label": "To date", value: filters.to ?? '', onChange: (e) => setFilter('to', e.target.value), className: selectClass })] }), loading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) })) : (_jsx(AdminResponsiveData, { isEmpty: signups.length === 0, empty: _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No signups yet" }) }), desktop: _jsxs("table", { className: "w-full min-w-[800px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsx("tr", { children: ['Member', 'Program', 'Tier', 'Amount', 'Status', 'Welcome sent', 'Date', ''].map((h) => (_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: h }, h))) }) }), _jsx("tbody", { children: signups.map((s) => {
                                const wa = whatsappLink(s.whatsapp || s.phone);
                                return (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsxs("td", { className: "px-6 py-4", children: [_jsx("div", { className: "font-semibold", children: s.name || '—' }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: s.phone || '—' }), s.is_returning && (_jsx("span", { className: "inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300", children: "Returning" }))] }), _jsx("td", { className: "px-6 py-4", children: programName(s.program) }), _jsx("td", { className: "px-6 py-4", children: tierLabel(s.tier) }), _jsx("td", { className: "px-6 py-4", children: s.amount > 0 ? `KES ${Number(s.amount).toLocaleString()}` : '—' }), _jsxs("td", { className: `px-6 py-4 capitalize font-medium ${statusColor(s.payment_status)}`, children: [statusLabel(s.payment_status), s.mpesa_receipt && (_jsx("div", { className: "text-xs font-mono text-gray-500 dark:text-gray-400 normal-case", children: s.mpesa_receipt }))] }), _jsx("td", { className: "px-6 py-4 text-sm", children: s.whatsapp_sent_at ? 'Yes' : 'No' }), _jsx("td", { className: "px-6 py-4 text-sm", children: new Date(s.created_at).toLocaleString() }), _jsx("td", { className: "px-6 py-4", children: wa && (_jsxs("a", { href: wa, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:underline", children: [_jsx(MessageCircle, { size: 16 }), " Message"] })) })] }, s.id));
                            }) })] }), mobile: signups.map((s) => {
                    const wa = whatsappLink(s.whatsapp || s.phone);
                    return (_jsxs(AdminMobileCard, { children: [_jsx("p", { className: "font-semibold text-gray-900 dark:text-white", children: s.name || '—' }), _jsx(AdminMobileCardRow, { label: "Phone", value: s.phone || '—' }), _jsx(AdminMobileCardRow, { label: "Program", value: programName(s.program) }), _jsx(AdminMobileCardRow, { label: "Tier", value: tierLabel(s.tier) }), _jsx(AdminMobileCardRow, { label: "Returning", value: s.is_returning ? 'Yes' : 'No' }), _jsx(AdminMobileCardRow, { label: "Amount", value: s.amount > 0 ? `KES ${Number(s.amount).toLocaleString()}` : '—' }), _jsx(AdminMobileCardRow, { label: "Status", value: _jsx("span", { className: `capitalize font-medium ${statusColor(s.payment_status)}`, children: statusLabel(s.payment_status) }) }), _jsx(AdminMobileCardRow, { label: "Welcome sent", value: s.whatsapp_sent_at ? 'Yes' : 'No' }), _jsx(AdminMobileCardRow, { label: "Date", value: new Date(s.created_at).toLocaleString() }), wa && (_jsxs("a", { href: wa, target: "_blank", rel: "noopener noreferrer", className: "mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400", children: [_jsx(MessageCircle, { size: 16 }), " Message on WhatsApp"] }))] }, s.id));
                }) }))] }));
}
//# sourceMappingURL=AdminSignups.js.map