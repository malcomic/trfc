import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader, AlertCircle, Wrench } from 'lucide-react';
import { getEquipmentStats } from '../../api/analytics';
import { getEquipmentHireForAdmin } from '../../api/admin/equipment';
export default function AdminEquipment() {
    const [stats, setStats] = useState([]);
    const [hires, setHires] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetchData();
    }, [statusFilter]);
    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');
            const [statsData, hireData] = await Promise.all([
                getEquipmentStats(),
                getEquipmentHireForAdmin(statusFilter),
            ]);
            setStats(Array.isArray(statsData) ? statsData : []);
            setHires(Array.isArray(hireData) ? hireData : []);
        }
        catch (err) {
            setError('Failed to load equipment data');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const totalRentals = stats.reduce((sum, s) => sum + s.rentals, 0);
    const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
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
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) }));
    }
    if (error) {
        return (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-700 dark:text-red-400 mb-4", children: error }), _jsx("button", { onClick: fetchData, className: "bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition", children: "Try Again" })] })] }));
    }
    return (_jsxs("div", { children: [_jsxs("h1", { className: "text-4xl font-bold mb-8 text-gray-800 dark:text-white flex items-center gap-3", children: [_jsx(Wrench, { size: 36 }), "Equipment"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6", children: [_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm font-medium", children: "Total Rentals" }), _jsx("p", { className: "text-4xl font-bold text-gray-800 dark:text-white mt-2", children: totalRentals })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6", children: [_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm font-medium", children: "Total Revenue" }), _jsxs("p", { className: "text-4xl font-bold text-primary dark:text-primary-dark mt-2", children: ["KES ", totalRevenue.toLocaleString()] })] })] }), _jsxs("div", { className: "mb-6 flex items-center gap-4", children: [_jsx("label", { htmlFor: "status-filter", className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: "Filter by payment status:" }), _jsxs("select", { id: "status-filter", value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100", children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "paid", children: "Paid" }), _jsx("option", { value: "failed", children: "Failed" })] })] }), _jsx("h2", { className: "text-2xl font-bold mb-4 text-gray-800 dark:text-white", children: "Hire Records" }), hires.length === 0 ? (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center mb-8", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No equipment hire records" }) })) : (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-x-auto mb-8", children: _jsxs("table", { className: "w-full min-w-[900px]", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Equipment" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Hire Period" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Total" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Payment" })] }) }), _jsx("tbody", { children: hires.map((h) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4 font-semibold", children: h.equipment_name }), _jsx("td", { className: "px-6 py-4", children: h.phone || '—' }), _jsxs("td", { className: "px-6 py-4 text-sm", children: [new Date(h.hire_date).toLocaleDateString(), " \u2013 ", new Date(h.return_date).toLocaleDateString()] }), _jsxs("td", { className: "px-6 py-4", children: ["KES ", Number(h.total_cost).toLocaleString()] }), _jsx("td", { className: `px-6 py-4 capitalize font-medium ${statusColor(h.payment_status)}`, children: h.payment_status })] }, h.id))) })] }) })), _jsx("h2", { className: "text-2xl font-bold mb-4 text-gray-800 dark:text-white", children: "By Equipment" }), stats.length === 0 ? (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No equipment hire data yet" }) })) : (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Equipment" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Rentals" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Revenue" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Avg Duration (days)" })] }) }), _jsx("tbody", { children: stats.map((item) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4 font-semibold", children: item.name }), _jsx("td", { className: "px-6 py-4", children: item.rentals }), _jsxs("td", { className: "px-6 py-4", children: ["KES ", item.revenue.toLocaleString()] }), _jsx("td", { className: "px-6 py-4", children: item.avgDurationDays })] }, item.name))) })] }) }))] }));
}
//# sourceMappingURL=AdminEquipment.js.map