import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { CreditCard, Ticket, User, ArrowRight } from 'lucide-react';
import { pageRoot, cardSurface } from '../utils/themeClasses';
export default function Account() {
    const links = [
        { to: '/account/payments', label: 'Payment History', desc: 'View orders, tickets, and hire payments', icon: CreditCard },
        { to: '/account/tickets', label: 'My Tickets', desc: 'Your event tickets and registration status', icon: Ticket },
    ];
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-3xl mx-auto flex items-center gap-4", children: [_jsx(User, { className: "text-fire", size: 32 }), _jsxs("div", { children: [_jsxs("h1", { className: "font-bebas text-5xl text-chalk light:text-chalk-light", children: ["MY ", _jsx("span", { className: "text-fire", children: "ACCOUNT" })] }), _jsx("p", { className: "text-fog light:text-fog-light text-sm", children: "Manage your TRFC membership and purchases" })] })] }) }), _jsx("div", { className: "max-w-3xl mx-auto px-[6%] py-10 pb-20 grid gap-4", children: links.map(({ to, label, desc, icon: Icon }) => (_jsxs(Link, { to: to, className: `${cardSurface} p-6 flex items-center gap-5 no-underline text-chalk light:text-chalk-light hover:border-fire/30 transition group`, children: [_jsx("div", { className: "w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire flex-shrink-0", children: _jsx(Icon, { size: 22 }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-xl letter-spacing-tighter", children: label }), _jsx("p", { className: "text-sm text-fog light:text-fog-light", children: desc })] }), _jsx(ArrowRight, { size: 18, className: "text-fire opacity-0 group-hover:opacity-100 transition" })] }, to))) })] }));
}
//# sourceMappingURL=Account.js.map