import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
export default function AdminLogin() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const { login, user } = useAuth();
    // Redirect if already logged in as admin
    if (user && user.role === 'admin') {
        navigate('/admin');
        return null;
    }
    const onSubmit = async (data) => {
        try {
            setLoading(true);
            setErrorMessage('');
            const response = await loginUser(data);
            if (response.user.role !== 'admin') {
                setErrorMessage('Admin access required. Only admins can login here.');
                return;
            }
            login(response.token, response.user, response.refreshToken);
            navigate('/admin');
        }
        catch (error) {
            console.error('Login failed:', error);
            setErrorMessage(error.response?.data?.error || 'Login failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen py-12 px-4 flex items-center justify-center bg-gray-50", children: _jsx("div", { className: "w-full max-w-md", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl p-8", children: [_jsx("div", { className: "flex justify-center mb-6", children: _jsx("div", { className: "bg-primary text-white px-6 py-3 rounded-full font-bold text-lg", children: "ADMIN PORTAL" }) }), _jsx("h1", { className: "text-3xl font-bold mb-2 text-center text-gray-800", children: "Admin Login" }), _jsx("p", { className: "text-gray-600 text-center mb-8", children: "Access the administration panel" }), errorMessage && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6", children: errorMessage })), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Email" }), _jsx("input", { type: "email", ...register('email', { required: 'Email is required' }), placeholder: "admin@example.com", className: "w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50" }), errors.email && _jsx("span", { className: "text-red-500 text-sm", children: errors.email.message })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold mb-2", children: "Password" }), _jsx("input", { type: "password", ...register('password', { required: 'Password is required' }), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50" }), errors.password && _jsx("span", { className: "text-red-500 text-sm", children: errors.password.message })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 mt-6", children: loading ? 'Signing in...' : 'Sign In' })] }), _jsx("div", { className: "mt-6 pt-6 border-t border-gray-200", children: _jsxs("p", { className: "text-center text-gray-600 text-sm", children: ["Need member login? ", _jsx("a", { href: "/login", className: "text-primary font-semibold hover:underline", children: "Click here" })] }) })] }) }) }));
}
//# sourceMappingURL=AdminLogin.js.map