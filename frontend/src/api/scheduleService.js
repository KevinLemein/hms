import api from "./axios";

// A doctor's weekly working hours and time off. doctorId is the doctor's user id.
const scheduleService = {
    getSchedule: async (doctorId) => {
        const response = await api.get(`/appointments/doctor/${doctorId}/schedule`);
        return response.data;
    },

    // Replaces the whole week; an empty list restores the clinic default hours.
    saveSchedule: async (doctorId, blocks) => {
        const response = await api.put(`/appointments/doctor/${doctorId}/schedule`, { blocks });
        return response.data;
    },

    getTimeOff: async (doctorId) => {
        const response = await api.get(`/appointments/doctor/${doctorId}/time-off`);
        return response.data;
    },

    addTimeOff: async (doctorId, { startDate, endDate, reason }) => {
        const response = await api.post(`/appointments/doctor/${doctorId}/time-off`, { startDate, endDate, reason });
        return response.data;
    },

    removeTimeOff: async (doctorId, timeOffId) => {
        const response = await api.delete(`/appointments/doctor/${doctorId}/time-off/${timeOffId}`);
        return response.data;
    },
};

export default scheduleService;
