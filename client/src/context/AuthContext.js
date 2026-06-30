import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile, logoutUser } from '../api/auth';
import api from '../api/index';
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const init = async () => {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (!savedToken) {
                setIsLoading(false);
                return;
            }
            setToken(savedToken);
            if (savedUser)
                setUser(JSON.parse(savedUser));
            try {
                const profile = await getUserProfile();
                const refreshedToken = localStorage.getItem('token');
                if (refreshedToken)
                    setToken(refreshedToken);
                setUser(profile);
                localStorage.setItem('user', JSON.stringify(profile));
            }
            catch (err) {
                if (err?.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                    delete api.defaults.headers.common['Authorization'];
                }
            }
            finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);
    const login = (newToken, newUser, refreshToken) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        if (refreshToken)
            localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };
    const logout = async () => {
        try {
            if (token)
                await logoutUser();
        }
        catch {
            /* ignore */
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
    };
    return (_jsx(AuthContext.Provider, { value: { user, token, isLoading, login, logout }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within AuthProvider');
    return context;
}
//# sourceMappingURL=AuthContext.js.map