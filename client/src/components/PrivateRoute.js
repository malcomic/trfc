import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function PrivateRoute({ children, role, loginPath = '/login' }) {
    const { token, user, isLoading } = useAuth();
    const location = useLocation();
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-night light:bg-night-light text-chalk font-barlow", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-10 w-10 border-b-2 border-fire mx-auto mb-3" }), _jsx("p", { className: "font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog", children: "Loading\u2026" })] }) }));
    }
    if (!token) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        const loginUrl = `${loginPath}?redirect=${redirect}`;
        return _jsx(Navigate, { to: loginUrl, replace: true });
    }
    if (role && user && user.role !== role) {
        return _jsx(Navigate, { to: "/" });
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=PrivateRoute.js.map