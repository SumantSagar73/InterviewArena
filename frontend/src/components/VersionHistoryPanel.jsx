import { formatDistanceToNow } from "date-fns";
import { HistoryIcon, RotateCcwIcon, SaveIcon, Loader2Icon } from "lucide-react";
import { useCreateVersion, useVersions } from "../hooks/useVersions";
import { useUser } from "@clerk/clerk-react";

function VersionHistoryPanel({
    targetId,
    problemId,
    currentCode,
    language,
    onRestore,
    isSession,
}) {
    const { user } = useUser();
    const { data: versionsData, isLoading: loadingVersions } = useVersions(targetId);
    const createVersionMutation = useCreateVersion();

    const handleSaveVersion = () => {
        const versionName = prompt("Enter a name for this version (optional):");
        if (versionName === null) return; // cancelled

        createVersionMutation.mutate({
            sessionId: isSession ? targetId : null,
            problemId,
            code: currentCode,
            language,
            name: versionName,
        });
    };

    const versions = versionsData?.versions || [];

    return (
        <div className="h-full bg-base-100 flex flex-col border-l border-base-300">
            <div className="px-4 py-3 bg-base-200 border-b border-base-300 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                    <HistoryIcon className="size-4" />
                    <span>Version History</span>
                </div>
                <button
                    onClick={handleSaveVersion}
                    disabled={createVersionMutation.isPending}
                    className="btn btn-ghost btn-xs gap-1 text-primary"
                    title="Save current code as a version"
                >
                    {createVersionMutation.isPending ? (
                        <Loader2Icon className="size-3 animate-spin" />
                    ) : (
                        <SaveIcon className="size-3" />
                    )}
                    Save
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {loadingVersions ? (
                    <div className="flex justify-center p-4">
                        <Loader2Icon className="size-6 animate-spin text-primary" />
                    </div>
                ) : versions.length === 0 ? (
                    <div className="p-4 text-center text-base-content/50 text-sm italic">
                        No versions saved yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {versions.map((version) => (
                            <div
                                key={version._id}
                                className="group bg-base-200 hover:bg-base-300 rounded-lg p-3 transition-colors border border-transparent hover:border-base-content/10"
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className="font-medium text-sm truncate max-w-[150px]">
                                        {version.name || "Untitled Version"}
                                    </span>
                                    <button
                                        onClick={() => onRestore(version.code)}
                                        className="btn btn-ghost btn-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Restore this version"
                                    >
                                        <RotateCcwIcon className="size-3" />
                                        Restore
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-base-content/60">
                                    <span>{version.language}</span>
                                    <span>{formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default VersionHistoryPanel;
