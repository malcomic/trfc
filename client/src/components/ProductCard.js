import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ProductCard({ product }) {
    return (_jsxs("div", { className: "card p-4 bg-white", children: [product.image_url && _jsx("img", { src: product.image_url, alt: product.name, className: "w-full h-48 object-cover rounded-lg" }), _jsx("h3", { className: "text-xl font-semibold mt-4", children: product.name }), _jsx("p", { className: "text-gray-600 text-sm", children: product.category }), _jsxs("p", { className: "font-bold text-primary mt-2", children: ["KES ", product.price] })] }));
}
//# sourceMappingURL=ProductCard.js.map