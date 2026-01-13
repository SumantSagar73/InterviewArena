
import axiosInstance from "../lib/axios";

export const audioApi = {
    transcribe: async (audioBlob) => {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        const response = await axiosInstance.post("audio/transcribe", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    speak: async (text) => {
        const response = await axiosInstance.post("audio/speak", { text }, {
            responseType: 'arraybuffer' // Important for audio blob
        });
        return response.data;
    }
};
