import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api/events';
import { AlertCircle, ChevronRight, Search, X, MapPin } from 'lucide-react';
import { pageRoot, inputField } from '../utils/themeClasses';
import { getSafeImageUrl } from '../utils/imageUrl';
const EVENT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80';
const FILTERS = ['All', 'Race', 'Training', 'Social', 'Charity'];
function formatDate(dateStr) {
    if (!dateStr)
        return { day: '—', mon: '———' };
    const d = new Date(dateStr);
    return {
        day: d.getDate().toString().padStart(2, '0'),
        mon: d.toLocaleString('en-KE', { month: 'short' }).toUpperCase(),
    };
}
export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    useEffect(() => { fetchEvents(); }, []);
    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents();
            setEvents(data);
        }
        catch (err) {
            setError('Failed to load events. Please try again.');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const filtered = events.filter((e) => {
        const matchSearch = !search ||
            e.title?.toLowerCase().includes(search.toLowerCase()) ||
            e.location?.toLowerCase().includes(search.toLowerCase());
        const category = e.category || '';
        const matchFilter = activeFilter === 'All' ||
            category.toLowerCase() === activeFilter.toLowerCase();
        return matchSearch && matchFilter;
    });
    return (_jsxs("div", { className: pageRoot, children: [_jsxs("section", { className: "relative overflow-hidden bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] py-16 md:py-20", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-0.75 bg-gradient-to-b from-transparent via-accent light:via-accent-light to-transparent opacity-70" }), _jsx("div", { className: "absolute right-[-1%] bottom-[-20px] font-bebas text-clamp-3xl text-accent/5 light:text-accent-light/5 leading-none pointer-events-none select-none tracking-tighter", children: loading ? '00' : String(events.length).padStart(2, '0') }), _jsxs("div", { className: "max-w-5xl mx-auto relative z-1", children: [_jsx("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light", children: "On The Calendar" }), _jsxs("h1", { className: "font-bebas text-clamp-lg leading-tight text-chalk light:text-chalk-light mb-6 tracking-tighter", children: ["UPCOMING", _jsx("br", {}), _jsx("span", { className: "text-transparent [-webkit-text-stroke:2px_#fff] light:[-webkit-text-stroke:2px_#000]", children: "EVENTS" })] }), _jsx("p", { className: "text-fog light:text-fog-light max-w-2xl leading-relaxed mb-6", children: "Stay connected and be part of our exciting lineup of community runs, hikes, fit festivals, bootcamps, and wellness experiences designed for all fitness levels." }), _jsxs("div", { className: "flex items-center gap-7 flex-wrap", children: [_jsxs("div", { className: "flex items-baseline gap-1.5", children: [_jsx("span", { className: "font-bebas text-4xl text-accent light:text-accent-light leading-none", children: loading ? '—' : events.length }), _jsx("span", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light", children: "Events Scheduled" })] }), _jsx("div", { className: "w-px h-7 bg-white/10 light:bg-black/10" }), _jsxs("div", { className: "flex items-baseline gap-1.5", children: [_jsx("span", { className: "font-bebas text-4xl text-accent light:text-accent-light leading-none", children: "NBI" }), _jsx("span", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light", children: "Nairobi & Beyond" })] }), _jsx("div", { className: "w-px h-7 bg-white/10 light:bg-black/10" }), _jsxs("div", { className: "flex items-baseline gap-1.5", children: [_jsx("span", { className: "font-bebas text-4xl text-accent light:text-accent-light leading-none", children: "FREE" }), _jsx("span", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light", children: "To Register" })] })] })] })] }), _jsx("div", { className: "bg-ash light:bg-ash-light border-b border-white/5 light:border-black/8 px-[6%] py-5", children: _jsxs("div", { className: "max-w-5xl mx-auto flex items-center gap-3 flex-wrap", children: [_jsxs("div", { className: "relative flex-1 min-w-52 max-w-sm", children: [_jsx("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200", children: _jsx(Search, { size: 14 }) }), _jsx("input", { className: `w-full ${inputField} font-barlow text-sm px-3.5 py-2.5 pl-10 clip-angled-sm transition-colors duration-200 focus:border-accent/40 light:focus:border-accent-light/40`, type: "text", placeholder: "Search events or locations\u2026", value: search, onChange: (e) => setSearch(e.target.value) }), search && (_jsx("button", { className: "absolute right-3 top-1/2 -translate-y-1/2 bg-none border-0 text-fog light:text-fog-light cursor-pointer p-0.5 flex transition-colors duration-200 hover:text-chalk light:hover:text-chalk-light", onClick: () => setSearch(''), children: _jsx(X, { size: 13 }) }))] }), FILTERS.map((f) => (_jsx("button", { onClick: () => setActiveFilter(f), className: `font-barlow-condensed font-bold text-xs tracking-widest uppercase px-4.5 py-2 transition-all duration-200 clip-angled-sm whitespace-nowrap ${activeFilter === f
                                ? 'bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light'
                                : 'bg-smoke light:bg-smoke-light text-fog light:text-fog-light border border-white/10 light:border-black/10 hover:border-white/20 light:hover:border-black/20 hover:text-chalk light:hover:text-chalk-light'}`, children: f }, f)))] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20", children: [error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: error })] })), loading && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5", children: Array(6).fill(null).map((_, i) => (_jsxs("div", { className: "bg-ash light:bg-ash-light overflow-hidden", children: [_jsx("div", { className: "h-55 bg-smoke light:bg-smoke-light animate-pulse", style: { animation: 'evtShimmer 1.5s ease infinite' } }), _jsxs("div", { className: "p-5 flex flex-col gap-2.5", children: [_jsx("div", { className: "h-3 bg-smoke light:bg-smoke-light rounded animate-pulse", style: { width: '70%' } }), _jsx("div", { className: "h-3 bg-smoke light:bg-smoke-light rounded animate-pulse", style: { width: '45%' } }), _jsx("div", { className: "h-3 bg-smoke light:bg-smoke-light rounded animate-pulse", style: { width: '55%' } })] })] }, i))) })), !loading && !error && (_jsxs("p", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-6", children: ["Showing ", _jsx("span", { className: "text-accent light:text-accent-light", children: filtered.length }), " of ", events.length, " event", events.length !== 1 ? 's' : '', search && _jsxs(_Fragment, { children: [" matching \"", _jsx("span", { className: "text-accent light:text-accent-light", children: search }), "\""] })] })), !loading && !error && filtered.length === 0 && (_jsxs("div", { className: "text-center py-25", children: [_jsxs("div", { className: "font-bebas text-clamp-2xl text-accent/10 light:text-accent-light/10 leading-none mb-4 tracking-tighter", children: ["NO", _jsx("br", {}), "EVENTS"] }), _jsx("p", { className: "font-barlow-condensed font-bold text-xl tracking-widest uppercase text-fog light:text-fog-light mb-2", children: search || activeFilter !== 'All' ? 'No matches found' : 'Nothing scheduled yet' }), _jsx("p", { className: "text-sm text-mist light:text-mist-light", children: search || activeFilter !== 'All'
                                    ? 'Try a different search or filter'
                                    : 'New events are added regularly — check back soon' })] })), !loading && !error && filtered.length > 0 && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5", children: filtered.map((event, idx) => {
                            const { day, mon } = formatDate(event.event_date || event.date || event.start_date);
                            const isFeatured = idx === 0;
                            return (_jsxs(Link, { to: `/events/${event.id}`, className: `block no-underline bg-ash light:bg-ash-light relative overflow-hidden border border-transparent hover:border-accent/30 light:hover:border-accent-light/30 transition-all duration-250 hover:-translate-y-1 hover:z-10 ${isFeatured ? 'md:col-span-2 lg:col-span-2' : ''}`, children: [_jsxs("div", { className: "relative overflow-hidden bg-smoke light:bg-smoke-light", style: { height: isFeatured ? '320px' : '220px' }, children: [_jsx("img", { src: getSafeImageUrl(event.image_url, EVENT_IMAGE_FALLBACK), alt: event.title, className: "w-full h-full object-cover brightness-75 saturate-80 transition-all duration-500 ease-out group-hover:scale-107 group-hover:brightness-90 group-hover:saturate-100", onError: (e) => {
                                                    e.target.src = EVENT_IMAGE_FALLBACK;
                                                } }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" }), _jsxs("div", { className: "absolute top-3.5 left-3.5 bg-night light:bg-night-light border border-white/10 light:border-black/10 px-3 py-2 text-center min-w-12 clip-angled-sm z-10", children: [_jsx("div", { className: "font-bebas text-2xl text-accent light:text-accent-light leading-none", children: day }), _jsx("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mt-0.5", children: mon })] }), event.category && (_jsx("span", { className: "absolute top-3.5 right-3.5 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-accent light:bg-accent-light text-black light:text-white z-10", children: event.category }))] }), _jsxs("div", { className: "px-5.5 py-5.5 border-t border-white/5 light:border-black/8 flex flex-col gap-3.5", children: [_jsx("h3", { className: "font-barlow-condensed font-bold text-lg tracking-tighter text-chalk light:text-chalk-light leading-tight", children: event.title }), event.location && (_jsxs("div", { className: "flex items-center gap-1.75 text-sm text-fog light:text-fog-light", children: [_jsx(MapPin, { size: 11, className: "text-accent light:text-accent-light flex-shrink-0" }), _jsx("span", { children: event.location })] })), event.description && (_jsx("p", { className: "text-sm text-chalk/45 light:text-chalk-light/45 leading-relaxed line-clamp-2", children: event.description })), _jsxs("div", { className: "flex items-center justify-between pt-3.5 border-t border-white/5 light:border-black/8 mt-auto", children: [_jsxs("div", { children: [_jsx("div", { className: "font-bebas text-3xl text-accent light:text-accent-light leading-none", children: event.price === 0 || !event.price
                                                                    ? 'FREE'
                                                                    : `KES ${Number(event.price).toLocaleString()}` }), _jsx("div", { className: "font-barlow-condensed text-xs tracking-widest uppercase text-fog light:text-fog-light mt-0.5", children: "Entry Fee" })] }), _jsxs("div", { className: "flex items-center gap-1.5 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light transition-gap duration-200 group-hover:gap-2.5", children: ["Register ", _jsx(ChevronRight, { size: 14 })] })] })] })] }, event.id));
                        }) }))] }), _jsx("style", { children: `
        @keyframes evtShimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
      ` })] }));
}
//# sourceMappingURL=Events.js.map