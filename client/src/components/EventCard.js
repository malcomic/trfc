import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function EventCard({ event }) {
    return (_jsxs("div", { className: "card p-4 bg-white", children: [event.image_url && _jsx("img", { src: event.image_url, alt: event.title, className: "w-full h-48 object-cover rounded-lg" }), _jsx("h3", { className: "text-xl font-semibold mt-4", children: event.title }), _jsx("p", { className: "text-gray-600", children: event.location }), _jsxs("p", { className: "font-bold text-primary mt-2", children: ["KES ", event.price] })] }));
}
//# sourceMappingURL=EventCard.js.map