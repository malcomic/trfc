import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
const loginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,600;1,400&family=Barlow+Condensed:wght@500;700;900&display=swap');

  .trfc-login {
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
    display: flex;
    font-family: 'Barlow', sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* ── Animated background grid ── */
  .trfc-login__bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,69,0,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,69,0,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
    pointer-events: none;
  }

  /* ── Glow orbs ── */
  .trfc-login__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
  }
  .trfc-login__orb--1 {
    width: 500px; height: 500px;
    background: rgba(255,69,0,0.12);
    top: -150px; right: -100px;
  }
  .trfc-login__orb--2 {
    width: 300px; height: 300px;
    background: rgba(255,122,26,0.07);
    bottom: -80px; left: -60px;
  }

  /* ── Left panel (branding) ── */
  .trfc-login__left {
    flex: 1;
    display: none;
    flex-direction: column;
    justify-content: space-between;
    padding: 56px 64px;
    position: relative;
    z-index: 1;
    border-right: 1px solid rgba(255,255,255,0.04);
  }
  @media (min-width: 960px) { .trfc-login__left { display: flex; } }

  .trfc-login__big-word {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(80px, 9vw, 140px);
    line-height: 0.9;
    color: var(--chalk);
    letter-spacing: -1px;
  }
  .trfc-login__big-word em {
    font-style: normal;
    color: transparent;
    -webkit-text-stroke: 2px var(--fire);
  }

  .trfc-login__left-tagline {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 500;
    font-size: 14px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
    margin-top: 20px;
  }

  .trfc-login__left-stats {
    display: flex;
    gap: 40px;
  }
  .trfc-login__left-stat-val {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 44px;
    color: var(--fire);
    line-height: 1;
  }
  .trfc-login__left-stat-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
    margin-top: 4px;
  }

  .trfc-login__left-quote {
    font-style: italic;
    font-size: 15px;
    color: rgba(245,242,238,0.35);
    line-height: 1.7;
    border-left: 2px solid var(--fire);
    padding-left: 18px;
    max-width: 340px;
  }

  /* ── Right panel (form) ── */
  .trfc-login__right {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 40px;
    position: relative;
    z-index: 1;
  }
  @media (min-width: 960px) { .trfc-login__right { padding: 64px 56px; } }

  /* Mobile logo */
  .trfc-login__mobile-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    color: var(--chalk);
    letter-spacing: 3px;
    margin-bottom: 40px;
    display: block;
  }
  .trfc-login__mobile-logo span { color: var(--fire); }
  @media (min-width: 960px) { .trfc-login__mobile-logo { display: none; } }

  /* Section label */
  .trfc-login__eyebrow {
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
  .trfc-login__eyebrow::before {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: var(--fire);
  }

  .trfc-login__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(48px, 6vw, 72px);
    color: var(--chalk);
    line-height: 0.95;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
  }
  .trfc-login__subtitle {
    font-size: 15px;
    color: var(--fog);
    margin-bottom: 40px;
    line-height: 1.6;
  }

  /* Error alert */
  .trfc-login__error {
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
    animation: fadeUp 0.3s ease;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Form field */
  .trfc-login__field {
    margin-bottom: 20px;
  }
  .trfc-login__label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(245,242,238,0.45);
    margin-bottom: 10px;
    display: block;
  }
  .trfc-login__input-wrap {
    position: relative;
  }
  .trfc-login__input-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--fog);
    pointer-events: none;
    transition: color 0.2s;
  }
  .trfc-login__input {
    width: 100%;
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.07);
    color: var(--chalk);
    font-family: 'Barlow', sans-serif;
    font-size: 15px;
    padding: 14px 16px 14px 46px;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
    -webkit-appearance: none;
  }
  .trfc-login__input::placeholder { color: var(--fog); }
  .trfc-login__input:focus {
    border-color: rgba(255,69,0,0.5);
    background: rgba(28,28,28,0.8);
  }
  .trfc-login__input:focus + .trfc-login__input-focus-line {
    transform: scaleX(1);
  }
  .trfc-login__input-wrap:focus-within .trfc-login__input-icon {
    color: var(--fire);
  }
  .trfc-login__input-focus-line {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--fire), var(--ember));
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  .trfc-login__field-error {
    font-size: 12px;
    color: var(--danger);
    margin-top: 6px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .trfc-login__field-error::before {
    content: '!';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--danger);
    color: white;
    font-size: 9px;
    font-weight: 900;
  }

  /* Forgot password */
  .trfc-login__forgot {
    display: flex;
    justify-content: flex-end;
    margin-top: -8px;
    margin-bottom: 8px;
  }
  .trfc-login__forgot a {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    text-decoration: none;
    transition: color 0.2s;
  }
  .trfc-login__forgot a:hover { color: var(--fire); }

  /* Submit button */
  .trfc-login__submit {
    width: 100%;
    margin-top: 28px;
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
  .trfc-login__submit:hover:not(:disabled) { background: var(--ember); transform: scale(1.02); }
  .trfc-login__submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  /* Loading shimmer on button */
  .trfc-login__submit.loading::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
    animation: shimmer 1.2s ease infinite;
  }
  @keyframes shimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }

  /* Divider */
  .trfc-login__divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 28px 0;
  }
  .trfc-login__divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.06);
  }
  .trfc-login__divider-text {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
  }

  /* Register CTA */
  .trfc-login__register-cta {
    text-align: center;
    font-size: 14px;
    color: var(--fog);
  }
  .trfc-login__register-link {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fire);
    text-decoration: none;
    border-bottom: 1px solid rgba(255,69,0,0.3);
    padding-bottom: 1px;
    transition: border-color 0.2s, color 0.2s;
  }
  .trfc-login__register-link:hover { color: var(--ember); border-color: var(--ember); }
`;
export default function Login() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
    const styleRef = useRef(null);
    useEffect(() => {
        if (document.getElementById('trfc-login-styles'))
            return;
        const el = document.createElement('style');
        el.id = 'trfc-login-styles';
        el.textContent = loginStyles;
        document.head.appendChild(el);
        styleRef.current = el;
        return () => {
            const existing = document.getElementById('trfc-login-styles');
            if (existing)
                document.head.removeChild(existing);
        };
    }, []);
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setErrorMessage('');
            const response = await loginUser(data);
            login(response.token, response.user, response.refreshToken);
            navigate('/');
        }
        catch (error) {
            console.error('Login failed:', error);
            setErrorMessage(error.response?.data?.error || 'Login failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "trfc-login", children: [_jsx("div", { className: "trfc-login__bg-grid" }), _jsx("div", { className: "trfc-login__orb trfc-login__orb--1" }), _jsx("div", { className: "trfc-login__orb trfc-login__orb--2" }), _jsxs("div", { className: "trfc-login__left", children: [_jsxs(Link, { to: "/", style: { textDecoration: 'none' }, children: [_jsxs("div", { className: "trfc-login__big-word", children: ["TH", _jsx("em", { children: "I" }), "KA", _jsx("br", {}), "ROAD", _jsx("br", {}), _jsx("em", { children: "FC" })] }), _jsx("p", { className: "trfc-login__left-tagline", children: "Nairobi \u00B7 Est. 2019" })] }), _jsx("div", { className: "trfc-login__left-stats", children: [
                            { val: '500+', label: 'Members' },
                            { val: '50+', label: 'Events' },
                            { val: '5 Yrs', label: 'Running' },
                        ].map((s) => (_jsxs("div", { children: [_jsx("div", { className: "trfc-login__left-stat-val", children: s.val }), _jsx("div", { className: "trfc-login__left-stat-label", children: s.label })] }, s.label))) }), _jsx("p", { className: "trfc-login__left-quote", children: "\"Every kilometre is a conversation between who you were and who you're becoming.\"" })] }), _jsxs("div", { className: "trfc-login__right", children: [_jsxs(Link, { to: "/", className: "trfc-login__mobile-logo", children: ["TR", _jsx("span", { children: "F" }), "C"] }), _jsx("div", { className: "trfc-login__eyebrow", children: "Member Access" }), _jsxs("h1", { className: "trfc-login__title", children: ["WELCOME", _jsx("br", {}), "BACK"] }), _jsx("p", { className: "trfc-login__subtitle", children: "Sign in to access events, track your progress, and connect with the community." }), errorMessage && (_jsxs("div", { className: "trfc-login__error", role: "alert", children: [_jsx(AlertCircle, { size: 16, style: { flexShrink: 0, marginTop: 1 } }), _jsx("span", { children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, children: [_jsxs("div", { className: "trfc-login__field", children: [_jsx("label", { className: "trfc-login__label", htmlFor: "login-email", children: "Email Address" }), _jsxs("div", { className: "trfc-login__input-wrap", children: [_jsx("span", { className: "trfc-login__input-icon", children: _jsx(Mail, { size: 15 }) }), _jsx("input", { id: "login-email", type: "email", className: "trfc-login__input", placeholder: "you@example.com", autoComplete: "email", ...register('email', { required: 'Email is required' }) }), _jsx("div", { className: "trfc-login__input-focus-line" })] }), errors.email && (_jsx("p", { className: "trfc-login__field-error", children: errors.email.message }))] }), _jsxs("div", { className: "trfc-login__field", children: [_jsx("label", { className: "trfc-login__label", htmlFor: "login-password", children: "Password" }), _jsxs("div", { className: "trfc-login__input-wrap", children: [_jsx("span", { className: "trfc-login__input-icon", children: _jsx(Lock, { size: 15 }) }), _jsx("input", { id: "login-password", type: "password", className: "trfc-login__input", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: "current-password", ...register('password', { required: 'Password is required' }) }), _jsx("div", { className: "trfc-login__input-focus-line" })] }), errors.password && (_jsx("p", { className: "trfc-login__field-error", children: errors.password.message }))] }), _jsx("div", { className: "trfc-login__forgot", children: _jsx("a", { href: "#", children: "Forgot password?" }) }), _jsx("button", { type: "submit", disabled: loading, className: `trfc-login__submit${loading ? ' loading' : ''}`, children: loading ? (_jsx(_Fragment, { children: "Signing in..." })) : (_jsxs(_Fragment, { children: ["Sign In ", _jsx(ArrowRight, { size: 16 })] })) })] }), _jsxs("div", { className: "trfc-login__divider", children: [_jsx("div", { className: "trfc-login__divider-line" }), _jsx("span", { className: "trfc-login__divider-text", children: "New to TRFC?" }), _jsx("div", { className: "trfc-login__divider-line" })] }), _jsx("p", { className: "trfc-login__register-cta", children: _jsx(Link, { to: "/register", className: "trfc-login__register-link", children: "Create a free account \u2192" }) })] })] }));
}
//# sourceMappingURL=Login.js.map