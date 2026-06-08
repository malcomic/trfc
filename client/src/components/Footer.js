import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Mail, Phone, MapPin, ArrowUpRight, Heart, Users, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { ToastStack } from './Toast';
import { siteContact, siteSocial } from '../config/site';
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
        { to: '/about', label: 'About' },
        { to: '/events', label: 'Events' },
        { to: '/programs', label: 'Programs' },
        { to: '/partnerships', label: 'Partnerships' },
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
        { to: '/admin/tickets', label: 'Tickets' },
        { to: '/admin/users', label: 'Users' },
        { to: '/admin/testimonials', label: 'Testimonials' },
        { to: '/admin/partnerships', label: 'Partnerships' },
        { to: '/admin/equipment', label: 'Equipment' },
    ];
    const socialIcons = {
        Instagram: _jsx(Heart, { size: 16 }),
        Facebook: _jsx(Users, { size: 16 }),
        YouTube: _jsx(Play, { size: 16 }),
    };
    const contacts = [
        { icon: _jsx(Mail, { size: 15 }), label: 'Email', value: siteContact.email, href: `mailto:${siteContact.email}` },
        { icon: _jsx(Phone, { size: 15 }), label: 'Phone', value: siteContact.phone, href: `tel:${siteContact.phoneTel}` },
        { icon: _jsx(MapPin, { size: 15 }), label: 'Location', value: siteContact.location, href: siteContact.mapsUrl },
    ];
    const socials = siteSocial.map((s) => ({
        ...s,
        icon: socialIcons[s.label] ?? _jsx(Heart, { size: 16 }),
    }));
    return (_jsxs("footer", { className: "bg-night light:bg-ink-light text-chalk light:text-chalk-light relative overflow-hidden font-barlow", children: [_jsx("div", { className: "h-0.75 bg-gradient-to-r from-transparent via-accent light:via-accent-light to-transparent opacity-75" }), _jsx("div", { className: "absolute bottom-0 left-1/2 -translate-x-1/2 font-bebas text-clamp-3xl text-accent/5 light:text-accent-light/5 tracking-tighter whitespace-nowrap pointer-events-none select-none leading-none transform -translate-y-0.5", children: "THIKA ROAD FC" }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] pt-16 relative z-10", children: [_jsxs("div", { className: `grid gap-x-10 pb-14 ${isAdmin ? 'md:grid-cols-7' : 'md:grid-cols-5'} grid-cols-1 sm:grid-cols-2`, children: [_jsxs("div", { className: "col-span-1", children: [_jsxs("div", { className: "font-bebas text-5xl text-chalk light:text-chalk-light leading-none tracking-widest mb-1", children: ["TH", _jsx("span", { className: "text-accent light:text-accent-light", children: "I" }), "KA", _jsx("br", {}), "ROAD", _jsx("br", {}), "FC"] }), _jsx("p", { className: "font-barlow-condensed font-medium text-xs tracking-widest uppercase text-fog light:text-fog-light mt-1 mb-5", children: "Nairobi \u00B7 Est. 2019" }), _jsx("p", { className: "text-sm leading-loose text-fog light:text-fog-light max-w-56", children: "Building Nairobi's strongest running community \u2014 one kilometre, one race, one sunrise at a time." }), _jsxs("div", { className: "flex gap-2.5 mt-7", children: [socials.map((s) => (_jsx("a", { href: s.href, target: "_blank", rel: "noopener noreferrer", "aria-label": s.label, className: "w-10 h-10 border border-mist light:border-mist-light flex items-center justify-center text-fog light:text-fog-light transition-all duration-200 hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light hover:bg-accent/10 light:hover:bg-accent-light/10 clip-angled-sm", children: s.icon }, s.label))), "            "] })] }), _jsx("div", { className: "hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 light:via-black/10 to-transparent" }), _jsxs("div", { className: "col-span-1", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-5 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block before:flex-shrink-0", children: "Navigation" }), _jsx("nav", { className: "flex flex-col", children: quickLinks.map((l) => (_jsxs(Link, { to: l.to, className: "flex items-center justify-between py-2 border-b border-white/5 light:border-black/8 font-barlow-condensed font-bold text-lg tracking-tighter text-chalk/55 light:text-chalk-light/55 no-underline transition-all duration-200 hover:text-chalk light:hover:text-chalk-light hover:pl-1.5 last:border-b-0 group", children: [l.label, _jsx(ArrowUpRight, { size: 14, className: "text-accent light:text-accent-light opacity-0 group-hover:opacity-100 flex-shrink-0" })] }, l.to))) })] }), _jsx("div", { className: "hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 light:via-black/10 to-transparent" }), _jsxs("div", { className: "col-span-1", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-5 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block before:flex-shrink-0", children: "Get In Touch" }), contacts.map((c) => (_jsx("a", { href: c.href, className: "no-underline block", children: _jsxs("div", { className: "flex items-start gap-3.5 py-2.5 border-b border-white/5 light:border-black/8 last:border-b-0", children: [_jsx("div", { className: "w-8.5 h-8.5 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light flex-shrink-0 mt-0.25", children: c.icon }), _jsxs("div", { children: [_jsx("div", { className: "font-barlow-condensed text-xs tracking-widest uppercase text-fog light:text-fog-light mb-0.5", children: c.label }), _jsx("div", { className: "text-sm text-chalk/70 light:text-chalk-light/70 font-semibold", children: c.value })] })] }) }, c.label))), _jsxs("div", { className: "mt-7 p-4.5 bg-accent/10 light:bg-accent-light/10 border border-accent/15 light:border-accent-light/15", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk light:text-chalk-light mb-3", children: "Stay in the loop" }), _jsxs("div", { className: "flex gap-0", children: [_jsx("input", { type: "email", placeholder: "your@email.com", className: "flex-1 bg-black/40 light:bg-smoke-light border border-white/10 light:border-black/10 border-r-0 px-3 py-2 text-chalk light:text-chalk-light text-xs font-barlow outline-none transition-all duration-200 focus:border-accent/35 light:focus:border-accent-light/35 min-w-0" }), _jsx("button", { type: "button", onClick: showNewsletterToast, className: "bg-accent light:bg-accent-light border border-accent light:border-accent-light text-black light:text-white px-3.5 py-2 cursor-pointer font-barlow-condensed font-bold text-xs tracking-widest uppercase transition-all duration-200 hover:bg-accent/90 light:hover:bg-accent-light/90 flex-shrink-0", children: "Join" })] })] })] }), isAdmin && (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 light:via-black/10 to-transparent" }), _jsxs("div", { className: "col-span-1", children: [_jsxs("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-5 flex items-center gap-2", children: [_jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "currentColor", children: _jsx("polygon", { points: "5,0 10,10 0,10" }) }), "Admin Panel"] }), adminLinks.map((l) => (_jsx(Link, { to: l.to, className: "flex items-center gap-2 py-1.75 text-xs text-chalk/40 light:text-chalk-light/40 no-underline font-barlow-condensed font-bold tracking-widest uppercase border-b border-white/5 light:border-black/8 transition-all duration-200 hover:text-accent light:hover:text-accent-light hover:gap-3 last:border-b-0 before:w-1 before:h-1 before:rounded-full before:bg-mist light:before:bg-mist-light before:flex-shrink-0 before:transition-all before:duration-200 hover:before:bg-accent light:before:bg-accent-light", children: l.label }, l.to)))] })] }))] }), _jsxs("div", { className: "border-t border-white/5 light:border-black/8 flex items-center justify-between pt-5 pb-5 flex-wrap gap-3", children: [_jsxs("p", { className: "text-xs text-fog light:text-fog-light tracking-tighter", children: ["\u00A9 ", new Date().getFullYear(), " ", _jsx("strong", { className: "text-accent light:text-accent-light font-bebas text-sm tracking-widest", children: "TRFC" }), " \u00B7 Thika Road Fitness Community \u00B7 Nairobi, Kenya"] }), _jsxs("div", { className: "flex gap-5", children: [_jsx(Link, { to: "/privacy", className: "text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline font-barlow-condensed font-bold transition-all duration-200 hover:text-accent light:hover:text-accent-light", children: "Privacy" }), _jsx(Link, { to: "/terms", className: "text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline font-barlow-condensed font-bold transition-all duration-200 hover:text-accent light:hover:text-accent-light", children: "Terms" }), _jsx(Link, { to: "/contact", className: "text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline font-barlow-condensed font-bold transition-all duration-200 hover:text-accent light:hover:text-accent-light", children: "Contact" })] })] })] }), _jsx(ToastStack, { toasts: toasts, onDismiss: (id) => setToasts((t) => t.filter((x) => x.id !== id)) })] }));
}
//# sourceMappingURL=Footer.js.map