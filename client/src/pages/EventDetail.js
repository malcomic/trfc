import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { getEventById } from '../api/events';
import { useCart } from '../store/cartStore';
export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantity, setQuantity] = useState(1);
    const { addItem } = useCart();
    useEffect(() => {
        if (id)
            fetchEvent();
    }, [id]);
    const fetchEvent = async () => {
        try {
            setLoading(true);
            const data = await getEventById(id);
            setEvent(data);
        }
        catch (err) {
            setError('Failed to load event');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleAddToCart = () => {
        if (!event)
            return;
        const eventAsProduct = {
            id: event.id,
            name: event.title,
            description: event.description,
            price: event.price,
            stock: event.capacity || 0,
            category: 'event',
            image_url: event.image_url
        };
        addItem(eventAsProduct, quantity);
        alert(`Added ${quantity} ticket(s) to cart!`);
        navigate('/cart');
    };
    if (loading)
        return _jsx("div", { className: "min-h-screen py-12 text-center text-gray-600", children: "Loading..." });
    if (!event || error)
        return (_jsx("div", { className: "min-h-screen py-12 text-center", children: error ? (_jsx("div", { className: "text-red-600", children: error })) : (_jsx("div", { className: "text-gray-600", children: "Event not found" })) }));
    const eventDate = event.event_date ? new Date(event.event_date) : null;
    const formattedDate = eventDate
        ? eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'Date TBA';
    const formattedTime = eventDate
        ? eventDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
        : '';
    return (_jsx("div", { className: "min-h-screen py-12 px-4", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("img", { src: event.image_url || 'https://via.placeholder.com/600', alt: event.title, className: "w-full h-96 object-cover rounded-2xl mb-8" }), _jsx("h1", { className: "text-4xl font-bold mb-4", children: event.title }), _jsx("p", { className: "text-gray-600 mb-8", children: event.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8", children: [_jsxs("div", { className: "bg-light rounded-lg p-6", children: [_jsx("p", { className: "text-gray-600 text-sm mb-2", children: "Location" }), _jsx("p", { className: "font-semibold text-lg", children: event.location })] }), _jsxs("div", { className: "bg-light rounded-lg p-6", children: [_jsx("p", { className: "text-gray-600 text-sm mb-2", children: "Date & Time" }), _jsx("p", { className: "font-semibold text-lg", children: formattedDate }), formattedTime && _jsx("p", { className: "text-gray-600", children: formattedTime })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8", children: [_jsxs("div", { className: "bg-light rounded-lg p-6", children: [_jsx("p", { className: "text-gray-600 text-sm mb-2", children: "Price per Ticket" }), _jsxs("p", { className: "font-bold text-3xl text-primary", children: ["KES ", event.price] })] }), _jsxs("div", { className: "bg-light rounded-lg p-6", children: [_jsx("p", { className: "text-gray-600 text-sm mb-2", children: "Capacity" }), _jsxs("p", { className: "font-semibold text-lg", children: [event.capacity, " tickets available"] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-md p-6 mb-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Number of Tickets" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => setQuantity(Math.max(1, quantity - 1)), className: "px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold", children: "-" }), _jsx("span", { className: "text-2xl font-bold w-12 text-center", children: quantity }), _jsx("button", { onClick: () => setQuantity(quantity + 1), className: "px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold", children: "+" })] })] }), _jsxs("div", { className: "mb-6 text-lg", children: [_jsx("span", { className: "text-gray-600", children: "Total: " }), _jsxs("span", { className: "font-bold text-2xl text-primary", children: ["KES ", (event.price * quantity).toFixed(2)] })] }), _jsxs("button", { onClick: handleAddToCart, className: "w-full bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition flex items-center justify-center gap-2 mb-4", children: [_jsx(ShoppingCart, { size: 20 }), "Add ", quantity, " Ticket", quantity > 1 ? 's' : '', " to Cart"] }), _jsx("button", { className: "w-full bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition", children: "Pay with M-Pesa" })] })] }) }));
}
//# sourceMappingURL=EventDetail.js.map