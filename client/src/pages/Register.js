import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, ArrowRight, AlertCircle, Check } from 'lucide-react';
const registerStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,600;1,400&family=Barlow+Condensed:wght@500;700;900&display=swap');

  .trfc-reg {
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
    --success: #30D158;
    min-height: 100vh;
    background: var(--night);
    display: flex;
    font-family: 'Barlow', sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* ── Background grid ── */
  .trfc-reg__bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,69,0,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,69,0,0.035) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
    pointer-events: none;
  }

  /* ── Glow orbs ── */
  .trfc-reg__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(110px);
    pointer-events: none;
  }
  .trfc-reg__orb--1 {
    width: 440px; height: 440px;
    background: rgba(255,69,0,0.1);
    top: -120px; left: -80px;
  }
  .trfc-reg__orb--2 {
    width: 320px; height: 320px;
    background: rgba(255,122,26,0.07);
    bottom: -60px; right: -60px;
  }

  /* ── Left form panel ── */
  .trfc-reg__left {
    width: 100%;
    max-width: 540px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 40px;
    position: relative;
    z-index: 1;
    border-right: 1px solid rgba(255,255,255,0.04);
  }
  @media (min-width: 960px) { .trfc-reg__left { padding: 64px 56px; } }

  /* Mobile logo */
  .trfc-reg__mobile-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    color: var(--chalk);
    letter-spacing: 3px;
    margin-bottom: 36px;
    display: block;
    text-decoration: none;
  }
  .trfc-reg__mobile-logo span { color: var(--fire); }
  @media (min-width: 960px) { .trfc-reg__mobile-logo { display: none; } }

  .trfc-reg__eyebrow {
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
  .trfc-reg__eyebrow::before {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: var(--fire);
  }

  .trfc-reg__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(52px, 7vw, 80px);
    color: var(--chalk);
    line-height: 0.92;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
  }
  .trfc-reg__title span {
    color: transparent;
    -webkit-text-stroke: 2px var(--fire);
  }
  .trfc-reg__subtitle {
    font-size: 15px;
    color: var(--fog);
    margin-bottom: 36px;
    line-height: 1.6;
    max-width: 380px;
  }

  /* ── Perks strip ── */
  .trfc-reg__perks {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 32px;
  }
  .trfc-reg__perk {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--fog);
    background: rgba(255,69,0,0.07);
    border: 1px solid rgba(255,69,0,0.15);
    padding: 5px 10px;
    clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px));
  }
  .trfc-reg__perk svg { color: var(--fire); flex-shrink: 0; }

  /* ── Error alert ── */
  .trfc-reg__error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(255,59,48,0.08);
    border: 1px solid rgba(255,59,48,0.25);
    border-left: 3px solid var(--danger);
    padding: 14px 16px;
    margin-bottom: 28px;
    font-size: 14px;
    color: #FF6B65;
    animation: regFadeUp 0.3s ease;
  }
  @keyframes regFadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Two-column field row ── */
  .trfc-reg__field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 480px) { .trfc-reg__field-row { grid-template-columns: 1fr; } }

  /* ── Field ── */
  .trfc-reg__field { margin-bottom: 18px; }
  .trfc-reg__field--full { grid-column: 1 / -1; }

  .trfc-reg__label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(245,242,238,0.4);
    margin-bottom: 9px;
    display: block;
  }
  .trfc-reg__input-wrap { position: relative; }
  .trfc-reg__input-icon {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--fog);
    pointer-events: none;
    transition: color 0.2s;
  }
  .trfc-reg__input-wrap:focus-within .trfc-reg__input-icon { color: var(--fire); }

  .trfc-reg__input {
    width: 100%;
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.07);
    color: var(--chalk);
    font-family: 'Barlow', sans-serif;
    font-size: 14px;
    padding: 13px 14px 13px 44px;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px));
    -webkit-appearance: none;
    display: block;
  }
  .trfc-reg__input::placeholder { color: var(--fog); }
  .trfc-reg__input:focus {
    border-color: rgba(255,69,0,0.45);
    background: rgba(28,28,28,0.9);
  }
  .trfc-reg__input-wrap:focus-within .trfc-reg__focus-line {
    transform: scaleX(1);
  }
  .trfc-reg__focus-line {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--fire), var(--ember));
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
  }

  .trfc-reg__field-error {
    font-size: 11px;
    color: var(--danger);
    margin-top: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .trfc-reg__field-error::before {
    content: '!';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px; height: 13px;
    border-radius: 50%;
    background: var(--danger);
    color: white;
    font-size: 9px;
    font-weight: 900;
    flex-shrink: 0;
  }

  /* ── Password strength ── */
  .trfc-reg__strength { margin-top: 8px; }
  .trfc-reg__strength-bars {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
  }
  .trfc-reg__strength-bar {
    flex: 1;
    height: 3px;
    background: var(--mist);
    transition: background 0.3s;
  }
  .trfc-reg__strength-bar.lit-weak   { background: var(--danger); }
  .trfc-reg__strength-bar.lit-fair   { background: var(--ember); }
  .trfc-reg__strength-bar.lit-strong { background: var(--success); }
  .trfc-reg__strength-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .trfc-reg__strength-label.weak   { color: var(--danger); }
  .trfc-reg__strength-label.fair   { color: var(--ember); }
  .trfc-reg__strength-label.strong { color: var(--success); }

  /* ── Terms ── */
  .trfc-reg__terms {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 24px;
    cursor: pointer;
  }
  .trfc-reg__checkbox {
    width: 18px; height: 18px;
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
    transition: background 0.2s, border-color 0.2s;
    cursor: pointer;
  }
  .trfc-reg__checkbox.checked { background: var(--fire); border-color: var(--fire); }
  .trfc-reg__terms-text {
    font-size: 12px;
    color: var(--fog);
    line-height: 1.6;
  }
  .trfc-reg__terms-text a { color: var(--fire); text-decoration: none; }
  .trfc-reg__terms-text a:hover { text-decoration: underline; }

  /* ── Submit ── */
  .trfc-reg__submit {
    width: 100%;
    background: var(--fire);
    border: none;
    color: white;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 15px;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 16px 32px;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
    transition: background 0.2s, transform 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }
  .trfc-reg__submit:hover:not(:disabled) { background: var(--ember); transform: scale(1.02); }
  .trfc-reg__submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .trfc-reg__submit.loading::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 50%, transparent);
    animation: regShimmer 1.2s ease infinite;
  }
  @keyframes regShimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }

  /* ── Divider & login link ── */
  .trfc-reg__divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 24px 0;
  }
  .trfc-reg__divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
  .trfc-reg__divider-text {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
  }
  .trfc-reg__login-cta {
    text-align: center;
    font-size: 14px;
    color: var(--fog);
  }
  .trfc-reg__login-link {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fire);
    text-decoration: none;
    border-bottom: 1px solid rgba(255,69,0,0.3);
    padding-bottom: 1px;
    transition: color 0.2s, border-color 0.2s;
  }
  .trfc-reg__login-link:hover { color: var(--ember); border-color: var(--ember); }

  /* ── Right branding panel ── */
  .trfc-reg__right {
    flex: 1;
    display: none;
    flex-direction: column;
    justify-content: space-between;
    padding: 64px 64px 64px 56px;
    position: relative;
    z-index: 1;
  }
  @media (min-width: 960px) { .trfc-reg__right { display: flex; } }

  .trfc-reg__brand-word {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(80px, 9vw, 148px);
    line-height: 0.88;
    color: var(--chalk);
    letter-spacing: -1px;
  }
  .trfc-reg__brand-word em {
    font-style: normal;
    color: transparent;
    -webkit-text-stroke: 2px var(--fire);
  }
  .trfc-reg__brand-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fog);
    margin-top: 16px;
  }

  .trfc-reg__benefits {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .trfc-reg__benefit {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .trfc-reg__benefit:last-child { border-bottom: none; }
  .trfc-reg__benefit-icon {
    width: 36px;
    height: 36px;
    background: rgba(255,69,0,0.1);
    border: 1px solid rgba(255,69,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fire);
    flex-shrink: 0;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  }
  .trfc-reg__benefit-text { font-size: 14px; color: rgba(245,242,238,0.6); line-height: 1.5; }
  .trfc-reg__benefit-text strong { color: var(--chalk); display: block; font-size: 15px; }

  .trfc-reg__member-quote {
    font-style: italic;
    font-size: 14px;
    color: rgba(245,242,238,0.3);
    line-height: 1.7;
    border-left: 2px solid var(--fire);
    padding-left: 16px;
    max-width: 340px;
  }
  .trfc-reg__member-quote cite {
    font-style: normal;
    display: block;
    margin-top: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
  }
`;
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
    const styleRef = useRef(null);
    const passwordValue = watch('password', '');
    const strength = getPasswordStrength(passwordValue);
    useEffect(() => {
        if (document.getElementById('trfc-reg-styles'))
            return;
        const el = document.createElement('style');
        el.id = 'trfc-reg-styles';
        el.textContent = registerStyles;
        document.head.appendChild(el);
        styleRef.current = el;
        return () => {
            const existing = document.getElementById('trfc-reg-styles');
            if (existing)
                document.head.removeChild(existing);
        };
    }, []);
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
    return (_jsxs("div", { className: "trfc-reg", children: [_jsx("div", { className: "trfc-reg__bg-grid" }), _jsx("div", { className: "trfc-reg__orb trfc-reg__orb--1" }), _jsx("div", { className: "trfc-reg__orb trfc-reg__orb--2" }), _jsxs("div", { className: "trfc-reg__left", children: [_jsxs(Link, { to: "/", className: "trfc-reg__mobile-logo", children: ["TR", _jsx("span", { children: "F" }), "C"] }), _jsx("div", { className: "trfc-reg__eyebrow", children: "Create Account" }), _jsxs("h1", { className: "trfc-reg__title", children: ["JOIN", _jsx("br", {}), _jsx("span", { children: "TRFC" })] }), _jsx("p", { className: "trfc-reg__subtitle", children: "Become part of Nairobi's most energetic running community \u2014 free to join, for life." }), _jsx("div", { className: "trfc-reg__perks", children: ['Free to Join', 'Nairobi Based', '500+ Members', 'Est. 2019'].map((p) => (_jsxs("span", { className: "trfc-reg__perk", children: [_jsx(Check, { size: 10 }), " ", p] }, p))) }), errorMessage && (_jsxs("div", { className: "trfc-reg__error", role: "alert", children: [_jsx(AlertCircle, { size: 15, style: { flexShrink: 0, marginTop: 1 } }), _jsx("span", { children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, children: [_jsxs("div", { className: "trfc-reg__field-row", children: [_jsxs("div", { className: "trfc-reg__field", children: [_jsx("label", { className: "trfc-reg__label", htmlFor: "reg-name", children: "Full Name" }), _jsxs("div", { className: "trfc-reg__input-wrap", children: [_jsx("span", { className: "trfc-reg__input-icon", children: _jsx(User, { size: 14 }) }), _jsx("input", { id: "reg-name", type: "text", className: "trfc-reg__input", placeholder: "Jane Mwangi", autoComplete: "name", ...register('name', { required: 'Name is required' }) }), _jsx("div", { className: "trfc-reg__focus-line" })] }), errors.name && (_jsx("p", { className: "trfc-reg__field-error", children: errors.name.message }))] }), _jsxs("div", { className: "trfc-reg__field", children: [_jsx("label", { className: "trfc-reg__label", htmlFor: "reg-phone", children: "Phone" }), _jsxs("div", { className: "trfc-reg__input-wrap", children: [_jsx("span", { className: "trfc-reg__input-icon", children: _jsx(Phone, { size: 14 }) }), _jsx("input", { id: "reg-phone", type: "tel", className: "trfc-reg__input", placeholder: "0712 345 678", autoComplete: "tel", ...register('phone', { required: 'Phone is required' }) }), _jsx("div", { className: "trfc-reg__focus-line" })] }), errors.phone && (_jsx("p", { className: "trfc-reg__field-error", children: errors.phone.message }))] })] }), _jsxs("div", { className: "trfc-reg__field", children: [_jsx("label", { className: "trfc-reg__label", htmlFor: "reg-email", children: "Email Address" }), _jsxs("div", { className: "trfc-reg__input-wrap", children: [_jsx("span", { className: "trfc-reg__input-icon", children: _jsx(Mail, { size: 14 }) }), _jsx("input", { id: "reg-email", type: "email", className: "trfc-reg__input", placeholder: "you@example.com", autoComplete: "email", ...register('email', {
                                                    required: 'Email is required',
                                                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                                                }) }), _jsx("div", { className: "trfc-reg__focus-line" })] }), errors.email && (_jsx("p", { className: "trfc-reg__field-error", children: errors.email.message }))] }), _jsxs("div", { className: "trfc-reg__field", children: [_jsx("label", { className: "trfc-reg__label", htmlFor: "reg-password", children: "Password" }), _jsxs("div", { className: "trfc-reg__input-wrap", children: [_jsx("span", { className: "trfc-reg__input-icon", children: _jsx(Lock, { size: 14 }) }), _jsx("input", { id: "reg-password", type: "password", className: "trfc-reg__input", placeholder: "Min. 8 characters", autoComplete: "new-password", ...register('password', {
                                                    required: 'Password is required',
                                                    minLength: { value: 8, message: 'At least 8 characters' },
                                                }) }), _jsx("div", { className: "trfc-reg__focus-line" })] }), errors.password && (_jsx("p", { className: "trfc-reg__field-error", children: errors.password.message })), passwordValue && (_jsxs("div", { className: "trfc-reg__strength", children: [_jsx("div", { className: "trfc-reg__strength-bars", children: [1, 2, 3].map((i) => (_jsx("div", { className: `trfc-reg__strength-bar${strength.score >= i
                                                        ? ` lit-${strength.cls === 'weak' ? 'weak' : strength.cls === 'fair' ? 'fair' : 'strong'}`
                                                        : ''}` }, i))) }), _jsxs("span", { className: `trfc-reg__strength-label ${strength.cls}`, children: [strength.label, " password"] })] }))] }), _jsxs("div", { className: "trfc-reg__terms", onClick: () => setAgreed((v) => !v), children: [_jsx("div", { className: `trfc-reg__checkbox${agreed ? ' checked' : ''}`, children: agreed && _jsx(Check, { size: 11, color: "white", strokeWidth: 3 }) }), _jsxs("p", { className: "trfc-reg__terms-text", children: ["I agree to the ", _jsx("a", { href: "#", onClick: (e) => e.stopPropagation(), children: "Terms of Service" }), " and", ' ', _jsx("a", { href: "#", onClick: (e) => e.stopPropagation(), children: "Privacy Policy" })] })] }), _jsx("button", { type: "submit", disabled: loading || !agreed, className: `trfc-reg__submit${loading ? ' loading' : ''}`, children: loading ? 'Creating account…' : _jsxs(_Fragment, { children: [_jsx("span", { children: "Create My Account" }), " ", _jsx(ArrowRight, { size: 16 })] }) })] }), _jsxs("div", { className: "trfc-reg__divider", children: [_jsx("div", { className: "trfc-reg__divider-line" }), _jsx("span", { className: "trfc-reg__divider-text", children: "Have an account?" }), _jsx("div", { className: "trfc-reg__divider-line" })] }), _jsx("p", { className: "trfc-reg__login-cta", children: _jsx(Link, { to: "/login", className: "trfc-reg__login-link", children: "Sign in instead \u2192" }) })] }), _jsxs("div", { className: "trfc-reg__right", children: [_jsx("div", { children: _jsxs(Link, { to: "/", style: { textDecoration: 'none' }, children: [_jsxs("div", { className: "trfc-reg__brand-word", children: ["TH", _jsx("em", { children: "I" }), "KA", _jsx("br", {}), "ROAD", _jsx("br", {}), _jsx("em", { children: "FC" })] }), _jsx("p", { className: "trfc-reg__brand-sub", children: "Nairobi \u00B7 Est. 2019" })] }) }), _jsx("div", { className: "trfc-reg__benefits", children: BENEFITS.map((b) => (_jsxs("div", { className: "trfc-reg__benefit", children: [_jsx("div", { className: "trfc-reg__benefit-icon", role: "img", "aria-label": b.title, children: _jsx("span", { style: { fontSize: '16px' }, children: b.icon }) }), _jsxs("div", { className: "trfc-reg__benefit-text", children: [_jsx("strong", { children: b.title }), b.desc] })] }, b.title))) }), _jsxs("blockquote", { className: "trfc-reg__member-quote", children: ["\"Joining TRFC changed how I train. The community keeps you accountable and the energy is unmatched.\"", _jsx("cite", { children: "\u2014 Amina K., Member since 2021" })] })] })] }));
}
//# sourceMappingURL=Register.js.map