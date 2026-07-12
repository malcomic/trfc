import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Handshake } from 'lucide-react';
import { submitPartnership } from '../api/partnerships';
import { getSponsorshipTiers } from '../api/sponsorshipTiers';
import { getSponsorshipIcon } from '../utils/sponsorshipIcons';
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses';
const PARTNERSHIP_BENEFITS = [
    'Brand visibility across TRFC events and digital channels',
    'Product sampling at community runs, hikes, and fit festivals',
    'Social media exposure to an active, health-conscious audience',
    'Corporate wellness activations tailored to your team',
    'Community engagement opportunities with 20,000+ members',
];
const POLICIES = [
    'All sponsorships are subject to TRFC brand guidelines and approval.',
    'Logo usage is limited to agreed event materials and digital channels for the contract period.',
    'Payment is due within 14 days of agreement; events may be rescheduled with 30 days notice.',
    'Vendors must comply with Kenya event and safety regulations at all TRFC activations.',
];
export default function Partnerships() {
    const [tiers, setTiers] = useState([]);
    const [tiersLoading, setTiersLoading] = useState(true);
    const [form, setForm] = useState({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        tier: '',
        message: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        const fetchTiers = async () => {
            try {
                setTiersLoading(true);
                const data = await getSponsorshipTiers();
                const activeTiers = Array.isArray(data) ? data : [];
                setTiers(activeTiers);
                if (activeTiers.length > 0) {
                    setForm((prev) => ({ ...prev, tier: prev.tier || activeTiers[0].slug }));
                }
            }
            catch {
                setError('Failed to load sponsorship tiers. Please refresh the page.');
            }
            finally {
                setTiersLoading(false);
            }
        };
        fetchTiers();
    }, []);
    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.company_name.trim() || !form.contact_person.trim() || !form.email.trim() || !form.phone.trim()) {
            setError('Please fill in all required fields');
            return;
        }
        if (!form.tier) {
            setError('Please select a sponsorship tier');
            return;
        }
        try {
            setSubmitting(true);
            setError('');
            await submitPartnership(form);
            setSubmitted(true);
            setForm({
                company_name: '',
                contact_person: '',
                email: '',
                phone: '',
                tier: tiers[0]?.slug || '',
                message: '',
            });
        }
        catch {
            setError('Failed to submit inquiry. Please try again.');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: pageRoot, children: [_jsxs("section", { className: "bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11 relative overflow-hidden", children: [_jsx("div", { className: "absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-accent/5 light:text-accent-light/5 leading-none pointer-events-none select-none", children: "PARTNER" }), _jsxs("div", { className: "max-w-5xl mx-auto relative z-1", children: [_jsxs("div", { className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light", children: [_jsx(Handshake, { size: 14 }), " Sponsorships"] }), _jsxs("h1", { className: "font-bebas text-5xl leading-tight text-chalk light:text-chalk-light", children: ["PARTNER WITH", _jsx("br", {}), _jsx("span", { className: "text-accent light:text-accent-light", children: "TRFC" })] }), _jsx("p", { className: "text-fog light:text-fog-light mt-4 max-w-xl", children: "Partner with one of Kenya's fastest-growing fitness communities and connect your brand with an active, engaged, and health-conscious audience." })] })] }), _jsxs("div", { className: "max-w-5xl mx-auto px-[6%] py-10 pb-20 space-y-16", children: [_jsxs("section", { children: [_jsx("h2", { className: "font-bebas text-4xl text-chalk light:text-chalk-light mb-6", children: "PARTNERSHIP BENEFITS" }), _jsx("div", { className: `${cardSurface} p-6`, children: _jsx("ul", { className: "text-sm text-fog light:text-fog-light space-y-3", children: PARTNERSHIP_BENEFITS.map((b) => (_jsxs("li", { children: ["\u2022 ", b] }, b))) }) })] }), _jsxs("section", { children: [_jsx("h2", { className: "font-bebas text-4xl text-chalk light:text-chalk-light mb-6", children: "SPONSORSHIP TIERS" }), tiersLoading ? (_jsx("p", { className: "text-fog light:text-fog-light text-sm", children: "Loading tiers\u2026" })) : tiers.length === 0 ? (_jsx("p", { className: "text-fog light:text-fog-light text-sm", children: "Sponsorship tiers are being updated. Please check back soon." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: tiers.map(({ slug, icon, name, price_display, benefits }) => {
                                    const Icon = getSponsorshipIcon(icon);
                                    return (_jsxs("div", { className: `${cardSurface} p-6 flex flex-col ${form.tier === slug ? 'border-accent/40 light:border-accent-light/40' : ''}`, children: [_jsx("div", { className: "w-12 h-12 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light mb-4", children: _jsx(Icon, { size: 22 }) }), _jsx("h3", { className: "font-barlow-condensed font-bold text-xl mb-1", children: name }), _jsx("p", { className: "font-bebas text-2xl text-accent light:text-accent-light mb-4", children: price_display }), _jsx("ul", { className: "text-sm text-fog light:text-fog-light space-y-2 flex-1", children: benefits.map((b) => (_jsxs("li", { children: ["\u2022 ", b] }, b))) })] }, slug));
                                }) }))] }), _jsxs("section", { children: [_jsx("h2", { className: "font-bebas text-4xl text-chalk light:text-chalk-light mb-4", children: "POLICIES" }), _jsx("div", { className: `${cardSurface} p-6`, children: _jsx("ul", { className: "text-sm text-fog light:text-fog-light space-y-3", children: POLICIES.map((p) => (_jsxs("li", { children: ["\u2022 ", p] }, p))) }) })] }), _jsxs("section", { children: [_jsx("h2", { className: "font-bebas text-4xl text-chalk light:text-chalk-light mb-6", children: "VENDOR ONBOARDING" }), _jsx("div", { className: `${cardSurface} p-8 max-w-2xl`, children: submitted ? (_jsxs("div", { className: "flex gap-3 text-green-400 text-sm", children: [_jsx(CheckCircle, { size: 20, className: "flex-shrink-0" }), _jsx("p", { children: "Thank you! Your partnership inquiry has been received. Our team will contact you shortly." })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-fog light:text-fog-light block mb-1.5", children: "Company Name *" }), _jsx("input", { name: "company_name", value: form.company_name, onChange: handleChange, className: `w-full px-3 py-2 text-sm ${inputField}`, placeholder: "Your company" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-fog light:text-fog-light block mb-1.5", children: "Contact Person *" }), _jsx("input", { name: "contact_person", value: form.contact_person, onChange: handleChange, className: `w-full px-3 py-2 text-sm ${inputField}`, placeholder: "Full name" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-fog light:text-fog-light block mb-1.5", children: "Email *" }), _jsx("input", { name: "email", type: "email", value: form.email, onChange: handleChange, className: `w-full px-3 py-2 text-sm ${inputField}`, placeholder: "you@company.com" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-fog light:text-fog-light block mb-1.5", children: "Phone *" }), _jsx("input", { name: "phone", type: "tel", value: form.phone, onChange: handleChange, className: `w-full px-3 py-2 text-sm ${inputField}`, placeholder: "0712 345 678" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-fog light:text-fog-light block mb-1.5", children: "Sponsorship Tier *" }), _jsx("select", { name: "tier", value: form.tier, onChange: handleChange, disabled: tiers.length === 0, className: `w-full px-3 py-2 text-sm ${inputField}`, children: tiers.map((t) => (_jsxs("option", { value: t.slug, children: [t.name, " \u2014 ", t.price_display] }, t.slug))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-fog light:text-fog-light block mb-1.5", children: "Message" }), _jsx("textarea", { name: "message", value: form.message, onChange: handleChange, rows: 4, className: `w-full px-3 py-2 text-sm resize-none ${inputField}`, placeholder: "Tell us about your brand and goals\u2026" })] }), error && (_jsxs("div", { className: "flex gap-2 text-red-400 text-sm", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0" }), " ", error] })), _jsx("button", { type: "submit", disabled: submitting || tiers.length === 0, className: "w-full bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-50", children: submitting ? 'Submitting…' : 'Submit Inquiry' })] })) })] })] })] }));
}
//# sourceMappingURL=Partnerships.js.map