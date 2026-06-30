import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getTestimonials, submitTestimonial } from '../api/testimonials';
import { AlertCircle, Loader, Star, CheckCircle } from 'lucide-react';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
export default function Testimonials() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(5);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState('');
    useEffect(() => {
        getTestimonials()
            .then(setList)
            .catch(() => setError('Failed to load testimonials'))
            .finally(() => setLoading(false));
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !message.trim()) {
            setSubmitError('Name and message are required');
            return;
        }
        try {
            setSubmitting(true);
            setSubmitError('');
            await submitTestimonial({ member_name: name.trim(), message: message.trim(), rating });
            setSubmitted(true);
            setName('');
            setMessage('');
            setRating(5);
        }
        catch {
            setSubmitError('Failed to submit. Please try again.');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: pageRoot, children: [_jsx("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsxs("h1", { className: "font-bebas text-5xl text-chalk light:text-chalk-light", children: ["COMMUNITY ", _jsx("span", { className: "text-accent light:text-accent-light", children: "VOICES" })] }), _jsx("p", { className: "text-fog light:text-fog-light mt-2", children: "Stories from TRFC members" })] }) }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-10", children: [_jsxs("div", { className: "lg:col-span-2", children: [loading && _jsx(Loader, { className: "animate-spin text-accent light:text-accent-light mx-auto" }), error && (_jsxs("div", { className: "bg-red-500/10 border border-red-500/20 p-4 flex gap-2 text-red-300 text-sm", children: [_jsx(AlertCircle, { size: 16 }), " ", error] })), !loading && !error && list.length === 0 && (_jsx("p", { className: "text-fog light:text-fog-light", children: "No testimonials yet \u2014 be the first to share yours." })), _jsx("div", { className: "space-y-4", children: list.map((t) => (_jsxs("div", { className: `${cardSurface} p-6`, children: [_jsx("div", { className: "flex gap-1 mb-3", children: Array.from({ length: 5 }).map((_, i) => (_jsx(Star, { size: 14, className: i < t.rating ? 'text-accent light:text-accent-light fill-accent light:fill-accent-light' : 'text-fog light:text-fog-light' }, i))) }), _jsxs("p", { className: "text-chalk/90 light:text-chalk-light/90 leading-relaxed mb-4", children: ["\u201C", t.message, "\u201D"] }), _jsx("p", { className: "font-barlow-condensed font-bold text-accent light:text-accent-light text-sm", children: t.member_name })] }, t.id))) })] }), _jsxs("div", { className: `${cardSurface} p-6 h-fit sticky top-20`, children: [_jsx("h2", { className: "font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4", children: "Share Your Story" }), submitted ? (_jsxs("div", { className: "flex gap-3 text-green-400 text-sm", children: [_jsx(CheckCircle, { size: 18, className: "flex-shrink-0" }), _jsx("p", { children: "Thank you! Your testimonial will appear after admin approval." })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "Your name", className: `w-full px-3 py-2 text-sm ${inputField}` }), _jsx("textarea", { value: message, onChange: (e) => setMessage(e.target.value), placeholder: "Your experience with TRFC\u2026", rows: 4, className: `w-full px-3 py-2 text-sm resize-none ${inputField}` }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-fog light:text-fog-light block mb-2", children: "Rating" }), _jsx("div", { className: "flex gap-1", children: [1, 2, 3, 4, 5].map((n) => (_jsx("button", { type: "button", onClick: () => setRating(n), className: "bg-transparent border-0 cursor-pointer p-0", children: _jsx(Star, { size: 20, className: n <= rating ? 'text-accent light:text-accent-light fill-accent light:fill-accent-light' : 'text-fog light:text-fog-light' }) }, n))) })] }), submitError && _jsx("p", { className: "text-red-400 text-xs", children: submitError }), _jsx("button", { type: "submit", disabled: submitting, className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-2.5 clip-angled font-barlow-condensed font-black text-xs tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-50", children: submitting ? 'Submitting…' : 'Submit' })] }))] })] })] }));
}
//# sourceMappingURL=Testimonials.js.map