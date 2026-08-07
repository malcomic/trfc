import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { CreditCard, Ticket, Award, User, ArrowRight, QrCode, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { pageRoot, cardSurface } from '../utils/themeClasses';
export default function Account() {
    const { user } = useAuth();
    const canScan = user?.role === 'admin' || user?.role === 'scanner';
    const isAdmin = user?.role === 'admin';
    const links = [
        ...(canScan
            ? [{ to: '/admin/scan', label: 'Open Scanner', desc: 'Scan tickets and redeem medals at the gate', icon: QrCode }]
            : []),
        ...(isAdmin
            ? [{ to: '/admin', label: 'Admin Dashboard', desc: 'Manage events, users, and club operations', icon: LayoutDashboard }]
            : []),
        { to: '/account/payments', label: 'Payment History', desc: 'View orders, tickets, medals, and hire payments', icon: CreditCard },
        { to: '/account/tickets', label: 'My Tickets', desc: 'Your event tickets and registration status', icon: Ticket },
        { to: '/account/medals', label: 'My Medals', desc: 'Your challenge medal purchases', icon: Award },
    ];
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-3xl mx-auto flex items-center gap-4", children: [_jsx(User, { className: "text-accent light:text-accent-light", size: 32 }), _jsxs("div", { children: [_jsxs("h1", { className: "font-bebas text-5xl text-chalk light:text-chalk-light", children: ["MY ", _jsx("span", { className: "text-accent light:text-accent-light", children: "ACCOUNT" })] }), _jsx("p", { className: "text-fog light:text-fog-light text-sm", children: "Manage your TRFC membership and purchases" })] })] }) }), _jsx("div", { className: "max-w-3xl mx-auto px-[6%] py-10 pb-20 grid gap-4", children: links.map(({ to, label, desc, icon: Icon }) => (_jsxs(Link, { to: to, className: `${cardSurface} p-6 flex items-center gap-5 no-underline text-chalk light:text-chalk-light hover:border-accent/30 light:hover:border-accent-light/30 transition group`, children: [_jsx("div", { className: "w-12 h-12 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light flex-shrink-0", children: _jsx(Icon, { size: 22 }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-xl tracking-tighter", children: label }), _jsx("p", { className: "text-sm text-fog light:text-fog-light", children: desc })] }), _jsx(ArrowRight, { size: 18, className: "text-accent light:text-accent-light opacity-0 group-hover:opacity-100 transition" })] }, to))) })] }));
}
//# sourceMappingURL=Account.js.map