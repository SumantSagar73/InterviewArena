import axiosInstance from "../lib/axios";

export const aiApi = {
    analyzeCode: async (data) => {
        const response = await axiosInstance.post("/ai/analyze", data);
        return response.data;
    },

    generateHint: async (data) => {
        const response = await axiosInstance.post("/ai/hint", data);
        return response.data;
    },

    analyzeResume: async (data) => {
        const response = await axiosInstance.post("/ai/resume", data);
        return response.data;
    },

    toggleVote: async (sessionId) => {
        const response = await axiosInstance.post(`/ai/${sessionId}/vote`);
        return response.data;
    },

    enableAnalyzer: async (sessionId) => {
        const response = await axiosInstance.post(`/ai/${sessionId}/enable`);
        return response.data;
    },
};
