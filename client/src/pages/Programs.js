import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Users, Trophy, Apple, Sunrise, ArrowRight } from 'lucide-react';
import { pageRoot, cardSurface } from '../utils/themeClasses';
const PROGRAMS = [
    {
        icon: Sunrise,
        title: 'Group Runs',
        desc: 'Weekly community runs along Thika Road and beyond. All paces welcome — nobody gets left behind.',
        cta: { to: '/events', label: 'See Upcoming Runs' },
    },
    {
        icon: Trophy,
        title: 'Race Challenges',
        desc: 'Monthly distance and pace challenges with leaderboard recognition and TRFC merch prizes.',
        cta: { to: '/events', label: 'Join a Challenge' },
    },
    {
        icon: Apple,
        title: 'Nutrition Workshops',
        desc: 'Fuel your training with expert-led sessions on race-day nutrition and recovery eating.',
        cta: { to: '/register', label: 'Become a Member' },
    },
    {
        icon: Users,
        title: 'Beginner Bootcamp',
        desc: 'Structured 8-week programme for new runners — couch to 5K with coached sessions.',
        cta: { to: '/register', label: 'Sign Up' },
    },
];
export default function Programs() {
    return (_jsxs("div", { className: pageRoot, children: [_jsxs("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11 relative overflow-hidden", children: [_jsx("div", { className: "absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-fire/5 leading-none pointer-events-none select-none", children: "PROGRAMS" }), _jsxs("div", { className: "max-w-5xl mx-auto relative z-1", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-fire", children: "Train With Us" }), _jsxs("h1", { className: "font-bebas text-5xl leading-tight text-chalk light:text-chalk-light", children: ["TRFC", _jsx("br", {}), _jsx("span", { className: "text-fire", children: "PROGRAMS" })] }), _jsx("p", { className: "text-fog light:text-fog-light mt-4 max-w-xl", children: "Structured training, community accountability, and programmes built for every level \u2014 from first 5K to marathon prep." })] })] }), _jsx("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-2 gap-4", children: PROGRAMS.map(({ icon: Icon, title, desc, cta }) => (_jsxs("div", { className: `${cardSurface} p-8 flex flex-col hover:border-fire/25 transition`, children: [_jsx("div", { className: "w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire mb-5", children: _jsx(Icon, { size: 22 }) }), _jsx("h2", { className: "font-barlow-condensed font-bold text-2xl letter-spacing-tighter mb-3", children: title }), _jsx("p", { className: "text-fog light:text-fog-light text-sm leading-relaxed flex-1 mb-6", children: desc }), _jsxs(Link, { to: cta.to, className: "inline-flex items-center gap-2 text-fire font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase no-underline hover:gap-3 transition-all", children: [cta.label, " ", _jsx(ArrowRight, { size: 14 })] })] }, title))) })] }));
}
//# sourceMappingURL=Programs.js.map