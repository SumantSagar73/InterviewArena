import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "../lib/axios";
import { FileTextIcon, UploadIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { uploadResume, analyzeResumeAndGenerateQuestions, getSessionQuestions } from "../api/resume";
import toast from "react-hot-toast";

const ResumePreviewPanel = ({ sessionId, isHost }) => {
    const [resumeUrl, setResumeUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const fileInputRef = useRef(null);

    const fetchResume = useCallback(async (showRefreshState = false) => {
        if (!sessionId) return;

        try {
            if (showRefreshState) setRefreshing(true);
            else setLoading(true);
            
            // We fetch as blob to create a secure object URL
            const response = await axios.get(`/resume/${sessionId}/file`, {
                responseType: 'blob'
            });

            // Revoke old URL if it exists
            if (resumeUrl) {
                URL.revokeObjectURL(resumeUrl);
            }

            const url = URL.createObjectURL(response.data);
            setResumeUrl(url);
            setError(null);

            // Auto-scan if host and resume exists
            if (isHost) {
                checkAndGenerateQuestions();
            }
        } catch (err) {
            // Ignore 404s which are expected if no resume was uploaded
            if (err.response && err.response.status !== 404) {
                console.error("Error fetching resume:", err);
            }

            // If 404, it just means no resume uploaded yet
            if (err.response && err.response.status === 404) {
                setError("No resume uploaded for this session.");
            } else {
                setError("Failed to load resume.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sessionId, isHost, resumeUrl]);

    const checkAndGenerateQuestions = async () => {
        try {
            const data = await getSessionQuestions(sessionId);
            if (!data.questions || data.questions.length === 0) {
                toast("Scanning resume for questions...", { icon: "🤖" });
                await analyzeResumeAndGenerateQuestions(null, sessionId);
                toast.success("Questions generated!");
                window.dispatchEvent(new Event('resume-analyzed'));
            }
        } catch (e) {
            console.error("Auto-scan failed", e);
        }
    };

    useEffect(() => {
        fetchResume();

        // For hosts, poll every 10 seconds to check if candidate uploaded resume
        let pollInterval;
        if (isHost && error) {
            pollInterval = setInterval(() => {
                fetchResume(true);
            }, 10000);
        }

        // Cleanup
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [sessionId, isHost, error]);

    // Cleanup URL on unmount
    useEffect(() => {
        return () => {
            if (resumeUrl) URL.revokeObjectURL(resumeUrl);
        };
    }, [resumeUrl]);

    const handleRefresh = () => {
        fetchResume(true);
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const toastId = toast.loading("Uploading resume...");

            await uploadResume(file, sessionId);
            toast.success("Resume uploaded!", { id: toastId });

            // Generate questions
            const analyzeToastId = toast.loading("Analyzing resume...");
            await analyzeResumeAndGenerateQuestions(null, sessionId);
            toast.success("Ready!", { id: analyzeToastId });

            // Refresh view
            window.dispatchEvent(new Event('resume-analyzed'));
        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    if (!isHost && error) return (
        <div className="h-full flex flex-col bg-gray-900 text-white border-r border-gray-700 w-full font-sans items-center justify-center">
            <p className="text-gray-500 text-sm">No resume available</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white border-r border-gray-700 w-full font-sans">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileTextIcon className="size-4 text-blue-400" />
                    Resume Preview
                </h3>
                {isHost && (
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="Refresh resume"
                    >
                        <RefreshCwIcon className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>

            <div className="flex-1 bg-gray-900 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        Loading resume...
                    </div>
                )}

                {error && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        <FileTextIcon className="size-10 text-gray-600 mb-3" />
                        <p className="text-gray-400 text-sm mb-4">{error}</p>
                        
                        {isHost && (
                            <p className="text-gray-500 text-xs mb-4">
                                Waiting for candidate to upload resume...
                                <br />
                                <span className="text-gray-600">(Auto-refreshing every 10s)</span>
                            </p>
                        )}

                        {isHost && (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <RefreshCwIcon className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    Refresh Now
                                </button>
                                <span className="text-gray-600 text-xs">or</span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".pdf,.docx,.txt"
                                    onChange={handleUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                                    disabled={uploading}
                                >
                                    {uploading ? <Loader2Icon className="animate-spin size-4" /> : <UploadIcon className="size-4" />}
                                    Upload Resume
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {resumeUrl && !loading && (
                    <iframe
                        src={resumeUrl}
                        className="w-full h-full border-none bg-white"
                        title="Resume PDF"
                    />
                )}
            </div>
        </div>
    );
};

export default ResumePreviewPanel;
