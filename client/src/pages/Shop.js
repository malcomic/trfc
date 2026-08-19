import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../store/cartStore';
import { getProducts } from '../api/products';
import { getMedals } from '../api/medals';
import ProductCard from '../components/ProductCard';
import { ShoppingCart, AlertCircle, SlidersHorizontal, Check, ChevronDown, Award } from 'lucide-react';
import { pageRoot, cardSurface } from '../utils/themeClasses';
import { getSafeImageUrl } from '../utils/imageUrl';
const CATEGORIES = ['All', 'Apparel', 'Accessories', 'Footwear', 'Gear', 'Medals'];
const SORT_OPTIONS = ['Featured', 'Price: Low to High', 'Price: High to Low', 'Newest'];
const PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=500&q=80';
const MEDAL_FALLBACK = 'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800&q=80';
function parseCategory(value) {
    if (!value)
        return 'All';
    const match = CATEGORIES.find((c) => c.toLowerCase() === value.toLowerCase());
    return match ?? 'All';
}
export default function Shop() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [medals, setMedals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState(() => parseCategory(searchParams.get('category')));
    const [sortBy, setSortBy] = useState('Featured');
    const [showSort, setShowSort] = useState(false);
    const [addedIds, setAddedIds] = useState(new Set());
    const [toasts, setToasts] = useState([]);
    const { addItem } = useCart();
    const toastId = useRef(0);
    useEffect(() => {
        fetchCatalog();
    }, []);
    useEffect(() => {
        const fromUrl = parseCategory(searchParams.get('category'));
        setActiveCategory(fromUrl);
    }, [searchParams]);
    const setCategory = (cat) => {
        setActiveCategory(cat);
        if (cat === 'All') {
            setSearchParams({}, { replace: true });
        }
        else {
            setSearchParams({ category: cat }, { replace: true });
        }
    };
    const fetchCatalog = async () => {
        try {
            setLoading(true);
            setError('');
            const [productsData, medalsData] = await Promise.all([getProducts(), getMedals()]);
            setProducts(Array.isArray(productsData) ? productsData : []);
            setMedals(Array.isArray(medalsData) ? medalsData : []);
        }
        catch (err) {
            setError('Failed to load shop catalog. Please try again.');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleAddToCart = (product, e) => {
        e?.preventDefault();
        e?.stopPropagation();
        addItem(product, 1);
        setAddedIds((prev) => new Set(prev).add(product.id));
        setTimeout(() => {
            setAddedIds((prev) => {
                const next = new Set(prev);
                next.delete(product.id);
                return next;
            });
        }, 1500);
        const id = ++toastId.current;
        setToasts((prev) => [...prev, { id, name: product.name }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    const catalogItems = useMemo(() => {
        const showProducts = activeCategory !== 'Medals';
        const showMedals = activeCategory === 'All' || activeCategory === 'Medals';
        const items = [];
        if (showProducts) {
            const filtered = products.filter((p) => {
                if (activeCategory === 'All')
                    return true;
                return (p.category || '').toLowerCase() === activeCategory.toLowerCase();
            });
            for (const product of filtered) {
                items.push({
                    kind: 'product',
                    product,
                    sortPrice: product.price ?? 0,
                    createdAt: product.created_at
                        ? new Date(product.created_at).getTime()
                        : 0,
                });
            }
        }
        if (showMedals) {
            for (const tier of medals) {
                items.push({
                    kind: 'medal',
                    tier,
                    sortPrice: tier.min_price ?? 0,
                    createdAt: 0,
                });
            }
        }
        return items.sort((a, b) => {
            if (sortBy === 'Price: Low to High')
                return a.sortPrice - b.sortPrice;
            if (sortBy === 'Price: High to Low')
                return b.sortPrice - a.sortPrice;
            if (sortBy === 'Newest')
                return b.createdAt - a.createdAt;
            return 0;
        });
    }, [products, medals, activeCategory, sortBy]);
    const isNew = (product) => {
        const created = product.created_at;
        if (!created)
            return false;
        return Date.now() - new Date(created).getTime() < 1000 * 60 * 60 * 24 * 14;
    };
    const totalAvailable = activeCategory === 'Medals'
        ? medals.length
        : activeCategory === 'All'
            ? products.length + medals.length
            : products.filter((p) => (p.category || '').toLowerCase() === activeCategory.toLowerCase()).length;
    const availableLabel = activeCategory === 'Medals'
        ? `${totalAvailable} medal${totalAvailable !== 1 ? 's' : ''}`
        : activeCategory === 'All'
            ? `${products.length} product${products.length !== 1 ? 's' : ''}${medals.length ? ` · ${medals.length} medal${medals.length !== 1 ? 's' : ''}` : ''}`
            : `${totalAvailable} product${totalAvailable !== 1 ? 's' : ''}`;
    return (_jsxs("div", { className: pageRoot, children: [_jsxs("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-16 pb-12 relative overflow-hidden", children: [_jsx("div", { className: "absolute right-[-2%] top-1/2 -translate-y-1/2 font-bebas text-clamp-2xl text-accent/5 light:text-accent-light/5 leading-none pointer-events-none select-none tracking-tighter", children: "MERCH" }), _jsxs("div", { className: "max-w-5xl mx-auto relative z-1 flex items-end justify-between gap-6 flex-wrap", children: [_jsxs("div", { children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:block before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light", children: "Official Merchandise" }), _jsxs("h1", { className: "font-bebas text-clamp-lg leading-tight text-chalk light:text-chalk-light tracking-tighter", children: ["TRFC", _jsx("br", {}), _jsx("span", { className: "text-accent light:text-accent-light", children: "SHOP" })] }), _jsx("p", { className: "text-fog light:text-fog-light mt-4 max-w-md leading-relaxed", children: "Represent the movement with official TRFC merchandise and challenge medals." })] }), _jsxs("div", { className: "pb-2", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2", children: "Jerseys \u00B7 Hoodies \u00B7 Caps \u00B7 Bucket Hats \u00B7 Water Bottles \u00B7 Waist Bags \u00B7 Phone Holders \u00B7 Medals" }), _jsx("p", { className: "font-barlow-condensed font-bold text-sm tracking-widest text-fog light:text-fog-light", children: loading ? '—' : `${availableLabel} available` })] })] })] }), _jsx("div", { className: "bg-accent light:bg-accent-light overflow-hidden py-0.75 animate-ticker", children: _jsx("div", { className: "flex whitespace-nowrap", style: { animation: 'shopTicker 20s linear infinite' }, children: Array(4).fill(null).map((_, i) => (_jsxs("span", { className: "flex items-center", children: [_jsx("span", { className: "font-bebas text-xs tracking-widest text-white px-9", children: "FREE DELIVERY OVER KES 3,000" }), _jsx("span", { className: "font-bebas text-xs tracking-widest text-white/40 px-9", children: "\u2726" }), _jsx("span", { className: "font-bebas text-xs tracking-widest text-white px-9", children: "OFFICIAL TRFC GEAR" }), _jsx("span", { className: "font-bebas text-xs tracking-widest text-white/40 px-9", children: "\u2726" }), _jsx("span", { className: "font-bebas text-xs tracking-widest text-white px-9", children: "WEAR THE COMMUNITY" }), _jsx("span", { className: "font-bebas text-xs tracking-widest text-white/40 px-9", children: "\u2726" })] }, i))) }) }), _jsx("div", { className: "bg-ash light:bg-ash-light border-b border-white/5 light:border-black/8 px-[6%] py-7", children: _jsxs("div", { className: "max-w-5xl mx-auto flex items-center gap-3 flex-wrap", children: [CATEGORIES.map((cat) => (_jsx("button", { onClick: () => setCategory(cat), className: `flex items-center gap-1.75 font-barlow-condensed font-bold text-xs tracking-widest uppercase px-4.5 py-2 transition-all duration-200 clip-angled-sm ${activeCategory === cat
                                ? 'bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light'
                                : 'bg-ash light:bg-ash-light text-fog light:text-fog-light border border-white/10 light:border-black/10 hover:border-white/20 light:hover:border-black/20 hover:text-chalk light:hover:text-chalk-light'}`, children: cat }, cat))), _jsxs("div", { className: "ml-auto relative", children: [_jsxs("button", { className: "flex items-center gap-1.75 font-barlow-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 bg-ash light:bg-ash-light text-fog light:text-fog-light border border-white/10 light:border-black/10 cursor-pointer clip-angled-sm transition-all duration-200 hover:border-white/20 light:hover:border-black/20", onClick: () => setShowSort((v) => !v), children: [_jsx(SlidersHorizontal, { size: 13 }), sortBy, _jsx(ChevronDown, { size: 13, className: "transition-transform duration-200", style: { transform: showSort ? 'rotate(180deg)' : 'none' } })] }), showSort && (_jsx("div", { className: `absolute top-full right-0 mt-2 min-w-52 ${cardSurface} clip-angled-sm z-50`, children: SORT_OPTIONS.map((opt) => (_jsxs("button", { onClick: () => { setSortBy(opt); setShowSort(false); }, className: "w-full text-left bg-none border-none border-b border-white/5 light:border-black/8 last:border-b-0 px-4 py-3 cursor-pointer font-barlow-condensed font-bold text-xs tracking-widest uppercase transition-all duration-200 flex items-center gap-2 hover:text-accent light:hover:text-accent-light hover:bg-white/5 light:hover:bg-black/5", style: { color: opt === sortBy ? '#000000' : 'var(--fog)' }, children: [opt === sortBy && _jsx(Check, { size: 12 }), opt] }, opt))) }))] })] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-9 pb-20", children: [error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: error })] })), loading && (_jsx("div", { className: "grid grid-cols-auto-fill gap-0.5", children: Array(8).fill(null).map((_, i) => (_jsx("div", { className: "bg-ash light:bg-ash-light animate-pulse", style: { aspectRatio: '3/4', animation: 'skelShimmer 1.4s ease infinite' } }, i))) })), !loading && !error && catalogItems.length === 0 && (_jsxs("div", { className: "text-center py-25", children: [_jsxs("div", { className: "font-bebas text-clamp-2xl text-accent/10 light:text-accent-light/10 leading-none mb-4 tracking-tighter", children: ["SOLD", _jsx("br", {}), "OUT"] }), _jsx("p", { className: "font-barlow-condensed font-bold text-xl tracking-widest uppercase text-fog light:text-fog-light mb-2", children: activeCategory === 'Medals' ? 'No medals available right now' : 'No products available right now' }), _jsx("p", { className: "text-sm text-fog light:text-fog-light", children: "Check back soon \u2014 new drops coming." })] })), !loading && !error && catalogItems.length > 0 && (_jsx("div", { className: "grid grid-cols-auto-fill gap-0.5", children: catalogItems.map((item) => {
                            if (item.kind === 'medal') {
                                const { tier } = item;
                                return (_jsxs("div", { className: "bg-ash light:bg-ash-light border border-transparent hover:border-accent/30 light:hover:border-accent-light/30 transition-all duration-250 hover:-translate-y-0.75 hover:z-10", children: [_jsxs(Link, { to: `/medals/${tier.slug}`, className: "relative overflow-hidden aspect-square bg-smoke light:bg-smoke-light group block no-underline", children: [_jsx("img", { src: getSafeImageUrl(tier.image_url, MEDAL_FALLBACK), alt: tier.name, className: "w-full h-full object-cover brightness-90 saturate-85 transition-all duration-500 ease-out group-hover:scale-107 group-hover:brightness-100 group-hover:saturate-100", onError: (e) => {
                                                        ;
                                                        e.target.src = MEDAL_FALLBACK;
                                                    } }), _jsx("span", { className: "absolute top-3 left-3 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-accent light:bg-accent-light text-black light:text-white z-1", children: "Medal" }), _jsx("div", { className: "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center", children: _jsxs("span", { className: "font-barlow-condensed font-black text-xs tracking-widest uppercase px-7 py-3 clip-angled bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light flex items-center gap-2", children: [_jsx(Award, { size: 14 }), " View medal"] }) })] }), _jsxs("div", { className: "px-4.5 py-5 flex flex-col gap-1.5 border-t border-white/5 light:border-black/8", children: [_jsxs(Link, { to: `/medals/${tier.slug}`, className: "no-underline hover:text-accent light:hover:text-accent-light transition-colors duration-200", children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-[17px] tracking-wide text-chalk light:text-chalk-light leading-snug", children: tier.name }), tier.description && (_jsx("p", { className: "text-xs text-fog light:text-fog-light leading-relaxed line-clamp-2", children: tier.description }))] }), _jsxs("div", { className: "flex items-center justify-between mt-2", children: [_jsx("div", { className: "font-bebas text-2xl text-accent light:text-accent-light tracking-wider", children: tier.min_price != null
                                                                ? `From KES ${Number(tier.min_price).toLocaleString()}`
                                                                : 'See options' }), _jsx(Link, { to: `/medals/${tier.slug}`, className: "w-8.5 h-8.5 flex items-center justify-center transition-all duration-200 clip-angled-sm bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 text-accent light:text-accent-light hover:bg-accent/20 light:hover:bg-accent-light/20 no-underline", "aria-label": `View ${tier.name} medal`, children: _jsx(Award, { size: 15 }) })] })] })] }, `medal-${tier.id}`));
                            }
                            const { product } = item;
                            const added = addedIds.has(product.id);
                            return (_jsxs("div", { className: "bg-ash light:bg-ash-light border border-transparent hover:border-accent/30 light:hover:border-accent-light/30 transition-all duration-250 hover:-translate-y-0.75 hover:z-10", children: [_jsxs(Link, { to: `/shop/${product.id}`, className: "relative overflow-hidden aspect-square bg-smoke light:bg-smoke-light group block no-underline", children: [_jsx("img", { src: product.image_url || PRODUCT_FALLBACK, alt: product.name, className: "w-full h-full object-cover brightness-90 saturate-85 transition-all duration-500 ease-out group-hover:scale-107 group-hover:brightness-100 group-hover:saturate-100", onError: (e) => {
                                                    ;
                                                    e.target.src = PRODUCT_FALLBACK;
                                                } }), isNew(product) && (_jsx("span", { className: "absolute top-3 left-3 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-accent light:bg-accent-light text-black light:text-white z-1", children: "New" })), product.stock === 0 && (_jsx("span", { className: "absolute top-3 left-3 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-smoke light:bg-smoke-light text-fog light:text-fog-light z-1", children: "Sold Out" })), _jsx("div", { className: "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center", children: _jsx("button", { onClick: (e) => handleAddToCart(product, e), disabled: product.stock === 0, className: `font-barlow-condensed font-black text-xs tracking-widest uppercase px-7 py-3 clip-angled transition-all duration-300 ease-out disabled:opacity-50 flex items-center gap-2 ${added
                                                        ? 'bg-green-900/40 text-green-400 border border-green-600/50'
                                                        : 'bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light hover:bg-accent/90 light:hover:bg-accent-light/90'}`, style: { transform: added ? 'translateY(0)' : 'translateY(10px)' }, children: added
                                                        ? _jsxs(_Fragment, { children: [_jsx(Check, { size: 14 }), " Added!"] })
                                                        : _jsxs(_Fragment, { children: [_jsx(ShoppingCart, { size: 14 }), " Quick Add"] }) }) })] }), _jsxs("div", { className: "px-4.5 py-5 flex flex-col gap-1.5 border-t border-white/5 light:border-black/8", children: [_jsx(Link, { to: `/shop/${product.id}`, className: "no-underline hover:text-accent light:hover:text-accent-light transition-colors duration-200", children: _jsx(ProductCard, { product: product, variant: "compact" }) }), _jsxs("div", { className: "flex items-center justify-between mt-2", children: [_jsxs("div", { className: "font-bebas text-2xl text-accent light:text-accent-light tracking-wider", children: ["KES ", product.price?.toLocaleString?.() ?? product.price] }), _jsx("button", { onClick: () => handleAddToCart(product), disabled: product.stock === 0, className: `w-8.5 h-8.5 flex items-center justify-center transition-all duration-200 clip-angled-sm disabled:opacity-50 ${added
                                                            ? 'bg-green-600/10 border border-green-600/30 text-green-400'
                                                            : 'bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 text-accent light:text-accent-light hover:bg-accent/20 light:hover:bg-accent-light/20'}`, "aria-label": `Add ${product.name} to cart`, children: added
                                                            ? _jsx(Check, { size: 15 })
                                                            : _jsx(ShoppingCart, { size: 15 }) })] })] })] }, `product-${product.id}`));
                        }) }))] }), _jsx("div", { className: "fixed bottom-4 right-4 sm:bottom-8 sm:right-8 flex flex-col gap-2.5 z-1000", children: toasts.map((toast) => (_jsxs("div", { className: `${cardSurface} border-l-4 border-l-accent light:border-l-accent-light px-5 py-3.5 flex items-center gap-3 clip-angled-sm animate-toastIn w-56 sm:w-64`, children: [_jsx("div", { className: "w-7 h-7 bg-green-600/15 border border-green-600/25 rounded-full flex items-center justify-center text-green-400 flex-shrink-0", children: _jsx(Check, { size: 13 }) }), _jsxs("div", { className: "font-barlow-condensed", children: [_jsx("div", { className: "font-bold text-base text-chalk light:text-chalk-light tracking-tighter", children: "Added to cart" }), _jsx("div", { className: "font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mt-0.25", children: toast.name })] })] }, toast.id))) }), _jsx("style", { children: `
        @keyframes shopTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes skelShimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(40px); }
        }
        .animate-toastIn {
          animation: toastIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .grid-cols-auto-fill {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        }
      ` })] }));
}
//# sourceMappingURL=Shop.js.map