import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Package, Image, ShoppingCart, Users, BarChart3, FileText, MessageSquare, Wrench, Ticket, Handshake, Layers, LogOut, ArrowLeft, Menu, X, } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export function isAdminNavActive(pathname, path) {
    if (path === '/admin') {
        return pathname === '/admin';
    }
    return pathname === path || pathname.startsWith(path + '/');
}
const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/reports', label: 'Reports', icon: FileText },
    { path: '/admin/events', label: 'Events', icon: Calendar },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/gallery', label: 'Gallery', icon: Image },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
    { path: '/admin/equipment', label: 'Equipment', icon: Wrench },
    { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
    { path: '/admin/partnerships', label: 'Partnerships', icon: Handshake },
    { path: '/admin/sponsorship-tiers', label: 'Sponsorship Tiers', icon: Layers },
];
function AdminNavLinks({ pathname, onNavigate, }) {
    return (_jsx(_Fragment, { children: navItems.map((item) => {
            const Icon = item.icon;
            const active = isAdminNavActive(pathname, item.path);
            return (_jsxs(Link, { to: item.path, onClick: onNavigate, className: `flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg transition ${active
                    ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`, children: [_jsx(Icon, { size: 20 }), _jsx("span", { children: item.label })] }, item.path));
        }) }));
}
function AdminSidebarFooter({ onNavigate, onLogout, }) {
    return (_jsxs("div", { className: "p-4 border-t border-gray-200 dark:border-gray-700 space-y-2", children: [_jsxs(Link, { to: "/", onClick: onNavigate, className: "flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition", children: [_jsx(ArrowLeft, { size: 20 }), _jsx("span", { children: "Back to site" })] }), _jsxs("button", { type: "button", onClick: () => {
                    onNavigate?.();
                    onLogout();
                }, className: "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition", children: [_jsx(LogOut, { size: 20 }), _jsx("span", { children: "Logout" })] })] }));
}
export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [navOpen, setNavOpen] = useState(false);
    useEffect(() => {
        setNavOpen(false);
    }, [location.pathname]);
    useEffect(() => {
        document.body.style.overflow = navOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [navOpen]);
    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };
    const closeNav = () => setNavOpen(false);
    const sidebarContent = (_jsxs(_Fragment, { children: [_jsx("div", { className: "p-6 border-b border-gray-200 dark:border-gray-700", children: _jsx("h1", { className: "text-2xl font-bold text-primary dark:text-primary-dark", children: "TRFC Admin" }) }), _jsx("nav", { className: "flex-1 p-4 space-y-2 overflow-y-auto", children: _jsx(AdminNavLinks, { pathname: location.pathname, onNavigate: closeNav }) }), _jsx(AdminSidebarFooter, { onNavigate: closeNav, onLogout: handleLogout })] }));
    return (_jsxs("div", { className: "flex min-h-screen bg-white dark:bg-gray-900", children: [_jsx("aside", { className: "hidden lg:flex w-64 flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg dark:shadow-xl shrink-0", children: sidebarContent }), _jsxs("div", { className: `fixed inset-0 z-50 lg:hidden ${navOpen ? '' : 'pointer-events-none'}`, "aria-hidden": !navOpen, children: [_jsx("div", { className: `absolute inset-0 bg-black/50 transition-opacity duration-300 ${navOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`, onClick: closeNav }), _jsxs("aside", { className: `absolute top-0 left-0 bottom-0 w-[min(280px,85vw)] flex flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xl transform transition-transform duration-300 pointer-events-auto ${navOpen ? 'translate-x-0' : '-translate-x-full'}`, children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700", children: [_jsx("h1", { className: "text-xl font-bold text-primary dark:text-primary-dark", children: "TRFC Admin" }), _jsx("button", { type: "button", onClick: closeNav, className: "p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center", "aria-label": "Close menu", children: _jsx(X, { size: 22 }) })] }), _jsx("nav", { className: "flex-1 p-4 space-y-2 overflow-y-auto", children: _jsx(AdminNavLinks, { pathname: location.pathname, onNavigate: closeNav }) }), _jsx(AdminSidebarFooter, { onNavigate: closeNav, onLogout: handleLogout })] })] }), _jsxs("div", { className: "flex flex-1 flex-col min-w-0", children: [_jsxs("header", { className: "lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm", children: [_jsx("button", { type: "button", onClick: () => setNavOpen(true), className: "p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center", "aria-label": "Open menu", children: _jsx(Menu, { size: 22 }) }), _jsx("h1", { className: "text-lg font-bold text-primary dark:text-primary-dark truncate", children: "TRFC Admin" })] }), _jsx("main", { className: "flex-1 overflow-auto bg-gray-50 dark:bg-gray-950", children: _jsx("div", { className: "p-4 sm:p-6 lg:p-8", children: _jsx(Outlet, {}) }) })] })] }));
}
//# sourceMappingURL=AdminLayout.js.map