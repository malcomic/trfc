import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api/events';
export default function Home() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchEvents();
    }, []);
    const fetchEvents = async () => {
        try {
            const data = await getEvents();
            setEvents(data.slice(0, 3));
        }
        catch (error) {
            console.error('Failed to fetch events:', error);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { children: [_jsx("section", { className: "bg-gradient-to-r from-primary to-orange-600 text-white py-20 px-4", children: _jsxs("div", { className: "max-w-4xl mx-auto text-center", children: [_jsx("h1", { className: "text-5xl font-bold mb-4", children: "TRFC" }), _jsx("p", { className: "text-xl mb-8", children: "Thika Road Fitness Community - Your Journey to Wellness" }), _jsxs("div", { className: "flex flex-col md:flex-row gap-4 justify-center", children: [_jsx(Link, { to: "/register", className: "bg-white text-primary px-8 py-3 rounded-full font-semibold hover:scale-105 transition", children: "Join Now" }), _jsx(Link, { to: "/events", className: "border-2 border-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-primary transition", children: "Upcoming Events" }), _jsx(Link, { to: "/shop", className: "bg-dark px-8 py-3 rounded-full font-semibold hover:scale-105 transition", children: "Shop Merch" })] })] }) }), _jsx("section", { className: "py-12 px-4 bg-light", children: _jsx("div", { className: "max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8", children: [
                        { label: 'Members', value: '500+' },
                        { label: 'Events Run', value: '50+' },
                        { label: 'Programs', value: '10+' },
                        { label: 'Years Active', value: '5+' },
                    ].map((stat) => (_jsxs("div", { className: "text-center p-6 bg-white rounded-2xl shadow-md", children: [_jsx("p", { className: "text-4xl font-bold text-primary mb-2", children: stat.value }), _jsx("p", { className: "text-gray-600", children: stat.label })] }, stat.label))) }) }), _jsx("section", { className: "py-16 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("h2", { className: "text-4xl font-bold mb-8 text-center", children: "Upcoming Events" }), loading ? (_jsx("p", { className: "text-center", children: "Loading events..." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: events.map((event) => (_jsxs(Link, { to: `/events/${event.id}`, className: "bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition", children: [_jsx("img", { src: event.image_url || 'https://via.placeholder.com/300', alt: event.title, className: "w-full h-48 object-cover" }), _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "font-bold text-lg mb-2", children: event.title }), _jsx("p", { className: "text-gray-600 text-sm mb-2", children: event.location }), _jsxs("p", { className: "text-primary font-semibold", children: ["$", event.price] })] })] }, event.id))) }))] }) })] }));
}
//# sourceMappingURL=Home.js.map