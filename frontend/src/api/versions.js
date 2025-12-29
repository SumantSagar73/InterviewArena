import axiosInstance from "../lib/axios";

export const versionApi = {
    createVersion: async (data) => {
        const response = await axiosInstance.post("/versions", data);
        return response.data;
    },

    getVersions: async (targetId) => {
        const response = await axiosInstance.get(`/versions/history/${targetId}`);
        return response.data;
    },

    getVersionById: async (id) => {
        const response = await axiosInstance.get(`/versions/${id}`);
        return response.data;
    },
};
