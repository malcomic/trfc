import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { AlertCircle, Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { getEventById } from '../api/events';
import { useCart } from '../store/cartStore';
import { Button, Card } from '../components/ui';
=======
import { MapPin, Clock, Users, AlertCircle, Minus, Plus, Ticket } from 'lucide-react';
import { getEventById } from '../api/events';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
import { getSafeImageUrl } from '../utils/imageUrl';
const EVENT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80';
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantity, setQuantity] = useState(1);
    useEffect(() => {
        if (id)
            fetchEvent();
    }, [id]);
    const fetchEvent = async () => {
        try {
            setLoading(true);
            setError('');
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
<<<<<<< HEAD
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
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%]", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 border-4 border-fire/20 border-t-fire rounded-full animate-spin mx-auto mb-4" }), _jsx("p", { className: "text-fog", children: "Loading event details..." })] }) }));
    if (!event || error)
        return (_jsx("div", { className: "min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%] py-12", children: _jsx(Card, { className: "max-w-md w-full", children: _jsxs(Card.Body, { className: "text-center", children: [_jsx(AlertCircle, { size: 40, className: "text-danger-red mx-auto mb-4" }), _jsx("h2", { className: "font-bebas text-2xl text-chalk mb-2 letter-spacing-tighter", children: error ? 'LOAD ERROR' : 'NOT FOUND' }), _jsx("p", { className: "text-fog mb-6", children: error || 'This event could not be found.' }), _jsx(Button, { onClick: () => navigate('/events'), variant: "primary", fullWidth: true, children: "Back to Events" })] }) }) }));
    const eventDate = event.event_date ? new Date(event.event_date) : null;
    const formattedDate = eventDate
        ? eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
=======
    if (loading) {
        return (_jsx("div", { className: pageRoot, children: _jsxs("div", { className: "max-w-4xl mx-auto px-6 py-16", children: [_jsx("div", { className: "h-96 bg-smoke light:bg-smoke-light animate-pulse mb-8" }), _jsx("div", { className: "h-8 bg-smoke light:bg-smoke-light animate-pulse w-2/3 mb-4" }), _jsx("div", { className: "h-4 bg-smoke light:bg-smoke-light animate-pulse w-full mb-2" }), _jsx("div", { className: "h-4 bg-smoke light:bg-smoke-light animate-pulse w-4/5" })] }) }));
    }
    if (!event || error) {
        return (_jsx("div", { className: `${pageRoot} py-16 px-6`, children: _jsx("div", { className: "max-w-2xl mx-auto", children: _jsxs("div", { className: "bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 p-6 flex gap-4", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-300 mb-4", children: error || 'Event not found' }), _jsx("button", { onClick: () => (error ? fetchEvent() : navigate('/events')), className: "bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm mr-3", children: error ? 'Retry' : 'Back to Events' })] })] }) }) }));
    }
    const ev = event;
    const eventDate = ev.event_date ? new Date(ev.event_date) : null;
    const formattedDate = eventDate
        ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
        : 'Date TBA';
    const formattedTime = eventDate
        ? eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '';
<<<<<<< HEAD
    const capacityUsed = Math.max(0, (event.capacity || 0) - (event.capacity ? Math.floor((event.capacity || 0) * 0.3) : 0));
    const capacityPercent = event.capacity ? Math.round((capacityUsed / event.capacity) * 100) : 0;
    return (_jsxs("div", { className: "min-h-screen bg-night text-chalk font-barlow", children: [_jsx("section", { className: "relative overflow-hidden bg-ash border-b border-white/5 px-[6%] pt-0 pb-0", children: _jsx("div", { className: "max-w-5xl mx-auto", children: _jsx("img", { src: event.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&q=80', alt: event.title, className: "w-full h-96 object-cover brightness-75", onError: (e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&q=80';
                        } }) }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-12", children: [_jsxs("div", { className: "mb-10", children: [_jsx("p", { className: "inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-3 before:block before:w-5 before:h-0.5 before:bg-fire", children: "Event Details" }), _jsx("h1", { className: "font-bebas text-clamp-lg text-chalk mb-3 letter-spacing-tighter", children: event.title }), _jsx("p", { className: "text-lg text-fog max-w-3xl leading-relaxed", children: event.description })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsx("div", { className: "lg:col-span-2 space-y-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Card, { children: _jsxs(Card.Body, { className: "flex items-start gap-4", children: [_jsx("div", { className: "w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0", children: _jsx(Calendar, { size: 20, className: "text-fire" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1", children: "Date & Time" }), _jsx("p", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk", children: formattedDate }), formattedTime && (_jsx("p", { className: "text-sm text-fog mt-1", children: formattedTime }))] })] }) }), _jsx(Card, { children: _jsxs(Card.Body, { className: "flex items-start gap-4", children: [_jsx("div", { className: "w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0", children: _jsx(MapPin, { size: 20, className: "text-fire" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1", children: "Location" }), _jsx("p", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk", children: event.location || 'TBA' })] })] }) }), _jsx(Card, { children: _jsxs(Card.Body, { className: "flex items-start gap-4", children: [_jsx("div", { className: "w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0", children: _jsx(Ticket, { size: 20, className: "text-fire" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1", children: "Price" }), _jsxs("p", { className: "font-bebas text-2xl text-fire letter-spacing-tighter", children: ["KES ", event.price] })] })] }) }), _jsx(Card, { children: _jsxs(Card.Body, { className: "flex items-start gap-4", children: [_jsx("div", { className: "w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0", children: _jsx(Users, { size: 20, className: "text-fire" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1", children: "Capacity" }), _jsxs("p", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk", children: [event.capacity, " Slots"] }), _jsx("div", { className: "w-full h-2 bg-smoke rounded-full mt-2 overflow-hidden", children: _jsx("div", { className: "h-full bg-gradient-to-r from-fire to-ember transition-all duration-500", style: { width: `${capacityPercent}%` } }) }), _jsxs("p", { className: "text-xs text-fog mt-1", children: [capacityPercent, "% booked"] })] })] }) })] }) }), _jsx("div", { className: "lg:col-span-1", children: _jsx(Card, { className: "sticky top-4", children: _jsxs(Card.Body, { children: [_jsxs("h3", { className: "font-bebas text-2xl text-chalk mb-6 letter-spacing-tighter", children: ["GET ", _jsx("span", { className: "text-fire", children: "TICKETS" })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-3 block", children: "Number of Tickets" }), _jsxs("div", { className: "flex items-center gap-3 bg-smoke border border-white/10 p-2 rounded-sm", children: [_jsx("button", { onClick: () => setQuantity(Math.max(1, quantity - 1)), className: "flex-shrink-0 w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors rounded-sm font-bold text-fire", children: "\u2212" }), _jsx("span", { className: "flex-1 text-center font-bebas text-2xl text-chalk", children: quantity }), _jsx("button", { onClick: () => setQuantity(quantity + 1), className: "flex-shrink-0 w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors rounded-sm font-bold text-fire", children: "+" })] })] }), _jsxs("div", { className: "space-y-2 mb-6 pb-6 border-b border-white/10 text-sm", children: [_jsxs("div", { className: "flex justify-between text-fog", children: [_jsx("span", { children: "Price per ticket" }), _jsxs("span", { children: ["KES ", event.price] })] }), _jsxs("div", { className: "flex justify-between text-fog", children: [_jsx("span", { children: "Quantity" }), _jsxs("span", { children: ["\u00D7", quantity] })] })] }), _jsxs("div", { className: "flex justify-between items-baseline mb-8", children: [_jsx("span", { className: "font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-fog", children: "Total" }), _jsx("span", { className: "font-bebas text-3xl text-fire letter-spacing-tighter", children: (event.price * quantity).toFixed(0) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(Button, { onClick: handleAddToCart, variant: "primary", size: "lg", fullWidth: true, children: "Add to Cart" }), _jsx(Button, { onClick: handleAddToCart, variant: "secondary", size: "lg", fullWidth: true, children: "Book Now" })] })] }) }) })] })] })] }));
=======
    const isFree = !ev.price || Number(ev.price) === 0;
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("button", { onClick: () => navigate('/events'), className: "text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer font-barlow-condensed font-bold hover:underline", children: "\u2190 Back to Events" }), _jsx("h1", { className: "font-bebas text-5xl leading-tight", children: ev.title })] }) }), _jsxs("div", { className: "max-w-4xl mx-auto px-[6%] py-10 pb-20", children: [_jsx("img", { src: getSafeImageUrl(ev.image_url, EVENT_IMAGE_FALLBACK), alt: ev.title, className: "w-full h-80 object-cover brightness-85 clip-angled mb-8" }), _jsx("p", { className: "text-fog light:text-fog-light mb-8 leading-relaxed", children: ev.description }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-8", children: [_jsxs("div", { className: `${cardSurface} p-5 flex items-start gap-3`, children: [_jsx(MapPin, { size: 18, className: "text-accent light:text-accent-light flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light uppercase tracking-widest mb-1", children: "Location" }), _jsx("p", { className: "font-semibold", children: ev.location })] })] }), _jsxs("div", { className: `${cardSurface} p-5 flex items-start gap-3`, children: [_jsx(Clock, { size: 18, className: "text-accent light:text-accent-light flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light uppercase tracking-widest mb-1", children: "Date & Time" }), _jsx("p", { className: "font-semibold", children: formattedDate }), formattedTime && _jsx("p", { className: "text-fog light:text-fog-light text-sm", children: formattedTime })] })] }), _jsxs("div", { className: `${cardSurface} p-5 flex items-start gap-3`, children: [_jsx(Ticket, { size: 18, className: "text-accent light:text-accent-light flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light uppercase tracking-widest mb-1", children: "Price" }), _jsx("p", { className: "font-bebas text-3xl text-accent light:text-accent-light", children: isFree ? 'FREE' : `KES ${Number(ev.price).toLocaleString()}` })] })] }), ev.capacity && (_jsxs("div", { className: `${cardSurface} p-5 flex items-start gap-3`, children: [_jsx(Users, { size: 18, className: "text-accent light:text-accent-light flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-fog light:text-fog-light uppercase tracking-widest mb-1", children: "Capacity" }), _jsxs("p", { className: "font-semibold", children: [ev.capacity, " spots"] })] })] }))] }), _jsxs("div", { className: `${cardSurface} p-6`, children: [_jsx("label", { className: "block font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4", children: "Number of Tickets" }), _jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx("button", { onClick: () => setQuantity(Math.max(1, quantity - 1)), className: `w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`, children: _jsx(Minus, { size: 16 }) }), _jsx("span", { className: "font-bebas text-3xl w-12 text-center", children: quantity }), _jsx("button", { onClick: () => setQuantity(Math.min(10, quantity + 1)), className: `w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`, children: _jsx(Plus, { size: 16 }) }), _jsxs("span", { className: "text-fog light:text-fog-light ml-4", children: ["Total: ", _jsx("strong", { className: "text-accent light:text-accent-light font-bebas text-2xl", children: isFree ? 'FREE' : `KES ${(Number(ev.price) * quantity).toLocaleString()}` })] })] }), _jsxs("button", { onClick: () => navigate(`/events/${id}/checkout`, { state: { quantity } }), className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-4 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 flex items-center justify-center gap-2", children: [_jsx(Ticket, { size: 18 }), "Buy ", quantity, " Ticket", quantity > 1 ? 's' : ''] })] })] })] }));
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
}
//# sourceMappingURL=EventDetail.js.map