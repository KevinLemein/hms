


import api from "./axios";


const prescriptionService = {
    getAll: async () => {
        const response = await api.get("/prescriptions");
        return response.data.data;
    },

    // Prescriptions issued by the signed-in doctor (doctors can't list all).
    getMine: async () => {
        const response = await api.get("/prescriptions/mine");
        return response.data.data;
    },

    getById: async (id) => {
        const response = await api.get(`/prescriptions/${id}`);
        return response.data.data;
    },

    // doctorId is no longer sent from the client -- the backend derives it
    // from the authenticated JWT , so it can't
    // be spoofed. `data` should be:
    //   { appointmentId, drugId, dossage, duration, notes, quantity }
    // The backend deducts stock and charges the drug (priced from the drug
    // catalogue) in the same transaction. An identical re-submission returns
    // the existing prescription with 200 instead of 201: `created` tells the
    // caller which happened.
    create: async (data) => {
        const response = await api.post("/prescriptions", data);
        return { ...response.data, created: response.status === 201 };
    },

    update: async (id, data) => {
        const response = await api.put(`/prescriptions/${id}`, data);
        return response.data;
    },

    getDrugs: async () => {
        const response = await api.get("/drugs");
        return response.data.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/prescriptions/${id}`);
        return response.data;
    },
};

export default prescriptionService;