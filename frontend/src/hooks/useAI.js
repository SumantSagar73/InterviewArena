import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { aiApi } from "../api/ai";

export const useAnalyzeCode = () => {
    return useMutation({
        mutationFn: aiApi.analyzeCode,
        onError: (error) => toast.error(error.response?.data?.message || "Analysis failed"),
    });
};

export const useGenerateHint = (sessionId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: aiApi.generateHint,
        onSuccess: () => {
            toast.success("Hint generated!");
            queryClient.invalidateQueries(["session", sessionId]);
        },
        onError: (error) => toast.error(error.response?.data?.message || "Failed to generate hint"),
    });
};

export const useAnalyzeResume = () => {
    return useMutation({
        mutationFn: aiApi.analyzeResume,
        onError: (error) => toast.error(error.response?.data?.message || "Resume analysis failed"),
    });
};

export const useToggleAIAnalyzerVote = (sessionId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => aiApi.toggleVote(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries(["session", sessionId]);
        },
        onError: (error) => toast.error(error.response?.data?.message || "Failed to vote"),
    });
};

export const useEnableAIAnalyzer = (sessionId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => aiApi.enableAnalyzer(sessionId),
        onSuccess: () => {
            toast.success("AI Analyzer enabled!");
            queryClient.invalidateQueries(["session", sessionId]);
        },
    });
};

export const useChatInterview = () => {
    return useMutation({
        mutationFn: aiApi.chatInterview,
        onError: (error) => toast.error(error.response?.data?.message || "Interview chat failed"),
    });
};

export const useGenerateInterviewPlan = () => {
    return useMutation({
        mutationFn: aiApi.generateInterviewPlan,
        onError: (error) => toast.error(error.response?.data?.message || "Failed to prepare interview plan"),
    });
};

export const useSuggestQuestion = () => {
    return useMutation({
        mutationFn: aiApi.suggestQuestion,
        onError: (error) => toast.error(error.response?.data?.message || "Failed to get question suggestion"),
    });
};
