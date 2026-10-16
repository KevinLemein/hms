import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../api/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // True after an API 401 ended the session, until the next sign-in.
    // ProtectedRoute passes it along on its own redirect: React Router
    // applies navigations as transitions, so the protected page re-renders
    // with user = null first and its <Navigate> would otherwise replace the
    // { sessionExpired } state set below, hiding the "session expired" notice.
    const [sessionExpired, setSessionExpired] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check for existing session on mount
        const savedUser = authService.getCurrentUser();
        if (savedUser) {
            setUser(savedUser);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // Fired by the axios interceptor on a 401 — see api/axios.js for why
        // this goes through navigate(replace: true) instead of a hard redirect.
        const handleSessionExpired = () => {
            setSessionExpired(true);
            setUser(null);
            navigate("/login", { replace: true, state: { sessionExpired: true } });
        };
        window.addEventListener("auth:session-expired", handleSessionExpired);
        return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
    }, [navigate]);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        if (response.success) {
            setSessionExpired(false);
            setUser(response.data);
        }
        return response;
    };

    const register = async (userData) => {
        const response = await authService.register(userData);
        if (response.success) {
            setUser(response.data);
        }
        return response;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        sessionExpired,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}