import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMedals } from '../api/medals';
import { AlertCircle, ChevronRight, Award } from 'lucide-react';
import { pageRoot } from '../utils/themeClasses';
import { getSafeImageUrl } from '../utils/imageUrl';
const MEDAL_FALLBACK = 'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800&q=80';
const TIER_ACCENT = {
    bronze: 'from-amber-700/40 to-amber-900/20',
    silver: 'from-slate-400/30 to-slate-600/20',
    gold: 'from-yellow-500/35 to-amber-600/20',
};
export default function Medals() {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await getMedals();
                setTiers(data);
            }
            catch (err) {
                setError('Failed to load medals. Please try again.');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, []);
    return (_jsxs("div", { className: pageRoot, children: [_jsxs("section", { className: "relative overflow-hidden bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] py-16 md:py-20", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-0.75 bg-gradient-to-b from-transparent via-accent light:via-accent-light to-transparent opacity-70" }), _jsxs("div", { className: "max-w-5xl mx-auto relative z-1", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light", children: "Challenge Medals" }), _jsxs("h1", { className: "font-bebas text-clamp-lg leading-tight text-chalk light:text-chalk-light mb-6 tracking-tighter", children: ["EARN YOUR", _jsx("br", {}), _jsx("span", { className: "text-transparent [-webkit-text-stroke:2px_#fff] light:[-webkit-text-stroke:2px_#000]", children: "MEDAL" })] }), _jsx("p", { className: "text-fog light:text-fog-light max-w-2xl leading-relaxed", children: "Choose Bronze, Silver, or Gold \u2014 then pick your distance and complete payment to claim your challenge medal." })] })] }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-12 pb-20", children: [loading && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [1, 2, 3].map((i) => (_jsx("div", { className: "h-80 bg-smoke light:bg-smoke-light animate-pulse" }, i))) })), error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error }), _jsx("button", { onClick: () => window.location.reload(), className: "bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm", children: "Retry" })] })] })), !loading && !error && tiers.length === 0 && (_jsxs("div", { className: "text-center py-16 text-fog light:text-fog-light", children: [_jsx(Award, { className: "w-12 h-12 mx-auto mb-4 opacity-30" }), _jsx("p", { children: "No medal challenges available right now." })] })), !loading && !error && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: tiers.map((tier) => (_jsxs(Link, { to: `/medals/${tier.slug}`, className: "group relative block no-underline overflow-hidden border border-white/8 light:border-black/10 bg-ash light:bg-ash-light hover:border-accent/40 light:hover:border-accent-light/40 transition", children: [_jsx("div", { className: `absolute inset-0 bg-gradient-to-br ${TIER_ACCENT[tier.slug] || 'from-accent/20 to-transparent'} opacity-80 pointer-events-none` }), _jsx("img", { src: getSafeImageUrl(tier.image_url, MEDAL_FALLBACK), alt: tier.name, className: "relative w-full h-48 object-cover brightness-75 group-hover:brightness-90 transition" }), _jsxs("div", { className: "relative p-6", children: [_jsx("h2", { className: "font-bebas text-4xl text-chalk light:text-chalk-light tracking-tight mb-2", children: tier.name }), _jsx("p", { className: "text-sm text-fog light:text-fog-light line-clamp-2 mb-4", children: tier.description }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-bebas text-2xl text-accent light:text-accent-light", children: tier.min_price != null
                                                        ? `From KES ${Number(tier.min_price).toLocaleString()}`
                                                        : 'See options' }), _jsx(ChevronRight, { className: "text-accent light:text-accent-light group-hover:translate-x-1 transition", size: 20 })] })] })] }, tier.id))) }))] })] }));
}
//# sourceMappingURL=Medals.js.map