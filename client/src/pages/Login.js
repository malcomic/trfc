import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { Button, FormInput } from '../components/ui';
export default function Login() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
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
    return (_jsxs("div", { className: "min-h-screen bg-night flex font-barlow relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-lines pointer-events-none" }), _jsx("div", { className: "absolute top-0 right-0 w-96 h-96 bg-fire/15 rounded-full blur-3xl pointer-events-none", style: { transform: 'translate(100px, -150px)' } }), _jsx("div", { className: "absolute bottom-0 left-0 w-72 h-72 bg-ember/10 rounded-full blur-3xl pointer-events-none", style: { transform: 'translate(-60px, 80px)' } }), _jsxs("div", { className: "flex-1 hidden md:flex flex-col justify-between p-16 relative z-10 border-r border-white/5", children: [_jsxs(Link, { to: "/", className: "text-decoration-none", children: [_jsxs("div", { className: "font-bebas text-7xl leading-tight text-chalk letter-spacing-tighter", children: ["TH", _jsx("em", { className: "not-italic text-transparent", style: { WebkitTextStroke: '2px #FF4500' }, children: "I" }), "KA", _jsx("br", {}), "ROAD", _jsx("br", {}), _jsx("em", { className: "not-italic text-transparent", style: { WebkitTextStroke: '2px #FF4500' }, children: "FC" })] }), _jsx("p", { className: "font-barlow-condensed font-medium text-sm letter-spacing-widest text-transform-uppercase text-fog mt-5", children: "Nairobi \u00B7 Est. 2019" })] }), _jsx("div", { className: "flex gap-10", children: [
                            { val: '500+', label: 'Members' },
                            { val: '50+', label: 'Events' },
                            { val: '5 Yrs', label: 'Running' },
                        ].map((s) => (_jsxs("div", { children: [_jsx("div", { className: "font-bebas text-5xl text-fire leading-none", children: s.val }), _jsx("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mt-1", children: s.label })] }, s.label))) }), _jsx("p", { className: "italic text-sm text-chalk/35 leading-loose border-l-2 border-fire pl-4.5 max-w-64", children: "\"Every kilometre is a conversation between who you were and who you're becoming.\"" })] }), _jsxs("div", { className: "w-full md:max-w-96 flex flex-col justify-center p-12 md:p-16 relative z-10", children: [_jsxs(Link, { to: "/", className: "font-bebas text-3xl text-chalk letter-spacing-widest mb-10 block text-decoration-none md:hidden", children: ["TR", _jsx("span", { className: "text-fire", children: "F" }), "C"] }), _jsx("div", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-fire before:inline-block before:flex-shrink-0", children: "Member Access" }), _jsxs("h1", { className: "font-bebas text-5xl text-chalk leading-tight mb-2.5 letter-spacing-tighter", children: ["WELCOME", _jsx("br", {}), "BACK"] }), _jsx("p", { className: "text-sm text-fog leading-loose mb-10", children: "Sign in to access events, track your progress, and connect with the community." }), errorMessage && (_jsxs("div", { className: "flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 border-l-4 border-l-red-500 px-4 py-3.5 mb-7 text-sm text-red-600 dark:text-red-400 animate-fadeUp", role: "alert", children: [_jsx(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.25" }), _jsx("span", { children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, children: [_jsx(FormInput, { label: "Email Address", id: "login-email", type: "email", placeholder: "you@example.com", autoComplete: "email", error: errors.email ? errors.email.message : undefined, ...register('email', { required: 'Email is required' }) }), _jsx("div", { className: "mb-2 mt-6", children: _jsx(FormInput, { label: "Password", id: "login-password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: "current-password", error: errors.password ? errors.password.message : undefined, ...register('password', { required: 'Password is required' }) }) }), _jsx("div", { className: "flex justify-end mb-8", children: _jsx(Link, { to: "#", className: "font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog transition-colors duration-200 hover:text-fire no-underline", children: "Forgot password?" }) }), _jsx(Button, { type: "submit", disabled: loading, isLoading: loading, variant: "primary", size: "lg", fullWidth: true, className: "h-13", children: "Sign In" })] }), _jsxs("div", { className: "flex items-center gap-3.5 my-7", children: [_jsx("div", { className: "flex-1 h-px bg-white/10" }), _jsx("span", { className: "font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-fog", children: "New to TRFC?" }), _jsx("div", { className: "flex-1 h-px bg-white/10" })] }), _jsx("p", { className: "text-center text-sm text-fog", children: _jsx(Link, { to: "/register", className: "font-barlow-condensed font-black text-base letter-spacing-widest text-transform-uppercase text-fire text-decoration-none border-b border-fire/30 pb-0.25 transition-all duration-200 hover:text-ember hover:border-ember", children: "Create a free account \u2192" }) })] }), _jsx("style", { children: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 0.3s ease;
        }
        .bg-gradient-lines {
          background-image:
            linear-gradient(rgba(255,69,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,69,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
      ` })] }));
}
//# sourceMappingURL=Login.js.map