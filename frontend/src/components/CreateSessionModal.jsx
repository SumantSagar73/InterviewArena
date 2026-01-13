import { Code2Icon, LoaderIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import { useState } from "react";

function CreateSessionModal({
  isOpen,
  onClose,
  roomConfig,
  setRoomConfig,
  onCreateRoom,
  isCreating,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [topicInput, setTopicInput] = useState("");

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setRoomConfig({ ...roomConfig, resumeFile: file });
    }
  };

  const handleAddTopic = () => {
    if (topicInput.trim() && !roomConfig.topics?.includes(topicInput.trim())) {
      setRoomConfig({
        ...roomConfig,
        topics: [...(roomConfig.topics || []), topicInput.trim()],
      });
      setTopicInput("");
    }
  };

  const handleRemoveTopic = (topicToRemove) => {
    setRoomConfig({
      ...roomConfig,
      topics: roomConfig.topics.filter((t) => t !== topicToRemove),
    });
  };

  // Host can create session without resume/topics (they're optional)
  const canCreate = true;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-2xl mb-6">Create New Interview Session</h3>

        <div className="space-y-6">
          {/* RESUME UPLOAD */}
          <div className="space-y-2">
            <label className="label">
              <span className="label-text font-semibold">Upload Resume (Optional)</span>
              <span className="label-text-alt">PDF, DOCX, or TXT</span>
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

              {selectedFile && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{selectedFile.name}</span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setSelectedFile(null);
                      setRoomConfig({ ...roomConfig, resumeFile: null });
                    }}
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="alert alert-info text-sm">
                AI will analyze the resume and generate relevant interview questions
              </div>
            )}
          </div>

          {/* TOPIC SELECTION */}
          <div className="space-y-2">
            <label className="label">
              <span className="label-text font-semibold">Add Interview Topics</span>
              <span className="label-text-alt">AI will generate questions for each topic</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="e.g., React, System Design, Algorithms"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTopic()}
              />
              <button className="btn btn-primary" onClick={handleAddTopic}>
                Add
              </button>
            </div>

            {/* Topics List */}
            {roomConfig.topics && roomConfig.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {roomConfig.topics.map((topic, idx) => (
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

          <div className="alert alert-info">
            <Code2Icon className="size-5" />
            <div>
              <p className="font-semibold">Session Info:</p>
              {selectedFile && (
                <p>
                  Resume: <span className="font-medium">{selectedFile.name}</span>
                </p>
              )}
              {roomConfig.topics && roomConfig.topics.length > 0 ? (
                <p>
                  Topics: <span className="font-medium">{roomConfig.topics.join(", ")}</span>
                </p>
              ) : (
                <p className="text-sm opacity-75">You can start without topics - add them during the interview</p>
              )}
              <p>
                Max Participants: <span className="font-medium">2 (1-on-1 session)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn btn-primary gap-2"
            onClick={onCreateRoom}
            disabled={isCreating || !canCreate}
          >
            {isCreating ? (
              <LoaderIcon className="size-5 animate-spin" />
            ) : (
              <PlusIcon className="size-5" />
            )}

            {isCreating ? "Creating..." : "Create Session"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
export default CreateSessionModal;
