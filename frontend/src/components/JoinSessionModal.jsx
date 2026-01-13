import { LoaderIcon, UploadIcon, XIcon, UserCheckIcon } from "lucide-react";
import { useState } from "react";

function JoinSessionModal({
    isOpen,
    onClose,
    onJoin,
    isJoining,
}) {
    const [code, setCode] = useState("");
    const [resumeFile, setResumeFile] = useState(null);
    const [topicInput, setTopicInput] = useState("");
    const [topics, setTopics] = useState([]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setResumeFile(file);
        }
    };

    const handleAddTopic = () => {
        if (topicInput.trim() && !topics.includes(topicInput.trim())) {
            setTopics([...topics, topicInput.trim()]);
            setTopicInput("");
        }
    };

    const handleRemoveTopic = (topicToRemove) => {
        setTopics(topics.filter((t) => t !== topicToRemove));
    };

    const handleJoin = () => {
        if (!code.trim() || !resumeFile) return;
        onJoin({ code, resumeFile, topics });
    };

    const canJoin = code.trim() && resumeFile;

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl">
                <h3 className="font-bold text-2xl mb-6">Join Interview Session</h3>

                <div className="space-y-6">
                    {/* SESSION CODE */}
                    <div className="space-y-2">
                        <label className="label">
                            <span className="label-text font-semibold">Session Code</span>
                            <span className="label-text-alt text-error">* Required</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="Enter 6-digit code..."
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={6}
                        />
                    </div>

                    {/* RESUME UPLOAD - MANDATORY */}
                    <div className="space-y-2">
                        <label className="label">
                            <span className="label-text font-semibold">Upload Your Resume</span>
                            <span className="label-text-alt text-error">* Required</span>
                        </label>

                        <div className="flex items-center gap-3">
                            <label className="btn btn-outline btn-sm gap-2 cursor-pointer">
                                <UploadIcon className="size-4" />
                                Choose File
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.docx,.txt"
                                    onChange={handleFileChange}
                                />
                            </label>

                            {resumeFile && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{resumeFile.name}</span>
                                    <button
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => setResumeFile(null)}
                                    >
                                        <XIcon className="size-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="alert alert-warning text-sm">
                            <UserCheckIcon className="size-4" />
                            <span>Resume upload is mandatory for interviewees. AI will analyze it to generate relevant questions.</span>
                        </div>
                    </div>

                    {/* TOPIC SELECTION - OPTIONAL */}
                    <div className="space-y-2">
                        <label className="label">
                            <span className="label-text font-semibold">Preferred Topics (Optional)</span>
                            <span className="label-text-alt">Topics you want to be interviewed on</span>
                        </label>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input input-bordered flex-1"
                                placeholder="e.g., JavaScript, Node.js, Databases"
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleAddTopic()}
                            />
                            <button className="btn btn-primary" onClick={handleAddTopic}>
                                Add
                            </button>
                        </div>

                        {/* Topics List */}
                        {topics.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {topics.map((topic, idx) => (
                                    <div key={idx} className="badge badge-lg badge-primary gap-2">
                                        {topic}
                                        <button onClick={() => handleRemoveTopic(topic)}>
                                            <XIcon className="size-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* VALIDATION MESSAGE */}
                    {!canJoin && (
                        <div className="alert alert-error">
                            <span>Please enter session code and upload your resume to continue</span>
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        className="btn btn-primary gap-2"
                        onClick={handleJoin}
                        disabled={isJoining || !canJoin}
                    >
                        {isJoining ? (
                            <LoaderIcon className="size-5 animate-spin" />
                        ) : (
                            <UserCheckIcon className="size-5" />
                        )}

                        {isJoining ? "Joining..." : "Join Interview"}
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
}

export default JoinSessionModal;
