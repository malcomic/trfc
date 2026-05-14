import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function PrivateRoute({ children, role }) {
    const { token, user } = useAuth();
    if (!token) {
        return _jsx(Navigate, { to: "/login" });
    }
    if (role && user && user.role !== role) {
        return _jsx(Navigate, { to: "/" });
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=PrivateRoute.js.map