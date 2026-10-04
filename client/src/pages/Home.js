import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Footprints, Flame, Timer, Mountain, Star } from 'lucide-react';
import { getEvents } from '../api/events';
import { getHeroSlides } from '../api/gallery';
import { getTestimonials } from '../api/testimonials';
import { pageRoot, cardSurface } from '../utils/themeClasses';
import { getSafeImageUrl } from '../utils/imageUrl';
import HeroCarousel from '../components/HeroCarousel';
import OnboardingFlow from '../components/onboarding/OnboardingFlow';
import { PROGRAMS, PROGRAM_ORDER } from '../content/programs';
import { HERO_COPY } from '../content/onboarding';
const EVENT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80';
const PROGRAM_ICONS = {
    foundations: Footprints,
    fat_loss: Flame,
    endurance: Timer,
    hiking: Mountain,
};
export default function Home() {
    const [events, setEvents] = useState([]);
    const [heroSlides, setHeroSlides] = useState([]);
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [startRequest, setStartRequest] = useState(null);
    const heroRef = useRef(null);
    useEffect(() => {
        fetchData();
    }, []);
    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');
            const [eventsData, heroData, testimonialsData] = await Promise.all([
                getEvents(),
                getHeroSlides(),
                getTestimonials(),
            ]);
            setEvents(eventsData.slice(0, 3));
            setHeroSlides(Array.isArray(heroData) ? heroData : []);
            setTestimonials(Array.isArray(testimonialsData) ? testimonialsData.slice(0, 3) : []);
        }
        catch (err) {
            setError('Failed to load homepage content. Please try again.');
            console.error('Failed to fetch data:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const startFlow = (program) => {
        setStartRequest({ program, nonce: Date.now() });
        heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    return (_jsxs("div", { className: pageRoot, children: [_jsx("style", { children: `
        .hero-word {
          display: block;
          font-family: var(--font-display);
          line-height: 0.92;
          opacity: 0;
        }
        .hero-word:nth-child(1) { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s forwards; }
        .hero-word:nth-child(2) { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; }

        .hero-sub { opacity: 0; animation: fadeUp 0.8s ease 0.6s forwards; }
        .hero-ctas { opacity: 0; animation: fadeUp 0.8s ease 0.8s forwards; }
      ` }), _jsxs("section", { ref: heroRef, className: "relative min-h-screen w-full flex items-center overflow-hidden scroll-mt-16", children: [_jsx("div", { className: "absolute inset-0 w-full h-full bg-ink light:bg-ink-light", children: heroSlides.length > 0 && _jsx(HeroCarousel, { slides: heroSlides }) }), _jsx("div", { className: "absolute inset-0 bg-black/45 md:bg-black/30 light:bg-white/80 pointer-events-none" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent light:hidden pointer-events-none" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 light:from-white/60 light:via-transparent light:to-transparent pointer-events-none" }), _jsx("div", { className: "absolute left-[6%] top-[15%] bottom-[15%] w-0.5 bg-gradient-to-b from-transparent via-accent light:via-accent-light to-transparent opacity-60 z-10" }), _jsx("div", { className: "max-w-[1200px] mx-auto px-[6%] py-[80px] relative z-10 w-full", children: _jsx(OnboardingFlow, { startRequest: startRequest }) })] }), _jsx("section", { className: "bg-ash light:bg-ash-light border-y border-white/5 light:border-black/5 px-[6%] py-8", children: _jsxs("div", { className: "max-w-[1200px] mx-auto flex flex-wrap items-center justify-center md:justify-between gap-6 md:gap-10", children: [[
                            { val: '20,000+', label: 'Community Members' },
                            { val: '7,000+', label: 'On WhatsApp' },
                            { val: '16+', label: 'Successful Events' },
                        ].map((s) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-bebas text-4xl md:text-5xl text-accent light:text-accent-light leading-none", children: s.val }), _jsx("span", { className: "font-barlow-condensed font-bold text-xs md:text-sm tracking-widest uppercase text-chalk/70 light:text-chalk-light/70", children: s.label })] }, s.label))), _jsx("p", { className: "w-full md:w-auto text-center font-barlow-condensed font-bold text-sm tracking-widest uppercase text-fog light:text-fog-light", children: "You're never training alone." })] }) }), _jsx("section", { className: "py-24 px-[6%] bg-ink light:bg-ink-light", children: _jsxs("div", { className: "max-w-[1200px] mx-auto", children: [_jsxs("div", { className: "mb-12", children: [_jsxs("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-3 flex items-center gap-2.5", children: [_jsx("span", { className: "block w-6 h-0.5 bg-accent light:bg-accent-light" }), "Train With Us"] }), _jsx("h2", { className: "font-bebas text-[clamp(40px,5vw,64px)] text-chalk light:text-chalk-light leading-tight", children: "OUR PROGRAMS" }), _jsx("p", { className: "text-fog light:text-fog-light text-base max-w-xl mt-3", children: "Four groups, one community. Pick the one that fits where you are right now." })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: PROGRAM_ORDER.map((id) => {
                                const program = PROGRAMS[id];
                                const Icon = PROGRAM_ICONS[id];
                                return (_jsxs("button", { type: "button", onClick: () => startFlow(id), className: `${cardSurface} text-left p-6 flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:border-accent light:hover:border-accent-light group`, children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsx("div", { className: "w-11 h-11 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light", children: _jsx(Icon, { size: 20 }) }), _jsx("span", { className: `font-barlow-condensed font-bold text-[11px] tracking-widest uppercase px-2 py-0.5 ${program.requiresPaid
                                                        ? 'border border-white/20 light:border-black/20 text-chalk/80 light:text-chalk-light/80'
                                                        : 'bg-accent light:bg-accent-light text-black light:text-white'}`, children: program.requiresPaid ? 'TRFC+' : 'Free' })] }), _jsx("h3", { className: "font-barlow-condensed font-bold text-2xl tracking-tighter text-chalk light:text-chalk-light mb-2", children: program.name }), _jsx("p", { className: "text-fog light:text-fog-light text-sm leading-relaxed flex-1 mb-5", children: program.tagline }), _jsx("span", { className: "font-barlow-condensed text-xs tracking-widest uppercase font-bold text-accent light:text-accent-light", children: "See the program \u2192" })] }, id));
                            }) })] }) }), testimonials.length > 0 && (_jsx("section", { className: "py-24 px-[6%] bg-night light:bg-night-light", children: _jsxs("div", { className: "max-w-[1200px] mx-auto", children: [_jsxs("div", { className: "flex justify-between items-end gap-4 mb-12 flex-wrap", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-3 flex items-center gap-2.5", children: [_jsx("span", { className: "block w-6 h-0.5 bg-accent light:bg-accent-light" }), "Community Voices"] }), _jsx("h2", { className: "font-bebas text-[clamp(40px,5vw,64px)] text-chalk light:text-chalk-light leading-tight", children: "WHAT MEMBERS SAY" })] }), _jsx(Link, { to: "/testimonials", className: "font-barlow-condensed font-bold text-xs tracking-wider text-chalk light:text-chalk-light px-6 py-2.5 border border-white/40 light:border-black/40 transition-all duration-200 hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light no-underline", children: "All Testimonials \u2192" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-5", children: testimonials.map((t) => (_jsxs("div", { className: `${cardSurface} p-6 flex flex-col`, children: [_jsx("div", { className: "flex gap-1 mb-4", children: Array.from({ length: 5 }).map((_, i) => (_jsx(Star, { size: 14, className: i < t.rating ? 'text-accent light:text-accent-light fill-accent light:fill-accent-light' : 'text-fog light:text-fog-light' }, i))) }), _jsxs("p", { className: "text-chalk/90 light:text-chalk-light/90 leading-relaxed flex-1 mb-4", children: ["\u201C", t.message, "\u201D"] }), _jsx("p", { className: "font-barlow-condensed font-bold text-accent light:text-accent-light text-sm", children: t.member_name })] }, t.id))) })] }) })), _jsx("section", { className: "py-20 px-[6%] bg-ink light:bg-ink-light", children: _jsxs("div", { className: "max-w-[1200px] mx-auto", children: [error && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: error })] })), _jsxs("div", { className: "flex justify-between items-end gap-4 mb-8 flex-wrap", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-3 flex items-center gap-2.5", children: [_jsx("span", { className: "block w-6 h-0.5 bg-accent light:bg-accent-light" }), "On The Calendar"] }), _jsx("h2", { className: "font-bebas text-[clamp(32px,4vw,48px)] text-chalk light:text-chalk-light leading-tight", children: "UPCOMING EVENTS" })] }), _jsx(Link, { to: "/events", className: "font-barlow-condensed font-bold text-xs tracking-wider text-chalk light:text-chalk-light px-6 py-2.5 border border-white/40 light:border-black/40 transition-all duration-200 hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light no-underline", children: "All Events \u2192" })] }), loading ? (_jsx("div", { className: "text-center py-10 text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase", children: "Loading events..." })) : events.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: events.map((event) => (_jsxs(Link, { to: `/events/${event.id}`, className: "bg-ash light:bg-ash-light border border-white/6 light:border-black/6 overflow-hidden flex no-underline transition-all duration-300 hover:border-accent light:hover:border-accent-light group", children: [_jsx("div", { className: "w-28 flex-shrink-0 bg-smoke light:bg-smoke-light", children: _jsx("img", { src: getSafeImageUrl(event.image_url, EVENT_IMAGE_FALLBACK), alt: event.title, onError: (e) => { e.target.src = EVENT_IMAGE_FALLBACK; }, className: "w-full h-full object-cover" }) }), _jsxs("div", { className: "p-4 flex flex-col justify-between min-w-0", children: [_jsxs("div", { children: [_jsx("div", { className: "font-barlow-condensed font-bold text-lg tracking-tight text-chalk light:text-chalk-light leading-tight mb-1 truncate", children: event.title }), _jsx("div", { className: "text-xs text-fog light:text-fog-light truncate", children: event.location })] }), _jsx("div", { className: "font-bebas text-xl text-accent light:text-accent-light tracking-wider mt-2", children: event.all_types_sold_out
                                                    ? 'Sold out'
                                                    : event.min_price == null
                                                        ? '—'
                                                        : Number(event.min_price) === 0
                                                            ? 'FREE'
                                                            : `From KES ${Number(event.min_price).toLocaleString()}` })] })] }, event.id))) })) : (_jsx("div", { className: "text-center py-10 text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase", children: "No upcoming events yet \u2014 check back soon!" }))] }) }), _jsxs("section", { className: "py-20 px-[6%] bg-night light:bg-night-light border-t border-white/10 light:border-black/10 relative overflow-hidden", children: [_jsx("div", { className: "absolute -right-[5%] top-1/2 -translate-y-1/2 font-bebas text-[260px] text-chalk/5 light:text-chalk-light/5 leading-none pointer-events-none select-none", children: "RUN" }), _jsxs("div", { className: "max-w-[1200px] mx-auto flex items-center justify-between gap-8 flex-wrap relative", children: [_jsxs("div", { children: [_jsxs("h2", { className: "font-bebas text-[clamp(36px,5vw,64px)] text-chalk light:text-chalk-light leading-tight mb-3", children: ["FIND YOUR PROGRAM.", _jsx("br", {}), "START THIS WEEK."] }), _jsx("p", { className: "text-fog light:text-fog-light text-base max-w-sm", children: HERO_COPY.smallLine })] }), _jsx("button", { type: "button", onClick: () => startFlow(), className: "bg-accent light:bg-accent-light text-black light:text-white px-12 py-4 font-barlow-condensed font-black text-lg tracking-widest uppercase clip-angled-lg inline-block transition-all duration-200 hover:scale-106 hover:bg-accent/90 light:hover:bg-accent-light/90 animate-pulse-ring", children: HERO_COPY.button })] })] })] }));
}
//# sourceMappingURL=Home.js.map