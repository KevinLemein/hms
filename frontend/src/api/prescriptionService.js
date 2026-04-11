import api from "./axios";

const prescriptionService = {
    getAll: async () => {
        const response = await api.get("/Prescriptions");
        return response.data;
    },
    getById: async (id) => {
        const response = await api.get(`/Prescriptions/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await api.post("/Prescriptions", data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/Prescriptions/${id}`, data);
        return response.data;
    },
    getDrugs: async () => {
        const response = await api.get("/Drugs");
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/Prescriptions/${id}`);
        return response.data;
    },
};

export default prescriptionService;