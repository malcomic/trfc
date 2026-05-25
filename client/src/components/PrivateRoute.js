import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function PrivateRoute({ children, role }) {
    const { token, user, isLoading } = useAuth();
    if (isLoading) {
        return _jsx("div", { className: "flex items-center justify-center h-screen bg-white dark:bg-[#1C1C1C] text-gray-900 dark:text-white", children: "Loading..." });
    }
    if (!token) {
        return _jsx(Navigate, { to: "/login" });
    }
    if (role && user && user.role !== role) {
        return _jsx(Navigate, { to: "/" });
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=PrivateRoute.js.map