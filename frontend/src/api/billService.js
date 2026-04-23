import api from "./axios";

const billService = {
    // Create bill from prescription (called after .NET prescription creation)
    createFromPrescription: async (data) => {
        const response = await api.post("/bills/from-prescription", data);
        return response.data;
    },

    // Add extra charge to a bill (receptionist)
    addItem: async (billId, data) => {
        const response = await api.post(`/bills/${billId}/items`, data);
        return response.data;
    },

    // Record payment
    recordPayment: async (billId, data) => {
        const response = await api.patch(`/bills/${billId}/pay`, data);
        return response.data;
    },

    // Get all bills
    getAll: async () => {
        const response = await api.get("/bills");
        return response.data;
    },

    // Get bills by status
    getByStatus: async (status) => {
        const response = await api.get(`/bills/status/${status}`);
        return response.data;
    },

    // Get bill for an appointment
    getByAppointment: async (appointmentId) => {
        const response = await api.get(`/bills/appointment/${appointmentId}`);
        return response.data;
    },

    // Get bills for a patient
    getByPatient: async (patientId) => {
        const response = await api.get(`/bills/patient/${patientId}`);
        return response.data;
    },

    // Get single bill
    getById: async (id) => {
        const response = await api.get(`/bills/${id}`);
        return response.data;
    },
};

export default billService;