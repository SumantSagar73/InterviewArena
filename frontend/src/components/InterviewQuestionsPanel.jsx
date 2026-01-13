import { useState, useEffect } from "react";
import { BrainIcon, PlusIcon, LoaderIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { getSessionQuestions, addSessionTopics, analyzeResumeAndGenerateQuestions } from "../api/resume";
import toast from "react-hot-toast";

function InterviewQuestionsPanel({ sessionId, isHost }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [newTopic, setNewTopic] = useState("");
    const [addingTopic, setAddingTopic] = useState(false);
    const [difficulty, setDifficulty] = useState("Medium");

    useEffect(() => {
        loadQuestions();

        const handleUpdate = () => {
            console.log("Reloading questions due to resume analysis...");
            loadQuestions();
        };
        window.addEventListener('resume-analyzed', handleUpdate);

        return () => window.removeEventListener('resume-analyzed', handleUpdate);
    }, [sessionId]);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const data = await getSessionQuestions(sessionId);
            setQuestions(data.questions || []);

            // Auto-expand all categories
            const categories = {};
            data.questions?.forEach((q) => {
                categories[q.category] = true;
            });
            setExpandedCategories(categories);
        } catch (error) {
            console.error("Error loading questions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTopic = async () => {
        if (!newTopic.trim() || !isHost) return;

        try {
            setAddingTopic(true);
            await addSessionTopics(sessionId, [newTopic.trim()]);
            await analyzeResumeAndGenerateQuestions(null, sessionId, [newTopic.trim()], difficulty);

            toast.success("Topic added! Generating questions...");
            setNewTopic("");

            // Reload questions
            setTimeout(loadQuestions, 2000);
        } catch (error) {
            console.error("Error adding topic:", error);
            toast.error("Failed to add topic");
        } finally {
            setAddingTopic(false);
        }
    };

    const toggleCategory = (category) => {
        setExpandedCategories({
            ...expandedCategories,
            [category]: !expandedCategories[category],
        });
    };

    // Group questions by category
    const questionsByCategory = questions.reduce((acc, q) => {
        const category = q.category || "general";
        if (!acc[category]) acc[category] = [];
        acc[category].push(q);
        return acc;
    }, {});

    const categories = Object.keys(questionsByCategory);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-base-200">
                <LoaderIcon className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-base-200">
            <div className="p-4 bg-base-100 border-b border-base-300">
                <div className="flex items-center gap-2 mb-3">
                    <BrainIcon className="size-5 text-primary" />
                    <h2 className="text-lg font-bold">AI Interview Questions</h2>
                </div>

                {/* Add Topic (Host Only) */}
                {isHost && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input input-sm input-bordered flex-1"
                            placeholder="Add new topic..."
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddTopic()}
                        />
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={handleAddTopic}
                            disabled={addingTopic || !newTopic.trim()}
                        >
                            {addingTopic ? (
                                <LoaderIcon className="size-4 animate-spin" />
                            ) : (
                                <PlusIcon className="size-4" />
                            )}
                        </button>
                        <select
                            className="select select-sm select-bordered w-24"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {categories.length === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                        <BrainIcon className="size-12 mx-auto mb-2 opacity-50" />
                        <p>No questions generated yet</p>
                        {isHost && <p className="text-sm">Add topics to generate questions</p>}
                    </div>
                ) : (
                    categories.map((category) => (
                        <div key={category} className="collapse collapse-arrow bg-base-100">
                            <input
                                type="checkbox"
                                checked={expandedCategories[category] || false}
                                onChange={() => toggleCategory(category)}
                            />
                            <div className="collapse-title font-medium capitalize flex items-center gap-2">
                                <span className="badge badge-primary badge-sm">
                                    {questionsByCategory[category].length}
                                </span>
                                {category.replace("-", " ")}
                            </div>
                            <div className="collapse-content">
                                <div className="space-y-3 pt-2">
                                    {questionsByCategory[category].map((q, idx) => (
                                        <div key={idx} className="p-3 bg-base-200 rounded-lg">
                                            <p className="text-sm font-medium">{q.question}</p>
                                            {q.topic && (
                                                <div className="mt-2">
                                                    <span className="badge badge-sm badge-outline">{q.topic}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default InterviewQuestionsPanel;
