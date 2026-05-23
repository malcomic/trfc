import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api/events';
import EventCard from '../components/EventCard';
import { AlertCircle, ChevronRight, Search, X } from 'lucide-react';
const eventsStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600&family=Barlow+Condensed:wght@500;700;900&display=swap');

  .trfc-events {
    --fire: #FF4500;
    --ember: #FF7A1A;
    --night: #0A0A0A;
    --ink: #111111;
    --ash: #1C1C1C;
    --smoke: #2A2A2A;
    --chalk: #F5F2EE;
    --fog: #6B6B6B;
    --mist: #2E2E2E;
    --danger: #FF3B30;
    min-height: 100vh;
    background: var(--night);
    font-family: 'Barlow', sans-serif;
    color: var(--chalk);
  }

  /* ── Hero ── */
  .trfc-events__hero {
    position: relative;
    overflow: hidden;
    background: var(--ink);
    padding: 72px 6% 56px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .trfc-events__hero-bg-num {
    position: absolute;
    right: -1%;
    bottom: -20px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(140px, 20vw, 300px);
    color: rgba(255,69,0,0.05);
    line-height: 1;
    pointer-events: none;
    user-select: none;
    letter-spacing: -4px;
  }
  .trfc-events__hero-line {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: linear-gradient(to bottom, transparent, var(--fire) 20%, var(--fire) 80%, transparent);
    opacity: 0.7;
  }
  .trfc-events__hero-inner {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }
  .trfc-events__eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fire);
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .trfc-events__eyebrow::before {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: var(--fire);
  }
  .trfc-events__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(56px, 9vw, 120px);
    line-height: 0.9;
    color: var(--chalk);
    margin-bottom: 24px;
  }
  .trfc-events__title span {
    color: transparent;
    -webkit-text-stroke: 2px var(--fire);
  }
  .trfc-events__hero-meta {
    display: flex;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
  }
  .trfc-events__hero-stat {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .trfc-events__hero-stat-val {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    color: var(--fire);
    line-height: 1;
  }
  .trfc-events__hero-stat-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
  }
  .trfc-events__hero-sep {
    width: 1px;
    height: 28px;
    background: rgba(255,255,255,0.1);
  }

  /* ── Search & filter bar ── */
  .trfc-events__toolbar {
    background: var(--ash);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    padding: 20px 6%;
  }
  .trfc-events__toolbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* Search */
  .trfc-events__search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 360px;
  }
  .trfc-events__search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--fog);
    pointer-events: none;
    transition: color 0.2s;
  }
  .trfc-events__search-wrap:focus-within .trfc-events__search-icon { color: var(--fire); }
  .trfc-events__search {
    width: 100%;
    background: var(--smoke);
    border: 1px solid rgba(255,255,255,0.07);
    color: var(--chalk);
    font-family: 'Barlow', sans-serif;
    font-size: 14px;
    padding: 10px 36px 10px 40px;
    outline: none;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
    transition: border-color 0.2s;
  }
  .trfc-events__search::placeholder { color: var(--fog); }
  .trfc-events__search:focus { border-color: rgba(255,69,0,0.4); }
  .trfc-events__search-clear {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--fog);
    cursor: pointer;
    padding: 2px;
    display: flex;
    transition: color 0.2s;
  }
  .trfc-events__search-clear:hover { color: var(--chalk); }

  /* Filter pills */
  .trfc-events__filter-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    padding: 9px 18px;
    background: var(--smoke);
    border: 1px solid rgba(255,255,255,0.07);
    color: var(--fog);
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
    transition: all 0.2s;
    white-space: nowrap;
  }
  .trfc-events__filter-btn:hover { border-color: rgba(255,255,255,0.2); color: var(--chalk); }
  .trfc-events__filter-btn.active { background: var(--fire); border-color: var(--fire); color: white; }

  /* ── Grid ── */
  .trfc-events__main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 6% 80px;
  }

  .trfc-events__results-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
    margin-bottom: 24px;
  }
  .trfc-events__results-label span { color: var(--fire); }

  .trfc-events__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2px;
  }

  /* ── Event card ── */
  .trfc-events__card {
    display: block;
    text-decoration: none;
    background: var(--ash);
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0);
    transition: border-color 0.25s, transform 0.25s;
  }
  .trfc-events__card:hover {
    border-color: rgba(255,69,0,0.3);
    transform: translateY(-4px);
    z-index: 2;
  }

  /* Image */
  .trfc-events__card-img-wrap {
    position: relative;
    overflow: hidden;
    height: 220px;
    background: var(--smoke);
  }
  .trfc-events__card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: brightness(0.75) saturate(0.8);
    transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), filter 0.3s;
  }
  .trfc-events__card:hover .trfc-events__card-img {
    transform: scale(1.07);
    filter: brightness(0.9) saturate(1);
  }

  /* Date badge */
  .trfc-events__card-date-badge {
    position: absolute;
    top: 14px;
    left: 14px;
    background: var(--night);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 8px 12px;
    text-align: center;
    min-width: 52px;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  }
  .trfc-events__card-date-day {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 26px;
    color: var(--fire);
    line-height: 1;
  }
  .trfc-events__card-date-mon {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    margin-top: 1px;
  }

  /* Category tag */
  .trfc-events__card-tag {
    position: absolute;
    top: 14px;
    right: 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 4px 10px;
    background: var(--fire);
    color: white;
  }

  /* Gradient overlay on image bottom */
  .trfc-events__card-img-gradient {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 60%;
    background: linear-gradient(to top, rgba(10,10,10,0.7), transparent);
    pointer-events: none;
  }

  /* Body */
  .trfc-events__card-body {
    padding: 20px 22px 22px;
    border-top: 1px solid rgba(255,255,255,0.04);
  }
  .trfc-events__card-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: 0.3px;
    color: var(--chalk);
    line-height: 1.2;
    margin-bottom: 10px;
  }
  .trfc-events__card-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .trfc-events__card-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--fog);
  }
  .trfc-events__card-meta-row svg { color: var(--fire); flex-shrink: 0; }
  .trfc-events__card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .trfc-events__card-price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 30px;
    color: var(--fire);
    line-height: 1;
  }
  .trfc-events__card-price-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    margin-top: 1px;
  }
  .trfc-events__card-cta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fire);
    transition: gap 0.2s;
  }
  .trfc-events__card:hover .trfc-events__card-cta { gap: 10px; }

  /* ── Skeletons ── */
  .trfc-events__skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2px;
  }
  .trfc-events__skeleton {
    background: var(--ash);
    overflow: hidden;
    position: relative;
  }
  .trfc-events__skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent);
    animation: evtShimmer 1.5s ease infinite;
  }
  @keyframes evtShimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }
  .trfc-events__skeleton-img { height: 220px; background: var(--smoke); }
  .trfc-events__skeleton-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 10px; }
  .trfc-events__skeleton-line {
    height: 12px;
    background: var(--smoke);
    border-radius: 2px;
  }

  /* ── Empty state ── */
  .trfc-events__empty {
    text-align: center;
    padding: 100px 24px;
  }
  .trfc-events__empty-word {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(60px, 10vw, 100px);
    color: rgba(255,69,0,0.08);
    line-height: 1;
    margin-bottom: 16px;
    letter-spacing: -1px;
  }
  .trfc-events__empty-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    margin-bottom: 8px;
  }
  .trfc-events__empty-sub {
    font-size: 14px;
    color: var(--mist);
  }

  /* ── Error ── */
  .trfc-events__error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(255,59,48,0.08);
    border: 1px solid rgba(255,59,48,0.2);
    border-left: 3px solid var(--danger);
    padding: 16px 18px;
    margin-bottom: 32px;
    font-size: 14px;
    color: #FF6B65;
  }

  /* ── Featured first card (spans 2 cols on large) ── */
  @media (min-width: 1024px) {
    .trfc-events__card--featured {
      grid-column: span 2;
    }
    .trfc-events__card--featured .trfc-events__card-img-wrap {
      height: 320px;
    }
    .trfc-events__card--featured .trfc-events__card-title {
      font-size: 28px;
    }
    .trfc-events__card--featured .trfc-events__card-price {
      font-size: 40px;
    }
  }
`;
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
    const styleRef = useRef(null);
    useEffect(() => {
        if (document.getElementById('trfc-events-styles'))
            return;
        const el = document.createElement('style');
        el.id = 'trfc-events-styles';
        el.textContent = eventsStyles;
        document.head.appendChild(el);
        styleRef.current = el;
        return () => {
            const existing = document.getElementById('trfc-events-styles');
            if (existing)
                document.head.removeChild(existing);
        };
    }, []);
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
        return matchSearch;
    });
    return (_jsxs("div", { className: "trfc-events", children: [_jsxs("section", { className: "trfc-events__hero", children: [_jsx("div", { className: "trfc-events__hero-line" }), _jsx("div", { className: "trfc-events__hero-bg-num", "aria-hidden": "true", children: loading ? '00' : String(events.length).padStart(2, '0') }), _jsxs("div", { className: "trfc-events__hero-inner", children: [_jsx("div", { className: "trfc-events__eyebrow", children: "On The Calendar" }), _jsxs("h1", { className: "trfc-events__title", children: ["UPCOMING", _jsx("br", {}), _jsx("span", { children: "EVENTS" })] }), _jsxs("div", { className: "trfc-events__hero-meta", children: [_jsxs("div", { className: "trfc-events__hero-stat", children: [_jsx("span", { className: "trfc-events__hero-stat-val", children: loading ? '—' : events.length }), _jsx("span", { className: "trfc-events__hero-stat-label", children: "Events Scheduled" })] }), _jsx("div", { className: "trfc-events__hero-sep" }), _jsxs("div", { className: "trfc-events__hero-stat", children: [_jsx("span", { className: "trfc-events__hero-stat-val", children: "NBI" }), _jsx("span", { className: "trfc-events__hero-stat-label", children: "Nairobi & Beyond" })] }), _jsx("div", { className: "trfc-events__hero-sep" }), _jsxs("div", { className: "trfc-events__hero-stat", children: [_jsx("span", { className: "trfc-events__hero-stat-val", children: "FREE" }), _jsx("span", { className: "trfc-events__hero-stat-label", children: "To Register" })] })] })] })] }), _jsx("div", { className: "trfc-events__toolbar", children: _jsxs("div", { className: "trfc-events__toolbar-inner", children: [_jsxs("div", { className: "trfc-events__search-wrap", children: [_jsx("span", { className: "trfc-events__search-icon", children: _jsx(Search, { size: 14 }) }), _jsx("input", { className: "trfc-events__search", type: "text", placeholder: "Search events or locations\u2026", value: search, onChange: (e) => setSearch(e.target.value) }), search && (_jsx("button", { className: "trfc-events__search-clear", onClick: () => setSearch(''), children: _jsx(X, { size: 13 }) }))] }), FILTERS.map((f) => (_jsx("button", { onClick: () => setActiveFilter(f), className: `trfc-events__filter-btn${activeFilter === f ? ' active' : ''}`, children: f }, f)))] }) }), _jsxs("div", { className: "trfc-events__main", children: [error && (_jsxs("div", { className: "trfc-events__error", children: [_jsx(AlertCircle, { size: 16, style: { flexShrink: 0, marginTop: 1 } }), _jsx("span", { children: error })] })), loading && (_jsx("div", { className: "trfc-events__skeleton-grid", children: Array(6).fill(null).map((_, i) => (_jsxs("div", { className: "trfc-events__skeleton", children: [_jsx("div", { className: "trfc-events__skeleton-img" }), _jsxs("div", { className: "trfc-events__skeleton-body", children: [_jsx("div", { className: "trfc-events__skeleton-line", style: { width: '70%' } }), _jsx("div", { className: "trfc-events__skeleton-line", style: { width: '45%' } }), _jsx("div", { className: "trfc-events__skeleton-line", style: { width: '55%' } })] })] }, i))) })), !loading && !error && (_jsxs("p", { className: "trfc-events__results-label", children: ["Showing ", _jsx("span", { children: filtered.length }), " of ", events.length, " event", events.length !== 1 ? 's' : '', search && _jsxs(_Fragment, { children: [" matching \"", _jsx("span", { children: search }), "\""] })] })), !loading && !error && filtered.length === 0 && (_jsxs("div", { className: "trfc-events__empty", children: [_jsxs("div", { className: "trfc-events__empty-word", children: ["NO", _jsx("br", {}), "EVENTS"] }), _jsx("p", { className: "trfc-events__empty-title", children: search || activeFilter !== 'All' ? 'No matches found' : 'Nothing scheduled yet' }), _jsx("p", { className: "trfc-events__empty-sub", children: search || activeFilter !== 'All'
                                    ? 'Try a different search or filter'
                                    : 'New events are added regularly — check back soon' })] })), !loading && !error && filtered.length > 0 && (_jsx("div", { className: "trfc-events__grid", children: filtered.map((event, idx) => {
                            const { day, mon } = formatDate(event.date || event.start_date);
                            const isFeatured = idx === 0;
                            return (_jsxs(Link, { to: `/events/${event.id}`, className: `trfc-events__card${isFeatured ? ' trfc-events__card--featured' : ''}`, children: [_jsxs("div", { className: "trfc-events__card-img-wrap", children: [_jsx("img", { src: event.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80', alt: event.title, className: "trfc-events__card-img", onError: (e) => {
                                                    e.target.src =
                                                        'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80';
                                                } }), _jsx("div", { className: "trfc-events__card-img-gradient" }), _jsxs("div", { className: "trfc-events__card-date-badge", children: [_jsx("div", { className: "trfc-events__card-date-day", children: day }), _jsx("div", { className: "trfc-events__card-date-mon", children: mon })] }), event.category && (_jsx("span", { className: "trfc-events__card-tag", children: event.category }))] }), _jsxs("div", { className: "trfc-events__card-body", children: [_jsx(EventCard, { event: event }), _jsxs("div", { className: "trfc-events__card-footer", children: [_jsxs("div", { children: [_jsx("div", { className: "trfc-events__card-price", children: event.price === 0 || !event.price
                                                                    ? 'FREE'
                                                                    : `KES ${Number(event.price).toLocaleString()}` }), _jsx("div", { className: "trfc-events__card-price-label", children: "Entry Fee" })] }), _jsxs("div", { className: "trfc-events__card-cta", children: ["Register ", _jsx(ChevronRight, { size: 14 })] })] })] })] }, event.id));
                        }) }))] })] }));
}
//# sourceMappingURL=Events.js.map