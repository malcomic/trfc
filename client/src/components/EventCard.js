import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { MapPin, Clock, Users, ChevronRight } from 'lucide-react';
const cardStyles = `
  .trfc-ecard {
    --fire: #FF4500;
    --ember: #FF7A1A;
    --night: #0A0A0A;
    --ash: #1C1C1C;
    --smoke: #2A2A2A;
    --chalk: #F5F2EE;
    --fog: #6B6B6B;
    --mist: #2E2E2E;
    --success: #30D158;
    font-family: 'Barlow', 'Barlow Condensed', sans-serif;
    background: var(--ash);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* Image */
  .trfc-ecard__img-wrap {
    position: relative;
    overflow: hidden;
    height: 200px;
    background: var(--smoke);
    flex-shrink: 0;
  }
  .trfc-ecard__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: brightness(0.78) saturate(0.85);
    transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), filter 0.3s;
  }
  .trfc-ecard:hover .trfc-ecard__img {
    transform: scale(1.06);
    filter: brightness(0.92) saturate(1);
  }
  .trfc-ecard__img-gradient {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 55%;
    background: linear-gradient(to top, rgba(10,10,10,0.75), transparent);
    pointer-events: none;
  }
  /* No-image placeholder */
  .trfc-ecard__img-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--smoke);
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    color: rgba(255,69,0,0.12);
    letter-spacing: 2px;
    user-select: none;
  }

  /* Date badge — top-left of image */
  .trfc-ecard__date-badge {
    position: absolute;
    top: 12px; left: 12px;
    background: rgba(10,10,10,0.85);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 7px 11px;
    text-align: center;
    min-width: 48px;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    z-index: 2;
  }
  .trfc-ecard__date-day {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    color: var(--fire);
    line-height: 1;
    display: block;
  }
  .trfc-ecard__date-mon {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    display: block;
    margin-top: 1px;
  }

  /* Category tag — top-right */
  .trfc-ecard__tag {
    position: absolute;
    top: 12px; right: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    padding: 4px 9px;
    background: var(--fire);
    color: white;
    z-index: 2;
  }

  /* Free badge */
  .trfc-ecard__free-badge {
    position: absolute;
    top: 12px; right: 12px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 14px;
    letter-spacing: 1px;
    padding: 4px 10px;
    background: var(--success);
    color: white;
    z-index: 2;
  }

  /* Body */
  .trfc-ecard__body {
    padding: 18px 18px 20px;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0;
    border-top: 1px solid rgba(255,255,255,0.04);
  }

  .trfc-ecard__title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.3px;
    color: var(--chalk);
    line-height: 1.2;
    margin-bottom: 10px;
  }

  /* Meta rows */
  .trfc-ecard__meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }
  .trfc-ecard__meta-row {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: var(--fog);
    font-family: 'Barlow', sans-serif;
    line-height: 1;
  }
  .trfc-ecard__meta-row svg { color: var(--fire); flex-shrink: 0; }

  /* Description */
  .trfc-ecard__desc {
    font-size: 13px;
    color: rgba(245,242,238,0.45);
    line-height: 1.65;
    margin-bottom: 16px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Footer */
  .trfc-ecard__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.05);
    margin-top: auto;
  }
  .trfc-ecard__price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    color: var(--fire);
    letter-spacing: 1px;
    line-height: 1;
  }
  .trfc-ecard__price-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    margin-top: 2px;
  }
  .trfc-ecard__cta {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--fire);
    transition: gap 0.2s, color 0.2s;
    border: 1px solid rgba(255,69,0,0.25);
    padding: 7px 12px;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    transition: background 0.2s, color 0.2s;
    cursor: pointer;
    background: rgba(255,69,0,0.06);
  }
  .trfc-ecard:hover .trfc-ecard__cta {
    background: var(--fire);
    color: white;
    border-color: var(--fire);
  }

  /* Left accent line on hover */
  .trfc-ecard::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 2px;
    background: var(--fire);
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    z-index: 3;
  }
  .trfc-ecard:hover::before { transform: scaleY(1); }

  /* Slots indicator */
  .trfc-ecard__slots {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .trfc-ecard__slots-bar {
    flex: 1;
    height: 3px;
    background: var(--mist);
    overflow: hidden;
    max-width: 80px;
  }
  .trfc-ecard__slots-fill {
    height: 100%;
    background: var(--fire);
    transition: width 0.4s ease;
  }
  .trfc-ecard__slots-text { color: var(--fog); }
  .trfc-ecard__slots-text.urgent { color: var(--fire); }
`;
function formatDate(dateStr) {
    if (!dateStr)
        return { day: null, mon: null };
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return { day: null, mon: null };
    return {
        day: d.getDate().toString().padStart(2, '0'),
        mon: d.toLocaleString('en-KE', { month: 'short' }).toUpperCase(),
    };
}
// Inject styles once globally
let stylesInjected = false;
function ensureStyles() {
    if (stylesInjected || document.getElementById('trfc-ecard-styles'))
        return;
    const el = document.createElement('style');
    el.id = 'trfc-ecard-styles';
    el.textContent = cardStyles;
    document.head.appendChild(el);
    stylesInjected = true;
}
export default function EventCard({ event }) {
    ensureStyles();
    const ev = event;
    const { day, mon } = formatDate(ev.date || ev.start_date || ev.event_date);
    const isFree = !ev.price || Number(ev.price) === 0;
    const slots = ev.capacity ? Math.max(0, ev.capacity - (ev.registered_count || 0)) : null;
    const slotsPercent = ev.capacity ? Math.min(100, ((ev.registered_count || 0) / ev.capacity) * 100) : 0;
    const slotsUrgent = slots !== null && slots <= 10;
    return (_jsxs("div", { className: "trfc-ecard", children: [_jsxs("div", { className: "trfc-ecard__img-wrap", children: [ev.image_url ? (_jsxs(_Fragment, { children: [_jsx("img", { src: ev.image_url, alt: ev.title, className: "trfc-ecard__img", onError: (e) => {
                                    e.target.style.display = 'none';
                                } }), _jsx("div", { className: "trfc-ecard__img-gradient" })] })) : (_jsx("div", { className: "trfc-ecard__img-placeholder", children: "TRFC" })), day && (_jsxs("div", { className: "trfc-ecard__date-badge", children: [_jsx("span", { className: "trfc-ecard__date-day", children: day }), _jsx("span", { className: "trfc-ecard__date-mon", children: mon })] })), isFree ? (_jsx("span", { className: "trfc-ecard__free-badge", children: "FREE" })) : ev.category ? (_jsx("span", { className: "trfc-ecard__tag", children: ev.category })) : null] }), _jsxs("div", { className: "trfc-ecard__body", children: [_jsx("h3", { className: "trfc-ecard__title", children: ev.title }), _jsxs("div", { className: "trfc-ecard__meta", children: [ev.location && (_jsxs("div", { className: "trfc-ecard__meta-row", children: [_jsx(MapPin, { size: 11 }), _jsx("span", { children: ev.location })] })), (ev.time || ev.start_time) && (_jsxs("div", { className: "trfc-ecard__meta-row", children: [_jsx(Clock, { size: 11 }), _jsx("span", { children: ev.time || ev.start_time })] })), ev.capacity && (_jsxs("div", { className: "trfc-ecard__meta-row", children: [_jsx(Users, { size: 11 }), _jsxs("span", { children: [ev.registered_count || 0, " / ", ev.capacity, " registered"] })] }))] }), ev.description && (_jsx("p", { className: "trfc-ecard__desc", children: ev.description })), slots !== null && (_jsxs("div", { className: "trfc-ecard__slots", children: [_jsx("div", { className: "trfc-ecard__slots-bar", children: _jsx("div", { className: "trfc-ecard__slots-fill", style: { width: `${slotsPercent}%` } }) }), _jsx("span", { className: `trfc-ecard__slots-text${slotsUrgent ? ' urgent' : ''}`, children: slots === 0 ? 'Full' : `${slots} slot${slots !== 1 ? 's' : ''} left` })] })), _jsxs("div", { className: "trfc-ecard__footer", children: [_jsxs("div", { children: [_jsx("div", { className: "trfc-ecard__price", children: isFree ? 'FREE' : `KES ${Number(ev.price).toLocaleString()}` }), _jsx("div", { className: "trfc-ecard__price-label", children: "Entry Fee" })] }), _jsxs("div", { className: "trfc-ecard__cta", children: ["Register ", _jsx(ChevronRight, { size: 12 })] })] })] })] }));
}
//# sourceMappingURL=EventCard.js.map