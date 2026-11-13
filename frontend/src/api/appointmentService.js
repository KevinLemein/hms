import api from "./axios";

const appointmentService = {
    book: async (data) => {
        const response = await api.post("/appointments", data);
        return response.data;
    },

    getAll: async () => {
        const response = await api.get("/appointments");
        return response.data;
    },

    getToday: async () => {
        const response = await api.get("/appointments/today");
        return response.data;
    },

    getByDoctor: async (doctorId) => {
        const response = await api.get(`/appointments/doctor/${doctorId}`);
        return response.data;
    },

    getTodayByDoctor: async (doctorId) => {
        const response = await api.get(`/appointments/doctor/${doctorId}/today`);
        return response.data;
    },

    getByPatient: async (patientId) => {
        const response = await api.get(`/appointments/patient/${patientId}`);
        return response.data;
    },

    updateStatus: async (id, status, notes = "") => {
        const response = await api.patch(`/appointments/${id}/status`, { status, notes });
        return response.data;
    },

    // Enabled doctors for booking forms; `id` is the value to send as doctorId.
    getDoctors: async () => {
        const response = await api.get("/appointments/doctors");
        return response.data;
    },

    // Free start times ("HH:mm") for a doctor on a day (yyyy-MM-dd). Pass
    // ignoreAppointmentId when rescheduling so its own slot counts as free.
    getSlots: async (doctorId, date, ignoreAppointmentId) => {
        const response = await api.get(`/appointments/doctor/${doctorId}/slots`, {
            params: { date, ...(ignoreAppointmentId ? { ignoreAppointmentId } : {}) },
        });
        return response.data;
    },

    reschedule: async (id, appointmentDateTime, reason) => {
        const response = await api.put(`/appointments/${id}`, { appointmentDateTime, reason });
        return response.data;
    },
};

export default appointmentService;