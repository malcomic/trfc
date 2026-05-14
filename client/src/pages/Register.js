import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
export default function Register() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
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
    return (_jsx("div", { className: "min-h-screen py-12 px-4 flex items-center justify-center", children: _jsx("div", { className: "w-full max-w-md", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl p-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-2 text-center", children: "Join TRFC" }), _jsx("p", { className: "text-gray-600 text-center mb-8", children: "Create your account" }), errorMessage && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: errorMessage })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Full Name" }), _jsx("input", { type: "text", ...register('name', { required: 'Name is required' }), placeholder: "John Doe", className: "w-full border rounded-lg px-4 py-2" }), errors.name && _jsx("span", { className: "text-red-500 text-sm", children: errors.name.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Email" }), _jsx("input", { type: "email", ...register('email', { required: 'Email is required' }), placeholder: "you@example.com", className: "w-full border rounded-lg px-4 py-2" }), errors.email && _jsx("span", { className: "text-red-500 text-sm", children: errors.email.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Phone" }), _jsx("input", { type: "tel", ...register('phone', { required: 'Phone is required' }), placeholder: "254XXXXXXXXX", className: "w-full border rounded-lg px-4 py-2" }), errors.phone && _jsx("span", { className: "text-red-500 text-sm", children: errors.phone.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Password" }), _jsx("input", { type: "password", ...register('password', { required: 'Password is required' }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full border rounded-lg px-4 py-2" }), errors.password && _jsx("span", { className: "text-red-500 text-sm", children: errors.password.message })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-primary text-white py-2 rounded-lg font-semibold hover:scale-105 transition disabled:opacity-50 mt-6", children: loading ? 'Creating account...' : 'Sign Up' })] }), _jsxs("p", { className: "text-center mt-6 text-gray-600", children: ["Already have an account? ", _jsx(Link, { to: "/login", className: "text-primary font-semibold hover:underline", children: "Login" })] })] }) }) }));
}
//# sourceMappingURL=Register.js.map