import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Check, Loader } from 'lucide-react';
import { getPendingTestimonials, approveTestimonial } from '../../api/admin/testimonials';
import AdminConfirmDialog from '../../components/AdminConfirmDialog';
export default function AdminTestimonials() {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [approvingId, setApprovingId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    useEffect(() => {
        fetchPending();
    }, []);
    const fetchPending = async () => {
        try {
            setLoading(true);
            const data = await getPendingTestimonials();
            setTestimonials(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to fetch pending testimonials');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleApprove = async (id) => {
        try {
            setApprovingId(id);
            setError('');
            await approveTestimonial(id);
            setTestimonials(testimonials.filter((t) => t.id !== id));
            setConfirmId(null);
        }
        catch (err) {
            setError('Failed to approve testimonial');
            console.error(err);
        }
        finally {
            setApprovingId(null);
        }
    };
    if (loading) {
        return _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading testimonials..." });
    }
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold mb-8 text-gray-800 dark:text-white", children: "Testimonials" }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), testimonials.length === 0 ? (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No pending testimonials to review" }) })) : (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Member" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Rating" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Message" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Submitted" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Actions" })] }) }), _jsx("tbody", { children: testimonials.map((t) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4 font-semibold", children: t.member_name || 'Anonymous' }), _jsxs("td", { className: "px-6 py-4", children: [t.rating, "/5"] }), _jsx("td", { className: "px-6 py-4 max-w-md truncate", title: t.message, children: t.message }), _jsx("td", { className: "px-6 py-4 text-sm", children: new Date(t.created_at).toLocaleDateString() }), _jsx("td", { className: "px-6 py-4", children: _jsxs("button", { onClick: () => setConfirmId(t.id), disabled: approvingId === t.id, className: "flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 disabled:opacity-50", children: [approvingId === t.id ? (_jsx(Loader, { className: "w-4 h-4 animate-spin" })) : (_jsx(Check, { size: 18 })), "Approve"] }) })] }, t.id))) })] }) })), _jsx(AdminConfirmDialog, { open: confirmId !== null, title: "Approve testimonial", message: "This testimonial will be published on the public site.", confirmLabel: "Approve", onConfirm: () => confirmId && handleApprove(confirmId), onCancel: () => setConfirmId(null) })] }));
}
//# sourceMappingURL=AdminTestimonials.js.map