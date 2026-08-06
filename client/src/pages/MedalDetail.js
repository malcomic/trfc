import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertCircle, Minus, Plus, Award, Check } from 'lucide-react';
import { getMedalBySlug } from '../api/medals';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
import { getSafeImageUrl } from '../utils/imageUrl';
const MEDAL_FALLBACK = 'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800&q=80';
export default function MedalDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [tier, setTier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedOption, setSelectedOption] = useState(null);
    const [quantity, setQuantity] = useState(1);
    useEffect(() => {
        if (slug)
            fetchTier();
    }, [slug]);
    const fetchTier = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getMedalBySlug(slug);
            setTier(data);
            if (data.options?.length) {
                setSelectedOption(data.options[0]);
            }
        }
        catch (err) {
            setError('Failed to load medal');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: pageRoot, children: _jsxs("div", { className: "max-w-4xl mx-auto px-6 py-16", children: [_jsx("div", { className: "h-96 bg-smoke light:bg-smoke-light animate-pulse mb-8" }), _jsx("div", { className: "h-8 bg-smoke light:bg-smoke-light animate-pulse w-2/3 mb-4" }), _jsx("div", { className: "h-4 bg-smoke light:bg-smoke-light animate-pulse w-full mb-2" })] }) }));
    }
    if (!tier || error) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsx("div", { className: "max-w-2xl mx-auto", children: _jsxs("div", { className: "bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error || 'Medal not found' }), _jsx("button", { onClick: () => (error ? fetchTier() : navigate('/medals')), className: "bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm", children: error ? 'Retry' : 'Back to Medals' })] })] }) }) }));
    }
    const unitPrice = selectedOption ? Number(selectedOption.price) : 0;
    const total = unitPrice * quantity;
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("button", { onClick: () => navigate('/medals'), className: "text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer font-barlow-condensed font-bold hover:underline", children: "\u2190 Back to Medals" }), _jsx("h1", { className: "font-bebas text-6xl md:text-7xl leading-none tracking-tight text-chalk light:text-chalk-light", children: tier.name }), tier.description && (_jsx("p", { className: "text-fog light:text-fog-light mt-3 max-w-xl leading-relaxed", children: tier.description }))] }) }), _jsxs("div", { className: "max-w-4xl mx-auto px-[6%] py-10 pb-20", children: [_jsx("img", { src: getSafeImageUrl(tier.image_url, MEDAL_FALLBACK), alt: tier.name, className: "w-full h-72 md:h-80 object-cover brightness-85 clip-angled mb-8" }), tier.benefits?.length > 0 && (_jsx("ul", { className: "mb-8 space-y-2", children: tier.benefits.map((benefit) => (_jsxs("li", { className: "flex items-start gap-2 text-fog light:text-fog-light", children: [_jsx(Check, { size: 16, className: "text-accent light:text-accent-light flex-shrink-0 mt-1" }), _jsx("span", { children: benefit })] }, benefit))) })), _jsxs("div", { className: `${cardSurface} p-6`, children: [_jsx("label", { className: "block font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4", children: "Distance" }), _jsx("div", { className: "flex flex-wrap gap-2 mb-6", children: tier.options.map((opt) => {
                                    const active = selectedOption?.id === opt.id;
                                    return (_jsxs("button", { type: "button", onClick: () => setSelectedOption(opt), className: `px-5 py-3 font-barlow-condensed font-bold text-sm tracking-widest uppercase transition border ${active
                                            ? 'bg-accent light:bg-accent-light text-black light:text-white border-accent light:border-accent-light'
                                            : `${inputField} hover:border-accent/40 light:hover:border-accent-light/40`}`, children: [opt.distance_km, " km"] }, opt.id));
                                }) }), _jsx("label", { className: "block font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4", children: "Quantity" }), _jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx("button", { type: "button", onClick: () => setQuantity(Math.max(1, quantity - 1)), className: `w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`, children: _jsx(Minus, { size: 16 }) }), _jsx("span", { className: "font-bebas text-3xl w-12 text-center", children: quantity }), _jsx("button", { type: "button", onClick: () => setQuantity(Math.min(10, quantity + 1)), className: `w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`, children: _jsx(Plus, { size: 16 }) }), _jsxs("span", { className: "text-fog light:text-fog-light ml-4", children: ["Total:", ' ', _jsxs("strong", { className: "text-accent light:text-accent-light font-bebas text-2xl", children: ["KES ", total.toLocaleString()] })] })] }), _jsxs("button", { type: "button", disabled: !selectedOption, onClick: () => navigate(`/medals/${slug}/checkout`, {
                                    state: { optionId: selectedOption.id, quantity },
                                }), className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-4 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 flex items-center justify-center gap-2 disabled:opacity-50", children: [_jsx(Award, { size: 18 }), "Continue to Payment"] })] })] })] }));
}
//# sourceMappingURL=MedalDetail.js.map