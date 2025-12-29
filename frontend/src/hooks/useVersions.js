import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { versionApi } from "../api/versions";

export const useCreateVersion = () => {
    const queryClient = useQueryClient();
    const result = useMutation({
        mutationKey: ["createVersion"],
        mutationFn: versionApi.createVersion,
        onSuccess: (data) => {
            toast.success("Version saved successfully!");
            // Invalidating queries to refresh history
            queryClient.invalidateQueries(["versions", data.version.sessionId || data.version.problemId]);
        },
        onError: (error) => toast.error(error.response?.data?.message || "Failed to save version"),
    });

    return result;
};

export const useVersions = (targetId) => {
    const result = useQuery({
        queryKey: ["versions", targetId],
        queryFn: () => versionApi.getVersions(targetId),
        enabled: !!targetId,
    });

    return result;
};

export const useVersionById = (id) => {
    const result = useQuery({
        queryKey: ["version", id],
        queryFn: () => versionApi.getVersionById(id),
        enabled: !!id,
    });

    return result;
};
