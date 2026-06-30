import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProductById } from '../api/products';
import { useCart } from '../store/cartStore';
import { AlertCircle, Loader, ShoppingCart, ArrowLeft } from 'lucide-react';
export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);
    useEffect(() => {
        if (id) {
            getProductById(id)
                .then(setProduct)
                .catch(() => setError('Product not found'))
                .finally(() => setLoading(false));
        }
    }, [id]);
    const handleAdd = () => {
        if (!product)
            return;
        addItem(product, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-night flex items-center justify-center", children: _jsx(Loader, { className: "animate-spin text-accent light:text-accent-light w-10 h-10" }) }));
    }
    if (error || !product) {
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk py-16 px-6", children: _jsxs("div", { className: "max-w-xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-3", children: [_jsx(AlertCircle, { className: "text-red-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error || 'Not found' }), _jsx(Link, { to: "/shop", className: "text-accent light:text-accent-light", children: "Back to shop" })] })] }) }));
    }
    const p = product;
    return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: _jsxs("div", { className: "max-w-4xl mx-auto px-[6%] py-10 pb-20", children: [_jsxs("button", { onClick: () => navigate('/shop'), className: "inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-6 bg-transparent border-0 cursor-pointer hover:underline", children: [_jsx(ArrowLeft, { size: 14 }), " Back to Shop"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-10", children: [_jsx("img", { src: p.image_url || 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=600&q=80', alt: p.name, className: "w-full aspect-square object-cover clip-angled brightness-90" }), _jsxs("div", { children: [p.category && (_jsx("p", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-2", children: p.category })), _jsx("h1", { className: "font-bebas text-5xl mb-4", children: p.name }), _jsxs("p", { className: "font-bebas text-4xl text-accent light:text-accent-light mb-6", children: ["KES ", Number(p.price).toLocaleString()] }), p.description && _jsx("p", { className: "text-fog leading-relaxed mb-8", children: p.description }), p.stock === 0 ? (_jsx("p", { className: "text-fog font-barlow-condensed font-bold uppercase text-sm", children: "Sold out" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx("label", { className: "text-sm text-fog", children: "Qty" }), _jsx("input", { type: "number", min: 1, max: p.stock || 99, value: quantity, onChange: (e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1)), className: "w-20 bg-smoke border border-white/10 px-3 py-2 text-chalk" })] }), _jsxs("button", { onClick: handleAdd, className: `w-full py-4 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 ${added ? 'bg-green-600/30 text-green-400' : 'bg-accent light:bg-accent-light text-black light:text-white hover:bg-accent/90 light:hover:bg-accent-light/90'}`, children: [_jsx(ShoppingCart, { size: 18 }), added ? 'Added to Cart!' : 'Add to Cart'] })] }))] })] })] }) }));
}
//# sourceMappingURL=ProductDetail.js.map