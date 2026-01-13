import axios from "../lib/axios";

export const uploadResume = async (file, sessionId) => {
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("sessionId", sessionId);

    const response = await axios.post("/resume/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const analyzeResumeAndGenerateQuestions = async (resumeText, sessionId, topics = [], difficulty = "Medium") => {
    const response = await axios.post("/resume/analyze", {
        resumeText,
        sessionId,
        topics,
        difficulty,
    });
    return response.data;
};

export const addSessionTopics = async (sessionId, topics) => {
    const response = await axios.post(`/sessions/${sessionId}/topics`, {
        topics,
    });
    return response.data;
};

export const getSessionQuestions = async (sessionId) => {
    const response = await axios.get(`/sessions/${sessionId}/questions`);
    return response.data;
};
