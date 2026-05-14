import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Users, Calendar, Package, ShoppingCart } from 'lucide-react';
import { getEventsForAdmin } from '../../api/admin/events';
import { getProductsForAdmin } from '../../api/admin/products';
import api from '../../api/index';
export default function AdminDashboard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const [events, products, orders, users] = await Promise.all([
                    getEventsForAdmin(),
                    getProductsForAdmin(),
                    api.get('/orders'),
                    api.get('/users'),
                ]);
                setStats([
                    {
                        label: 'Total Events',
                        value: Array.isArray(events) ? events.length : 0,
                        icon: _jsx(Calendar, { className: "w-8 h-8" }),
                        color: 'bg-blue-500',
                    },
                    {
                        label: 'Total Products',
                        value: Array.isArray(products) ? products.length : 0,
                        icon: _jsx(Package, { className: "w-8 h-8" }),
                        color: 'bg-green-500',
                    },
                    {
                        label: 'Total Orders',
                        value: Array.isArray(orders.data) ? orders.data.length : 0,
                        icon: _jsx(ShoppingCart, { className: "w-8 h-8" }),
                        color: 'bg-purple-500',
                    },
                    {
                        label: 'Total Users',
                        value: Array.isArray(users.data) ? users.data.length : 0,
                        icon: _jsx(Users, { className: "w-8 h-8" }),
                        color: 'bg-orange-500',
                    },
                ]);
            }
            catch (err) {
                console.error('Failed to fetch stats:', err);
                setError('Failed to load dashboard statistics');
            }
            finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-96", children: _jsx("div", { className: "text-lg text-gray-600", children: "Loading dashboard..." }) }));
    }
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-bold mb-8 text-gray-800", children: "Admin Dashboard" }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: stats.map((stat, index) => (_jsx("div", { className: "bg-white rounded-lg shadow-md p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600 text-sm font-medium", children: stat.label }), _jsx("p", { className: "text-4xl font-bold text-gray-800 mt-2", children: stat.value })] }), _jsx("div", { className: `${stat.color} text-white p-3 rounded-lg opacity-80`, children: stat.icon })] }) }, index))) }), _jsxs("div", { className: "mt-12 bg-white rounded-lg shadow-md p-6", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-800 mb-4", children: "Quick Actions" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("a", { href: "/admin/events", className: "block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition", children: [_jsx("p", { className: "font-semibold text-blue-900", children: "Manage Events" }), _jsx("p", { className: "text-sm text-blue-700", children: "Create, edit, or delete events" })] }), _jsxs("a", { href: "/admin/products", className: "block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition", children: [_jsx("p", { className: "font-semibold text-green-900", children: "Manage Products" }), _jsx("p", { className: "text-sm text-green-700", children: "Create, edit, or delete products" })] }), _jsxs("a", { href: "/admin/gallery", className: "block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition", children: [_jsx("p", { className: "font-semibold text-purple-900", children: "Manage Gallery" }), _jsx("p", { className: "text-sm text-purple-700", children: "Upload and manage media" })] }), _jsxs("a", { href: "/admin/orders", className: "block p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition", children: [_jsx("p", { className: "font-semibold text-orange-900", children: "View Orders" }), _jsx("p", { className: "text-sm text-orange-700", children: "Track and manage orders" })] })] })] })] }));
}
//# sourceMappingURL=AdminDashboard.js.map