import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../store/cartStore';
export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { token, logout } = useAuth();
    const { items } = useCart();
    const navigate = useNavigate();
    const cartCount = items.length;
    const handleLogout = () => {
        logout();
        navigate('/');
    };
    return (_jsxs("nav", { className: "sticky top-0 z-50 bg-dark text-white shadow-lg", children: [_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-4 flex justify-between items-center", children: [_jsx(Link, { to: "/", className: "font-bold text-2xl text-primary", children: "TRFC" }), _jsxs("div", { className: "hidden md:flex gap-8 items-center", children: [_jsx(Link, { to: "/", className: "hover:text-primary transition", children: "Home" }), _jsx(Link, { to: "/events", className: "hover:text-primary transition", children: "Events" }), _jsx(Link, { to: "/shop", className: "hover:text-primary transition", children: "Shop" }), _jsxs(Link, { to: "/cart", className: "hover:text-primary transition relative flex items-center gap-2", children: [_jsx(ShoppingCart, { size: 20 }), cartCount > 0 && (_jsx("span", { className: "absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center", children: cartCount }))] }), token ? (_jsx(_Fragment, { children: _jsx("button", { onClick: handleLogout, className: "bg-primary px-4 py-2 rounded-lg hover:bg-opacity-90 transition", children: "Logout" }) })) : (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/login", className: "hover:text-primary transition", children: "Login" }), _jsx(Link, { to: "/register", className: "bg-primary px-4 py-2 rounded-lg hover:bg-opacity-90 transition", children: "Register" })] }))] }), _jsx("button", { onClick: () => setIsOpen(!isOpen), className: "md:hidden", children: _jsx("span", { className: "text-2xl", children: "\u2630" }) })] }), isOpen && (_jsxs("div", { className: "md:hidden bg-dark-200 flex flex-col gap-4 p-4", children: [_jsx(Link, { to: "/", className: "hover:text-primary", children: "Home" }), _jsx(Link, { to: "/events", className: "hover:text-primary", children: "Events" }), _jsx(Link, { to: "/shop", className: "hover:text-primary", children: "Shop" }), _jsxs(Link, { to: "/cart", className: "hover:text-primary flex items-center gap-2", children: [_jsx(ShoppingCart, { size: 20 }), "Cart ", cartCount > 0 && `(${cartCount})`] }), token ? (_jsx(_Fragment, { children: _jsx("button", { onClick: handleLogout, className: "bg-primary px-4 py-2 rounded-lg text-left", children: "Logout" }) })) : (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/login", className: "hover:text-primary", children: "Login" }), _jsx(Link, { to: "/register", className: "bg-primary px-4 py-2 rounded-lg text-left", children: "Register" })] }))] }))] }));
}
//# sourceMappingURL=Navbar.js.map