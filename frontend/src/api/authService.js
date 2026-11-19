import api from "./axios";

const authService = {
    register: async (userData) => {
        const response = await api.post("/auth/register", userData);
        if (response.data.success && response.data.data.token) {
            localStorage.setItem("token", response.data.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.data));
        }
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post("/auth/login", credentials);
        if (response.data.success && response.data.data.token) {
            localStorage.setItem("token", response.data.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.data));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    },

    getCurrentUser: () => {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    },

    getToken: () => {
        return localStorage.getItem("token");
    },

    isAuthenticated: () => {
        return !!localStorage.getItem("token");
    },
};

export default authService;