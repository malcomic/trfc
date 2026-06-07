import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Package, ShoppingCart } from 'lucide-react';
import { getEventsForAdmin } from '../../api/admin/events';
import { getProductsForAdmin } from '../../api/admin/products';
import api from '../../api/index';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
const quickActions = [
    { to: '/admin/events', label: 'Events', desc: 'Create, edit, or delete events', color: 'blue' },
    { to: '/admin/products', label: 'Products', desc: 'Create, edit, or delete products', color: 'green' },
    { to: '/admin/gallery', label: 'Gallery', desc: 'Upload and manage media', color: 'purple' },
    { to: '/admin/orders', label: 'Orders', desc: 'Track and manage orders', color: 'orange' },
    { to: '/admin/analytics', label: 'Analytics', desc: 'View performance metrics', color: 'indigo' },
    { to: '/admin/reports', label: 'Reports', desc: 'Generate custom reports', color: 'teal' },
    { to: '/admin/users', label: 'Users', desc: 'Manage user roles', color: 'pink' },
    { to: '/admin/testimonials', label: 'Testimonials', desc: 'Review pending submissions', color: 'yellow' },
    { to: '/admin/equipment', label: 'Equipment', desc: 'Equipment hire statistics', color: 'cyan' },
    { to: '/admin/tickets', label: 'Tickets', desc: 'View event ticket sales', color: 'blue' },
    { to: '/admin/partnerships', label: 'Partnerships', desc: 'Review sponsorship inquiries', color: 'indigo' },
    { to: '/admin/sponsorship-tiers', label: 'Sponsorship Tiers', desc: 'Manage tier pricing and benefits', color: 'violet' },
];
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
        return (_jsx("div", { className: "flex items-center justify-center h-96", children: _jsx("div", { className: "text-lg text-gray-600 dark:text-gray-400", children: "Loading dashboard..." }) }));
    }
    return (_jsxs("div", { children: [_jsx(AdminPageHeader, { title: "Dashboard" }), error && (_jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6", children: error })), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: stats.map((stat, index) => (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600 dark:text-gray-400 text-sm font-medium", children: stat.label }), _jsx("p", { className: "text-2xl sm:text-4xl font-bold text-gray-800 dark:text-white mt-2", children: stat.value })] }), _jsx("div", { className: `${stat.color} text-white p-3 rounded-lg opacity-80`, children: stat.icon })] }) }, index))) }), _jsxs("div", { className: "mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6", children: [_jsx("h2", { className: "text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4", children: "Quick Actions" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: quickActions.map((action) => (_jsxs(Link, { to: action.to, className: "block p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition", children: [_jsx("p", { className: "font-semibold text-gray-900 dark:text-white", children: action.label }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: action.desc })] }, action.to))) })] })] }));
}
//# sourceMappingURL=AdminDashboard.js.map