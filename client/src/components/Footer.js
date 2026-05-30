import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Mail, Phone, MapPin, ArrowUpRight, Heart, MessageCircle, Users, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { ToastStack } from './Toast';
export default function Footer() {
    const { user } = useAuth();
    const isAdmin = user && user.role === 'admin';
    const [toasts, setToasts] = useState([]);
    const showNewsletterToast = () => {
        const id = Date.now();
        setToasts((t) => [...t, { id, type: 'info', title: 'Coming soon', message: 'Newsletter signup is not available yet.' }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    };
    const quickLinks = [
        { to: '/events', label: 'Events' },
        { to: '/programs', label: 'Programs' },
        { to: '/equipment', label: 'Equipment' },
        { to: '/gallery', label: 'Gallery' },
        { to: '/shop', label: 'Shop Merch' },
        { to: '/testimonials', label: 'Testimonials' },
        { to: '/contact', label: 'Contact' },
        { to: '/register', label: 'Join the Community' },
        ...(isAdmin ? [] : [{ to: '/admin/login', label: 'Admin Login' }]),
    ];
    const adminLinks = [
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin/analytics', label: 'Analytics' },
        { to: '/admin/reports', label: 'Reports' },
        { to: '/admin/events', label: 'Events' },
        { to: '/admin/products', label: 'Products' },
        { to: '/admin/gallery', label: 'Gallery' },
        { to: '/admin/orders', label: 'Orders' },
        { to: '/admin/users', label: 'Users' },
        { to: '/admin/testimonials', label: 'Testimonials' },
        { to: '/admin/equipment', label: 'Equipment' },
    ];
    const contacts = [
        { icon: _jsx(Mail, { size: 15 }), label: 'Email', value: 'info@trfc.ke', href: 'mailto:info@trfc.ke' },
        { icon: _jsx(Phone, { size: 15 }), label: 'Phone', value: '+254 712 345 678', href: 'tel:+254712345678' },
        { icon: _jsx(MapPin, { size: 15 }), label: 'Location', value: 'Thika Road, Nairobi', href: '#' },
    ];
    const socials = [
        { icon: _jsx(Heart, { size: 16 }), href: '#', label: 'Instagram' },
        { icon: _jsx(MessageCircle, { size: 16 }), href: '#', label: 'Twitter' },
        { icon: _jsx(Users, { size: 16 }), href: '#', label: 'Facebook' },
        { icon: _jsx(Play, { size: 16 }), href: '#', label: 'YouTube' },
    ];
    return (_jsxs("footer", { className: "bg-night dark:bg-night relative overflow-hidden font-barlow", children: [_jsx("div", { className: "h-0.75 bg-gradient-to-r from-transparent via-fire to-transparent opacity-75" }), _jsx("div", { className: "absolute bottom-0 left-1/2 -translate-x-1/2 font-bebas text-clamp-3xl text-fire/5 letter-spacing-tighter white-space-nowrap pointer-events-none select-none leading-none transform -translate-y-0.5", children: "THIKA ROAD FC" }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] pt-16 relative z-10", children: [_jsxs("div", { className: `grid gap-x-10 pb-14 ${isAdmin ? 'md:grid-cols-7' : 'md:grid-cols-5'} grid-cols-1 sm:grid-cols-2`, children: [_jsxs("div", { className: "col-span-1", children: [_jsxs("div", { className: "font-bebas text-5xl text-chalk leading-none letter-spacing-widest mb-1", children: ["TH", _jsx("span", { className: "text-fire", children: "I" }), "KA", _jsx("br", {}), "ROAD", _jsx("br", {}), "FC"] }), _jsx("p", { className: "font-barlow-condensed font-medium text-xs letter-spacing-widest text-transform-uppercase text-fog mt-1 mb-5", children: "Nairobi \u00B7 Est. 2019" }), _jsx("p", { className: "text-sm leading-loose text-fog max-w-56", children: "Building Nairobi's strongest running community \u2014 one kilometre, one race, one sunrise at a time." }), _jsx("div", { className: "flex gap-2.5 mt-7", children: socials.map((s) => (_jsx("a", { href: s.href, "aria-label": s.label, className: "w-10 h-10 border border-mist flex items-center justify-center text-fog transition-all duration-200 hover:border-fire hover:text-fire hover:bg-fire/10 clip-angled-sm", children: s.icon }, s.label))) })] }), _jsx("div", { className: "hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" }), _jsxs("div", { className: "col-span-1", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-5 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-fire before:inline-block before:flex-shrink-0", children: "Navigation" }), _jsx("nav", { className: "flex flex-col", children: quickLinks.map((l) => (_jsxs(Link, { to: l.to, className: "flex items-center justify-between py-2 border-b border-white/5 font-barlow-condensed font-bold text-lg letter-spacing-tighter text-chalk/55 text-decoration-none transition-all duration-200 hover:text-chalk hover:pl-1.5 last:border-b-0 group", children: [l.label, _jsx(ArrowUpRight, { size: 14, className: "text-fire opacity-0 group-hover:opacity-100 flex-shrink-0" })] }, l.to))) })] }), _jsx("div", { className: "hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" }), _jsxs("div", { className: "col-span-1", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-5 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-fire before:inline-block before:flex-shrink-0", children: "Get In Touch" }), contacts.map((c) => (_jsx("a", { href: c.href, className: "text-decoration-none block", children: _jsxs("div", { className: "flex items-start gap-3.5 py-2.5 border-b border-white/5 last:border-b-0", children: [_jsx("div", { className: "w-8.5 h-8.5 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire flex-shrink-0 mt-0.25", children: c.icon }), _jsxs("div", { children: [_jsx("div", { className: "font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-fog mb-0.5", children: c.label }), _jsx("div", { className: "text-sm text-chalk/70 font-semibold", children: c.value })] })] }) }, c.label))), _jsxs("div", { className: "mt-7 p-4.5 bg-fire/10 border border-fire/15", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk mb-3", children: "Stay in the loop" }), _jsxs("div", { className: "flex gap-0", children: [_jsx("input", { type: "email", placeholder: "your@email.com", className: "flex-1 bg-black/40 border border-white/10 border-r-0 px-3 py-2 text-chalk text-xs font-barlow outline-none transition-all duration-200 focus:border-fire/35 min-w-0" }), _jsx("button", { type: "button", onClick: showNewsletterToast, className: "bg-fire border border-fire text-white px-3.5 py-2 cursor-pointer font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase transition-all duration-200 hover:bg-ember flex-shrink-0", children: "Join" })] })] })] }), isAdmin && (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" }), _jsxs("div", { className: "col-span-1", children: [_jsxs("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-gold mb-5 flex items-center gap-2", children: [_jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "currentColor", children: _jsx("polygon", { points: "5,0 10,10 0,10" }) }), "Admin Panel"] }), adminLinks.map((l) => (_jsx(Link, { to: l.to, className: "flex items-center gap-2 py-1.75 text-xs text-chalk/40 text-decoration-none font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase border-b border-white/5 transition-all duration-200 hover:text-fire hover:gap-3 last:border-b-0 before:w-1 before:h-1 before:rounded-full before:bg-mist before:flex-shrink-0 before:transition-all before:duration-200 hover:before:bg-fire", children: l.label }, l.to)))] })] }))] }), _jsxs("div", { className: "border-t border-white/5 flex items-center justify-between pt-5 pb-5 flex-wrap gap-3", children: [_jsxs("p", { className: "text-xs text-fog letter-spacing-tighter", children: ["\u00A9 ", new Date().getFullYear(), " ", _jsx("strong", { className: "text-fire font-bebas text-sm letter-spacing-widest", children: "TRFC" }), " \u00B7 Thika Road Fitness Community \u00B7 Nairobi, Kenya"] }), _jsxs("div", { className: "flex gap-5", children: [_jsx("a", { href: "/contact", className: "text-xs letter-spacing-widest text-transform-uppercase text-fog text-decoration-none font-barlow-condensed font-bold transition-all duration-200 hover:text-fire", children: "Privacy" }), _jsx("a", { href: "/contact", className: "text-xs letter-spacing-widest text-transform-uppercase text-fog text-decoration-none font-barlow-condensed font-bold transition-all duration-200 hover:text-fire", children: "Terms" }), _jsx(Link, { to: "/contact", className: "text-xs letter-spacing-widest text-transform-uppercase text-fog text-decoration-none font-barlow-condensed font-bold transition-all duration-200 hover:text-fire", children: "Contact" })] })] })] }), _jsx(ToastStack, { toasts: toasts, onDismiss: (id) => setToasts((t) => t.filter((x) => x.id !== id)) })] }));
}
//# sourceMappingURL=Footer.js.map