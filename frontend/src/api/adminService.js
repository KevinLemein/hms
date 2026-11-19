import api from "./axios";

const adminService = {
    createUser: async (userData) => {
        const response = await api.post("/admin/users", userData);
        return response.data;
    },

    // Paged (PagedResponse). page is 0-based.
    getAllUsers: async (page = 0, size = 20) => {
        const response = await api.get("/admin/users", { params: { page, size, sort: "id,asc" } });
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