import api from "./axios";

const patientService = {
    registerPatient: async (patientData) => {
        const response = await api.post("/patients/register", patientData);
        return response.data;
    },

    // Paged (PagedResponse). page is 0-based.
    getAllPatients: async (page = 0, size = 20) => {
        const response = await api.get("/patients", { params: { page, size, sort: "id,desc" } });
        return response.data;
    },

    getPatientById: async (id) => {
        const response = await api.get(`/patients/${id}`);
        return response.data;
    },
    getByUserId: async (userId) => {
        const response = await api.get(`/patients/by-user/${userId}`);
        return response.data;
    },

    // Patient self-service: the backend resolves the patient from the JWT,
    // so these never take an id.
    getMe: async () => {
        const response = await api.get("/patients/me");
        return response.data;
    },

    getMyAppointments: async () => {
        const response = await api.get("/patients/me/appointments");
        return response.data;
    },

    getMyPrescriptions: async () => {
        const response = await api.get("/patients/me/prescriptions");
        return response.data;
    },

    getMyBills: async () => {
        const response = await api.get("/patients/me/bills");
        return response.data;
    },

    searchPatients: async (query) => {
        const response = await api.get(`/patients/search?query=${encodeURIComponent(query)}`);
        return response.data;
    },
};

export default patientService;