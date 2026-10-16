import axios from "axios";

// In development (Vite dev server): requests go to http://localhost:8080/api
// In production (Docker/nginx): nginx proxies /api/ to backend, so just use /api
// VITE_API_BASE_URL overrides both (used by the end-to-end tests, which run
// the backend on a different port).
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8080/api" : "/api"),
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor — attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
//
// IMPORTANT: this file runs outside the React tree, so it has no access to
// React Router's navigate(). Using window.location.href here would force a
// full page reload AND always *push* a new history entry (it can never
// "replace"), which is what left a stray /login entry sitting in browser
// history behind whatever page the user was on — hence the back-gesture
// landing back on the sign-in screen. Dispatching a custom event lets
// AuthProvider (which does have navigate) handle the redirect properly with
// replace: true, so /login never lingers in history.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // A 401 from the sign-in request itself means wrong credentials, not
        // an expired session; the login form shows that error itself.
        const isLoginRequest = error.config?.url?.endsWith("/auth/login");
        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
        return Promise.reject(error);
    }
);

export default api;