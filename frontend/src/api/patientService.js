import api from "./axios";

const patientService = {
    registerPatient: async (patientData) => {
        const response = await api.post("/patients/register", patientData);
        return response.data;
    },

    getAllPatients: async () => {
        const response = await api.get("/patients");
        return response.data;
    },

    getPatientById: async (id) => {
        const response = await api.get(`/patients/${id}`);
        return response.data;
    },

    searchPatients: async (query) => {
        const response = await api.get(`/patients/search?query=${encodeURIComponent(query)}`);
        return response.data;
    },
};

export default patientService;