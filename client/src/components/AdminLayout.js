import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Package, Image, ShoppingCart, Users, BarChart3, FileText } from 'lucide-react';
export default function AdminLayout({ children }) {
    const location = useLocation();
    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/admin/reports', label: 'Reports', icon: FileText },
        { path: '/admin/events', label: 'Events', icon: Calendar },
        { path: '/admin/products', label: 'Products', icon: Package },
        { path: '/admin/gallery', label: 'Gallery', icon: Image },
        { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
        { path: '/admin/users', label: 'Users', icon: Users },
    ];
    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };
    return (_jsxs("div", { className: "flex min-h-screen bg-white dark:bg-gray-900", children: [_jsxs("aside", { className: "w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg dark:shadow-xl", children: [_jsx("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700", children: _jsx("h1", { className: "text-2xl font-bold text-[#E8401C] dark:text-[#FF4500]", children: "TRFC Admin" }) }), _jsx("nav", { className: "p-4 space-y-2", children: navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (_jsxs(Link, { to: item.path, className: `flex items-center gap-3 px-4 py-3 rounded-lg transition ${active
                                    ? 'bg-[#E8401C] dark:bg-[#FF4500] text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`, children: [_jsx(Icon, { size: 20 }), _jsx("span", { children: item.label })] }, item.path));
                        }) })] }), _jsx("main", { className: "flex-1 overflow-auto bg-gray-50 dark:bg-gray-950", children: _jsx("div", { className: "p-8", children: children }) })] }));
}
//# sourceMappingURL=AdminLayout.js.map