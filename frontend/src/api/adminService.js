import api from "./axios";

const adminService = {
    createUser: async (userData) => {
        const response = await api.post("/admin/users", userData);
        return response.data;
    },

    getAllUsers: async () => {
        const response = await api.get("/admin/users");
        return response.data;
    },

    getUsersByRole: async (role) => {
        const response = await api.get(`/admin/users/role/${role}`);
        return response.data;
    },

    updateUserRole: async (userId, role) => {
        const response = await api.patch(`/admin/users/${userId}/role`, { role });
        return response.data;
    },

    toggleUserStatus: async (userId) => {
        const response = await api.patch(`/admin/users/${userId}/toggle-status`);
        return response.data;
    },
};

export default adminService;