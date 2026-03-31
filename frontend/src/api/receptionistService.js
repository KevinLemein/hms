import api from "./axios";

const receptionistService = {
    createUser: async (userData) => {
        const response = await api.post("/receptionist/users", userData);
        return response.data;
    },

    getDoctors: async () => {
        const response = await api.get("/receptionist/doctors");
        return response.data;
    },
};

export default receptionistService;