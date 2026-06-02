import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader, AlertCircle, Handshake } from 'lucide-react';
import { getPartnershipsForAdmin, updatePartnershipStatus } from '../../api/admin/partnerships';
const STATUS_OPTIONS = ['all', 'pending', 'contacted', 'approved', 'declined'];
export default function AdminPartnerships() {
    const [partnerships, setPartnerships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [savingId, setSavingId] = useState(null);
    useEffect(() => {
        fetchPartnerships();
    }, [filterStatus]);
    const fetchPartnerships = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getPartnershipsForAdmin(filterStatus);
            setPartnerships(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to load partnerships');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleStatusChange = async (id, status) => {
        try {
            setSavingId(id);
            setError('');
            const updated = await updatePartnershipStatus(id, status);
            setPartnerships((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
        }
        catch (err) {
            setError('Failed to update status');
            console.error(err);
        }
        finally {
            setSavingId(null);
        }
    };
    const statusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'text-green-600 dark:text-green-400';
            case 'declined':
                return 'text-red-600 dark:text-red-400';
            case 'contacted':
                return 'text-blue-600 dark:text-blue-400';
            default:
                return 'text-yellow-600 dark:text-yellow-400';
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) }));
    }
    return (_jsxs("div", { children: [_jsxs("h1", { className: "text-4xl font-bold mb-8 text-gray-800 dark:text-white flex items-center gap-3", children: [_jsx(Handshake, { size: 36 }), "Partnerships"] }), error && (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 mb-6", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsx("p", { className: "text-red-700 dark:text-red-400", children: error })] })), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Filter by status" }), _jsx("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white", children: STATUS_OPTIONS.map((s) => (_jsx("option", { value: s, children: s.charAt(0).toUpperCase() + s.slice(1) }, s))) })] }), partnerships.length === 0 ? (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No partnership inquiries yet" }) })) : (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[900px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Company" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Contact" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Tier" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Date" })] }) }), _jsx("tbody", { children: partnerships.map((p) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50", children: [_jsxs("td", { className: "px-6 py-4", children: [_jsx("div", { className: "font-semibold text-gray-900 dark:text-gray-100", children: p.company_name }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: p.email }), p.message && _jsx("div", { className: "text-xs text-gray-400 mt-1 max-w-xs truncate", children: p.message })] }), _jsx("td", { className: "px-6 py-4 text-gray-900 dark:text-gray-100", children: p.contact_person }), _jsx("td", { className: "px-6 py-4 capitalize text-gray-900 dark:text-gray-100", children: p.tier }), _jsx("td", { className: "px-6 py-4 text-gray-900 dark:text-gray-100", children: p.phone }), _jsx("td", { className: "px-6 py-4", children: _jsx("select", { value: p.status, disabled: savingId === p.id, onChange: (e) => handleStatusChange(p.id, e.target.value), className: `px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 capitalize font-medium ${statusColor(p.status)}`, children: STATUS_OPTIONS.filter((s) => s !== 'all').map((s) => (_jsx("option", { value: s, children: s }, s))) }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600 dark:text-gray-400", children: new Date(p.created_at).toLocaleString() })] }, p.id))) })] }) }))] }));
}
//# sourceMappingURL=AdminPartnerships.js.map