import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, X, Menu, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../store/cartStore';
const navStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@500;700;900&family=Barlow:wght@400;600&display=swap');

  .trfc-nav {
    --fire: #FF4500;
    --ember: #FF7A1A;
    --night: #0A0A0A;
    --ink: #111111;
    --ash: #1C1C1C;
    --chalk: #F5F2EE;
    --fog: #6B6B6B;
    --mist: #2E2E2E;
    position: sticky;
    top: 0;
    z-index: 100;
    font-family: 'Barlow', sans-serif;
  }

  /* Thin fire-line at very top */
  .trfc-nav__topline {
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--fire) 40%, var(--ember) 60%, transparent);
  }

  /* Main bar */
  .trfc-nav__bar {
    background: rgba(10, 10, 10, 0.97);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.3s;
  }
  .trfc-nav__bar.scrolled {
    background: rgba(8, 8, 8, 0.99);
    border-bottom-color: rgba(255,69,0,0.15);
  }

  .trfc-nav__inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 6%;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  /* Logo */
  .trfc-nav__logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    color: var(--chalk);
    text-decoration: none;
    letter-spacing: 2px;
    line-height: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .trfc-nav__logo-main { line-height: 1; }
  .trfc-nav__logo-main span { color: var(--fire); }
  .trfc-nav__logo-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 8px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--fog);
    line-height: 1;
    margin-top: 1px;
  }

  /* Desktop links */
  .trfc-nav__links {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    justify-content: center;
  }

  .trfc-nav__link {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: rgba(245,242,238,0.5);
    text-decoration: none;
    padding: 6px 16px;
    position: relative;
    transition: color 0.2s;
  }
  .trfc-nav__link::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 16px;
    right: 16px;
    height: 2px;
    background: var(--fire);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .trfc-nav__link:hover,
  .trfc-nav__link.active {
    color: var(--chalk);
  }
  .trfc-nav__link:hover::after,
  .trfc-nav__link.active::after {
    transform: scaleX(1);
  }
  .trfc-nav__link.active::after {
    background: var(--fire);
  }

  /* Actions area */
  .trfc-nav__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Cart button */
  .trfc-nav__cart {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: rgba(245,242,238,0.55);
    text-decoration: none;
    transition: color 0.2s;
    border: 1px solid rgba(255,255,255,0.07);
    clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
  }
  .trfc-nav__cart:hover { color: var(--chalk); border-color: rgba(255,255,255,0.15); }
  .trfc-nav__cart-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: var(--fire);
    color: white;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 10px;
    letter-spacing: 0;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes badgePop {
    from { transform: scale(0); }
    to   { transform: scale(1); }
  }

  /* Auth buttons */
  .trfc-nav__btn-ghost {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(245,242,238,0.55);
    text-decoration: none;
    padding: 8px 14px;
    border: 1px solid rgba(255,255,255,0.07);
    transition: color 0.2s, border-color 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    cursor: pointer;
  }
  .trfc-nav__btn-ghost:hover {
    color: var(--chalk);
    border-color: rgba(255,255,255,0.2);
  }

  .trfc-nav__btn-primary {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: white;
    text-decoration: none;
    padding: 9px 20px;
    background: var(--fire);
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
    transition: background 0.2s, transform 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    cursor: pointer;
  }
  .trfc-nav__btn-primary:hover {
    background: var(--ember);
    transform: scale(1.03);
  }

  /* Hamburger */
  .trfc-nav__hamburger {
    display: none;
    background: none;
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--chalk);
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
    transition: border-color 0.2s, color 0.2s;
  }
  .trfc-nav__hamburger:hover { border-color: var(--fire); color: var(--fire); }

  /* Mobile drawer */
  .trfc-nav__drawer {
    position: fixed;
    inset: 0;
    z-index: 200;
    pointer-events: none;
  }
  .trfc-nav__drawer-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.35s;
  }
  .trfc-nav__drawer.open .trfc-nav__drawer-overlay {
    opacity: 1;
    pointer-events: all;
  }
  .trfc-nav__drawer-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(360px, 90vw);
    background: var(--ink);
    border-left: 1px solid rgba(255,255,255,0.06);
    transform: translateX(100%);
    transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
    display: flex;
    flex-direction: column;
    pointer-events: all;
    overflow-y: auto;
  }
  .trfc-nav__drawer.open .trfc-nav__drawer-panel {
    transform: translateX(0);
  }

  .trfc-nav__drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .trfc-nav__drawer-close {
    background: none;
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--chalk);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    transition: border-color 0.2s;
  }
  .trfc-nav__drawer-close:hover { border-color: var(--fire); color: var(--fire); }

  .trfc-nav__drawer-links {
    padding: 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .trfc-nav__drawer-link {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 28px;
    letter-spacing: 1px;
    color: rgba(245,242,238,0.4);
    text-decoration: none;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: color 0.2s, padding-left 0.2s;
  }
  .trfc-nav__drawer-link:last-child { border-bottom: none; }
  .trfc-nav__drawer-link:hover, .trfc-nav__drawer-link.active { color: var(--chalk); padding-left: 8px; }
  .trfc-nav__drawer-link .arrow { font-size: 18px; opacity: 0; transition: opacity 0.2s; color: var(--fire); }
  .trfc-nav__drawer-link:hover .arrow { opacity: 1; }

  .trfc-nav__drawer-footer {
    padding: 24px;
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  @media (max-width: 768px) {
    .trfc-nav__links, .trfc-nav__actions { display: none !important; }
    .trfc-nav__hamburger { display: flex !important; }
    .trfc-nav__cart-mobile {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      color: rgba(245,242,238,0.55);
      text-decoration: none;
      position: relative;
      border: 1px solid rgba(255,255,255,0.07);
      clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
    }
  }
  @media (min-width: 769px) {
    .trfc-nav__cart-mobile { display: none; }
    .trfc-nav__drawer { display: none; }
    .trfc-nav__hamburger { display: none; }
  }
`;
export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { token, logout } = useAuth();
    const { items } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const styleRef = useRef(null);
    const cartCount = items.length;
    useEffect(() => {
        if (document.getElementById('trfc-nav-styles'))
            return;
        const el = document.createElement('style');
        el.id = 'trfc-nav-styles';
        el.textContent = navStyles;
        document.head.appendChild(el);
        styleRef.current = el;
        return () => {
            const existing = document.getElementById('trfc-nav-styles');
            if (existing)
                document.head.removeChild(existing);
        };
    }, []);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    // Close drawer on route change
    useEffect(() => { setIsOpen(false); }, [location.pathname]);
    // Lock body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);
    const handleLogout = () => {
        logout();
        setIsOpen(false);
        navigate('/');
    };
    const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/events', label: 'Events' },
        { to: '/programs', label: 'Programs' },
        { to: '/gallery', label: 'Gallery' },
        { to: '/shop', label: 'Shop' },
    ];
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        #trfc-nav-styles ~ * {}  /* ensure styles loaded */
      ` }), _jsxs("nav", { className: "trfc-nav", children: [_jsx("div", { className: "trfc-nav__topline" }), _jsx("div", { className: `trfc-nav__bar${scrolled ? ' scrolled' : ''}`, children: _jsxs("div", { className: "trfc-nav__inner", children: [_jsxs(Link, { to: "/", className: "trfc-nav__logo", children: [_jsxs("span", { className: "trfc-nav__logo-main", children: ["TR", _jsx("span", { children: "F" }), "C"] }), _jsx("span", { className: "trfc-nav__logo-sub", children: "Thika Road FC" })] }), _jsx("div", { className: "trfc-nav__links", children: navLinks.map((l) => (_jsx(Link, { to: l.to, className: `trfc-nav__link${isActive(l.to) ? ' active' : ''}`, children: l.label }, l.to))) }), _jsxs("div", { className: "trfc-nav__actions", children: [_jsxs(Link, { to: "/cart", className: "trfc-nav__cart", "aria-label": `Cart (${cartCount} items)`, children: [_jsx(ShoppingCart, { size: 18 }), cartCount > 0 && (_jsx("span", { className: "trfc-nav__cart-badge", children: cartCount > 9 ? '9+' : cartCount }))] }), token ? (_jsxs("button", { onClick: handleLogout, className: "trfc-nav__btn-ghost", children: [_jsx(LogOut, { size: 13 }), "Logout"] })) : (_jsxs(_Fragment, { children: [_jsxs(Link, { to: "/login", className: "trfc-nav__btn-ghost", children: [_jsx(LogIn, { size: 13 }), "Login"] }), _jsxs(Link, { to: "/register", className: "trfc-nav__btn-primary", children: [_jsx(UserPlus, { size: 13 }), "Join"] })] }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsxs(Link, { to: "/cart", className: "trfc-nav__cart-mobile", "aria-label": "Cart", children: [_jsx(ShoppingCart, { size: 18 }), cartCount > 0 && (_jsx("span", { className: "trfc-nav__cart-badge", children: cartCount > 9 ? '9+' : cartCount }))] }), _jsx("button", { className: "trfc-nav__hamburger", onClick: () => setIsOpen(true), "aria-label": "Open menu", children: _jsx(Menu, { size: 18 }) })] })] }) })] }), _jsxs("div", { className: `trfc-nav__drawer${isOpen ? ' open' : ''}`, "aria-hidden": !isOpen, children: [_jsx("div", { className: "trfc-nav__drawer-overlay", onClick: () => setIsOpen(false) }), _jsxs("div", { className: "trfc-nav__drawer-panel", role: "dialog", "aria-modal": "true", children: [_jsxs("div", { className: "trfc-nav__drawer-head", children: [_jsxs(Link, { to: "/", className: "trfc-nav__logo", onClick: () => setIsOpen(false), children: [_jsxs("span", { className: "trfc-nav__logo-main", style: { fontSize: '28px' }, children: ["TR", _jsx("span", { style: { color: 'var(--fire)' }, children: "F" }), "C"] }), _jsx("span", { className: "trfc-nav__logo-sub", children: "Thika Road FC" })] }), _jsx("button", { className: "trfc-nav__drawer-close", onClick: () => setIsOpen(false), "aria-label": "Close menu", children: _jsx(X, { size: 16 }) })] }), _jsx("div", { className: "trfc-nav__drawer-links", children: navLinks.map((l) => (_jsxs(Link, { to: l.to, className: `trfc-nav__drawer-link${isActive(l.to) ? ' active' : ''}`, onClick: () => setIsOpen(false), children: [l.label, _jsx("span", { className: "arrow", children: "\u2192" })] }, l.to))) }), _jsx("div", { className: "trfc-nav__drawer-footer", children: token ? (_jsxs("button", { onClick: handleLogout, className: "trfc-nav__btn-ghost", style: { width: '100%', justifyContent: 'center', padding: '14px' }, children: [_jsx(LogOut, { size: 15 }), "Logout"] })) : (_jsxs(_Fragment, { children: [_jsxs(Link, { to: "/login", className: "trfc-nav__btn-ghost", style: { justifyContent: 'center', padding: '14px' }, onClick: () => setIsOpen(false), children: [_jsx(LogIn, { size: 15 }), "Login"] }), _jsxs(Link, { to: "/register", className: "trfc-nav__btn-primary", style: { justifyContent: 'center', padding: '14px', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }, onClick: () => setIsOpen(false), children: [_jsx(UserPlus, { size: 15 }), "Join the Community"] })] })) })] })] })] }));
}
//# sourceMappingURL=Navbar.js.map