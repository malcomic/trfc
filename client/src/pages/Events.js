import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api/events';
import EventCard from '../components/EventCard';
export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetchEvents();
    }, []);
    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents();
            setEvents(data);
        }
        catch (err) {
            setError('Failed to load events');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-4xl font-bold mb-8", children: "Upcoming Events" }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: error })), loading ? (_jsx("p", { className: "text-gray-600", children: "Loading events..." })) : events.length === 0 ? (_jsx("p", { className: "text-gray-600", children: "No events available" })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: events.map((event) => (_jsx(Link, { to: `/events/${event.id}`, className: "bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition transform hover:scale-105", children: _jsx(EventCard, { event: event }) }, event.id))) }))] }) }));
}
//# sourceMappingURL=Events.js.map