import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle, Check } from 'lucide-react';
function getPasswordStrength(pw) {
    if (!pw)
        return { score: 0, label: '', cls: '' };
    let score = 0;
    if (pw.length >= 8)
        score++;
    if (/[A-Z]/.test(pw))
        score++;
    if (/[0-9]/.test(pw))
        score++;
    if (/[^A-Za-z0-9]/.test(pw))
        score++;
    if (score <= 1)
        return { score: 1, label: 'Weak', cls: 'weak' };
    if (score <= 2)
        return { score: 2, label: 'Fair', cls: 'fair' };
    return { score: 3, label: 'Strong', cls: 'strong' };
}
const BENEFITS = [
    { icon: '🏃', title: 'Weekly Group Runs', desc: 'Join sunrise sessions and evening track workouts across Nairobi.' },
    { icon: '🏅', title: 'Priority Event Access', desc: 'Early registration and member-only race slots.' },
    { icon: '👕', title: 'Member Merch Discounts', desc: '15% off all TRFC official gear in the shop.' },
    { icon: '📊', title: 'Training & Coaching', desc: 'Access personalised plans from certified coaches.' },
];
export default function Register() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [agreed, setAgreed] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const passwordValue = watch('password', '');
    const strength = getPasswordStrength(passwordValue);
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setErrorMessage('');
            const response = await registerUser(data);
            login(response.token, response.user, response.refreshToken);
            navigate('/');
        }
        catch (error) {
            console.error('Registration failed:', error);
            setErrorMessage(error.response?.data?.error || 'Registration failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-night flex font-barlow relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-grid pointer-events-none" }), _jsx("div", { className: "absolute top-0 left-0 w-96 h-96 bg-fire/10 rounded-full blur-3xl pointer-events-none", style: { transform: 'translate(-80px, -120px)' } }), _jsx("div", { className: "absolute bottom-0 right-0 w-80 h-80 bg-ember/8 rounded-full blur-3xl pointer-events-none", style: { transform: 'translate(0, 60px)' } }), _jsxs("div", { className: "w-full md:max-w-96 flex flex-col justify-center p-12 md:p-14 relative z-10", children: [_jsxs(Link, { to: "/", className: "font-bebas text-3xl text-chalk letter-spacing-widest mb-9 block text-decoration-none md:hidden", children: ["TR", _jsx("span", { className: "text-fire", children: "F" }), "C"] }), _jsx("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-fire before:inline-block before:flex-shrink-0", children: "Create Account" }), _jsxs("h1", { className: "font-bebas text-5xl text-chalk leading-tight mb-2.5 letter-spacing-tighter", children: ["JOIN", _jsx("br", {}), _jsx("span", { className: "text-transparent", style: { WebkitTextStroke: '2px #FF4500' }, children: "TRFC" })] }), _jsx("p", { className: "text-sm text-fog leading-loose mb-9", children: "Become part of Nairobi's most energetic running community \u2014 free to join, for life." }), _jsx("div", { className: "flex gap-2.5 flex-wrap mb-8", children: ['Free to Join', 'Nairobi Based', '500+ Members', 'Est. 2019'].map((p) => (_jsxs("span", { className: "flex items-center gap-1.5 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog bg-fire/10 border border-fire/15 px-2.5 py-1.25 clip-angled-sm", children: [_jsx(Check, { size: 10, className: "text-fire flex-shrink-0" }), " ", p] }, p))) }), errorMessage && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 border-l-4 border-l-red-500 px-4 py-3.5 mb-7 text-sm text-red-600 dark:text-red-400 animate-regFadeUp", role: "alert", children: [_jsx(AlertCircle, { size: 15, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4.5", children: [_jsxs("div", { children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.25 block", htmlFor: "reg-name", children: "Full Name" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200", children: _jsx(User, { size: 14 }) }), _jsx("input", { id: "reg-name", type: "text", className: "w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 clip-angled group-focus-within:bg-ash/90 group-focus-within:text-fire", placeholder: "Jane Mwangi", autoComplete: "name", ...register('name', { required: 'Name is required' }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fire to-ember scale-x-0 origin-left transition-transform duration-300" })] }), errors.name && (_jsxs("p", { className: "text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold letter-spacing-tighter flex items-center gap-1", children: [_jsx("span", { className: "inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black", children: "!" }), errors.name.message] }))] }), _jsxs("div", { children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.25 block", htmlFor: "reg-phone", children: "Phone" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200", children: _jsx(Phone, { size: 14 }) }), _jsx("input", { id: "reg-phone", type: "tel", className: "w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 clip-angled", placeholder: "0712 345 678", autoComplete: "tel", ...register('phone', { required: 'Phone is required' }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fire to-ember scale-x-0 origin-left transition-transform duration-300" })] }), errors.phone && (_jsxs("p", { className: "text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold letter-spacing-tighter flex items-center gap-1", children: [_jsx("span", { className: "inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black", children: "!" }), errors.phone.message] }))] })] }), _jsxs("div", { className: "mb-4.5", children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.25 block", htmlFor: "reg-email", children: "Email Address" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200", children: _jsx(Mail, { size: 14 }) }), _jsx("input", { id: "reg-email", type: "email", className: "w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 clip-angled", placeholder: "you@example.com", autoComplete: "email", ...register('email', {
                                                    required: 'Email is required',
                                                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                                                }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fire to-ember scale-x-0 origin-left transition-transform duration-300" })] }), errors.email && (_jsxs("p", { className: "text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold letter-spacing-tighter flex items-center gap-1", children: [_jsx("span", { className: "inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black", children: "!" }), errors.email.message] }))] }), _jsxs("div", { className: "mb-4.5", children: [_jsx("label", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.25 block", htmlFor: "reg-password", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200", children: _jsx(Lock, { size: 14 }) }), _jsx("input", { id: "reg-password", type: "password", className: "w-full bg-ash border border-white/10 text-chalk font-barlow text-base px-4 py-3 pl-11 outline-none transition-all duration-200 focus:border-fire/50 focus:bg-ash/90 clip-angled", placeholder: "Min. 8 characters", autoComplete: "new-password", ...register('password', {
                                                    required: 'Password is required',
                                                    minLength: { value: 8, message: 'At least 8 characters' },
                                                }) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-fire to-ember scale-x-0 origin-left transition-transform duration-300" })] }), errors.password && (_jsxs("p", { className: "text-xs text-red-500 mt-1.5 font-barlow-condensed font-bold letter-spacing-tighter flex items-center gap-1", children: [_jsx("span", { className: "inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-xs font-black", children: "!" }), errors.password.message] })), passwordValue && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "flex gap-1 mb-1", children: [1, 2, 3].map((i) => (_jsx("div", { className: `flex-1 h-0.75 rounded-full transition-all duration-300 ${strength.score >= i
                                                        ? strength.cls === 'weak' ? 'bg-red-500' : strength.cls === 'fair' ? 'bg-amber-500' : 'bg-green-500'
                                                        : 'bg-mist'}` }, i))) }), _jsxs("span", { className: `font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase ${strength.cls === 'weak' ? 'text-red-500' : strength.cls === 'fair' ? 'text-amber-500' : 'text-green-500'}`, children: [strength.label, " password"] })] }))] }), _jsxs("div", { className: "flex items-start gap-2.5 mb-6 cursor-pointer", onClick: () => setAgreed((v) => !v), children: [_jsx("div", { className: `w-4.5 h-4.5 bg-ash border border-white/10 flex-shrink-0 mt-0.25 flex items-center justify-center transition-all duration-200 clip-angled-sm ${agreed ? 'bg-fire border-fire' : ''}`, children: agreed && _jsx(Check, { size: 11, color: "white", strokeWidth: 3 }) }), _jsxs("p", { className: "text-xs text-fog leading-loose", children: ["I agree to the ", _jsx("a", { href: "#", onClick: (e) => e.stopPropagation(), className: "text-fire text-decoration-none hover:text-decoration-underline", children: "Terms of Service" }), " and", ' ', _jsx("a", { href: "#", onClick: (e) => e.stopPropagation(), className: "text-fire text-decoration-none hover:text-decoration-underline", children: "Privacy Policy" })] })] }), _jsx("button", { type: "submit", disabled: loading || !agreed, className: `w-full bg-fire border-0 text-white font-barlow-condensed font-black text-base letter-spacing-widest text-transform-uppercase px-8 py-4 cursor-pointer clip-angled transition-all duration-200 flex items-center justify-center gap-2.5 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:bg-ember hover:scale-105 ${loading ? 'loading' : ''}`, children: loading ? 'Creating account…' : _jsxs(_Fragment, { children: [_jsx("span", { children: "Create My Account" }), " ", _jsx(ArrowRight, { size: 16 })] }) })] }), _jsxs("div", { className: "flex items-center gap-3.5 my-6", children: [_jsx("div", { className: "flex-1 h-px bg-white/10" }), _jsx("span", { className: "font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-fog", children: "Have an account?" }), _jsx("div", { className: "flex-1 h-px bg-white/10" })] }), _jsx("p", { className: "text-center", children: _jsx(Link, { to: "/login", className: "font-barlow-condensed font-black text-base letter-spacing-widest text-transform-uppercase text-fire text-decoration-none border-b border-fire/30 pb-0.25 transition-all duration-200 hover:text-ember hover:border-ember", children: "Sign in instead \u2192" }) })] }), _jsxs("div", { className: "flex-1 hidden md:flex flex-col justify-between p-16 relative z-10", children: [_jsx("div", { children: _jsxs(Link, { to: "/", className: "text-decoration-none", children: [_jsxs("div", { className: "font-bebas text-7xl leading-tight text-chalk letter-spacing-tighter", children: ["TH", _jsx("em", { className: "not-italic text-transparent", style: { WebkitTextStroke: '2px #FF4500' }, children: "I" }), "KA", _jsx("br", {}), "ROAD", _jsx("br", {}), _jsx("em", { className: "not-italic text-transparent", style: { WebkitTextStroke: '2px #FF4500' }, children: "FC" })] }), _jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mt-4", children: "Nairobi \u00B7 Est. 2019" })] }) }), _jsx("div", { className: "flex flex-col gap-0.5", children: BENEFITS.map((b) => (_jsxs("div", { className: "flex items-center gap-3.5 py-4 border-b border-white/5 last:border-b-0", children: [_jsx("div", { className: "w-9 h-9 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire flex-shrink-0 clip-angled-sm", role: "img", "aria-label": b.title, children: _jsx("span", { className: "text-base", children: b.icon }) }), _jsxs("div", { children: [_jsx("strong", { className: "text-chalk block text-base", children: b.title }), b.desc] })] }, b.title))) }), _jsxs("blockquote", { className: "italic text-sm text-chalk/30 leading-loose border-l-2 border-fire pl-4", children: ["\"Joining TRFC changed how I train. The community keeps you accountable and the energy is unmatched.\"", _jsx("cite", { className: "not-italic block mt-1.5 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog", children: "\u2014 Amina K., Member since 2021" })] })] }), _jsx("style", { children: `
        @keyframes regFadeUp {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-regFadeUp {
          animation: regFadeUp 0.3s ease;
        }
        .bg-gradient-grid {
          background-image:
            linear-gradient(rgba(255,69,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,69,0,0.035) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
      ` })] }));
}
//# sourceMappingURL=Register.js.map