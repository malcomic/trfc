import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import { getEquipmentStats } from '../../api/analytics';
export default function AdminEquipment() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetchStats();
    }, []);
    const fetchStats = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getEquipmentStats();
            setStats(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError('Failed to load equipment statistics');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const totalRentals = stats.reduce((sum, s) => sum + s.rentals, 0);
    const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(Loader, { className: "w-8 h-8 text-gray-400 animate-spin" }) }));
    }
    if (error) {
        return (_jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-700 dark:text-red-400 mb-4", children: error }), _jsx("button", { onClick: fetchStats, className: "bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition", children: "Try Again" })] })] }));
    }
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold mb-8 text-gray-800 dark:text-white", children: "Equipment" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6", children: [_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm font-medium", children: "Total Rentals" }), _jsx("p", { className: "text-4xl font-bold text-gray-800 dark:text-white mt-2", children: totalRentals })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6", children: [_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm font-medium", children: "Total Revenue" }), _jsxs("p", { className: "text-4xl font-bold text-primary dark:text-primary-dark mt-2", children: ["KES ", totalRevenue.toLocaleString()] })] })] }), stats.length === 0 ? (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center", children: _jsx("p", { className: "text-gray-600 dark:text-gray-400 text-lg", children: "No equipment hire data yet" }) })) : (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Equipment" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Rentals" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Revenue" }), _jsx("th", { className: "px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Avg Duration (days)" })] }) }), _jsx("tbody", { children: stats.map((item) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100", children: [_jsx("td", { className: "px-6 py-4 font-semibold", children: item.name }), _jsx("td", { className: "px-6 py-4", children: item.rentals }), _jsxs("td", { className: "px-6 py-4", children: ["KES ", item.revenue.toLocaleString()] }), _jsx("td", { className: "px-6 py-4", children: item.avgDurationDays })] }, item.name))) })] }) }))] }));
}
//# sourceMappingURL=AdminEquipment.js.map