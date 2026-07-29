import api from "./axios";

const billService = {
    // Create a new bill for a patient (optionally tied to an appointment).
    // Matches CreateBillRequest: { patientId, appointmentId? }
    createBill: async (data) => {
        const response = await api.post("/bills", data);
        return response.data;
    },

    // Add a line item to an existing bill (consultation fee, drug charge,
    // lab charge, or a manual walk-in charge).
    // Matches AddLineItemRequest:
    //   { description, quantity, unitPrice, source, sourceReferenceId? }
    // `source` must be one of: CONSULTATION, DRUG_DISPENSE, LAB, MANUAL.
    // `sourceReferenceId` is required (and must be unique per source) for
    // CONSULTATION/DRUG_DISPENSE/LAB; omit it for MANUAL charges.
    addItem: async (billId, data) => {
        const response = await api.post(`/bills/${billId}/items`, data);
        return response.data;
    },

    // Record payment. Backend moved this from PATCH /pay to POST /payments.
    recordPayment: async (billId, data) => {
        const response = await api.post(`/bills/${billId}/payments`, data);
        return response.data;
    },

    cancelBill: async (billId, reason) => {
        const response = await api.patch(`/bills/${billId}/cancel`, reason);
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