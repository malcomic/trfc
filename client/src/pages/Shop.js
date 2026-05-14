import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useCart } from '../store/cartStore';
import { getProducts } from '../api/products';
import ProductCard from '../components/ProductCard';
export default function Shop() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { addItem } = useCart();
    useEffect(() => {
        fetchProducts();
    }, []);
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await getProducts();
            setProducts(data);
        }
        catch (err) {
            setError('Failed to load products');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleAddToCart = (product) => {
        addItem(product, 1);
        alert('Added to cart!');
    };
    return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-4xl font-bold mb-8", children: "TRFC Shop" }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), loading ? (_jsx("p", { children: "Loading products..." })) : products.length === 0 ? (_jsx("p", { className: "text-gray-600", children: "No products available" })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: products.map((product) => (_jsxs("div", { className: "bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition flex flex-col", children: [_jsx(ProductCard, { product: product }), _jsx("div", { className: "p-4 mt-auto", children: _jsx("button", { onClick: () => handleAddToCart(product), className: "w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition", children: "Add to Cart" }) })] }, product.id))) }))] }) }));
}
//# sourceMappingURL=Shop.js.map