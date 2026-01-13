
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import Navbar from "../components/Navbar";
import { useChatInterview, useGenerateInterviewPlan } from "../hooks/useAI";
import { useAudioRecorder, useTextToSpeech, useSpeechToText } from "../hooks/useAudio";
import { audioApi } from "../api/audio";
import {
    SendIcon,
    Loader2Icon,
    BotIcon,
    UserIcon,
    FileTextIcon,
    PlayIcon,
    CodeIcon,
    MessageSquareIcon,
    SparklesIcon,
    StopCircleIcon,
    MicIcon,
    MicOffIcon,
    Volume2Icon,
    VolumeXIcon
} from "lucide-react";

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import toast from "react-hot-toast";
import { executeCode } from "../lib/piston";

const INITIAL_GREETING = "I'm ready to interview you. Please paste your resume to begin.";

function AIInterviewPage() {
    // STATE: SETUP vs INTERVIEW
    const [hasStarted, setHasStarted] = useState(false);
    const [resumeText, setResumeText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // TOPICS STATE
    const [topics, setTopics] = useState([]); // Start empty, user defines
    const [customTopicsText, setCustomTopicsText] = useState("");
    const [newTopicName, setNewTopicName] = useState("");
    const [currentTopicId, setCurrentTopicId] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [report, setReport] = useState(null);
    const [showReport, setShowReport] = useState(false);

    // STATE: CHAT
    const [messages, setMessages] = useState([]);

    // STATE: CODE EDITOR
    const [code, setCode] = useState("// Write your code here...");
    const [language, setLanguage] = useState("javascript");
    const [output, setOutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);

    // HOOKS
    const chatMutation = useChatInterview();
    const generatePlanMutation = useGenerateInterviewPlan();

    // AUDIO HOOKS
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();

    // LIVE SPEECH TO TEXT HOOK
    const {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript
    } = useSpeechToText(useCallback((finalText) => {
        // We sync the transcript to a local state for editing
        setEditableTranscript(prev => prev + (prev ? " " : "") + finalText);
    }, []));

    const { isPlaying, speak, stop: stopSpeaking } = useTextToSpeech(useCallback(() => {
        // Automatically start listening when AI finishes speaking (Hands-Free)
        resetTranscript();
        setEditableTranscript("");
        startListening();
    }, [startListening, resetTranscript]));

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isTestingMic, setIsTestingMic] = useState(false);
    const [testAudioUrl, setTestAudioUrl] = useState(null);
    const [isMicTested, setIsMicTested] = useState(false);

    // UI Local States
    const [editableTranscript, setEditableTranscript] = useState("");



    const handleAddTopic = () => {
        if (!newTopicName.trim()) return;
        const id = `custom-${Date.now()}`;
        setTopics(prev => [
            ...prev.slice(0, -1), // Add before Wrap-up
            { id, name: newTopicName, type: 'discussion', status: 'pending', description: 'User-provided topic' },
            prev[prev.length - 1]
        ]);
        setNewTopicName("");
        toast.success(`Topic "${newTopicName}" added!`);
    };

    const handleRemoveTopic = (id) => {
        setTopics(prev => prev.filter(t => t.id !== id));
    };

    const toggleTopicType = (id) => {
        setTopics(prev => prev.map(t =>
            t.id === id ? { ...t, type: t.type === 'coding' ? 'discussion' : 'coding' } : t
        ));
    };

    const handleTopicSwitch = (topicId) => {
        if (topicId === currentTopicId) return;

        // Mark current as completed, new as active
        setTopics(prev => prev.map(t => {
            if (t.id === currentTopicId) return { ...t, status: 'completed' };
            if (t.id === topicId) return { ...t, status: 'active' };
            return t;
        }));
        setCurrentTopicId(topicId);

        const targetTopic = topics.find(t => t.id === topicId) || topics[0];

        // Notify AI of topic switch
        const switchMsg = `USER_ACTION: Switched to topic "${targetTopic.name}". INSTRUCTIONS: Acknowledge the switch and proceed with questions related to this topic.`;

        handleSendMessage(switchMsg, true); // True to indicate a system/silent switch
    };

    const handleEndInterview = async () => {
        if (!confirm("Are you sure you want to end the interview? This will generate your final report.")) return;

        setIsReporting(true);
        toast.loading("Analyzing your performance and generating report...", { id: 'reporting' });

        try {
            // Get report from backend
            const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/interview/report`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({
                    messages,
                    topics,
                    resumeText,
                    code
                })
            });

            const data = await response.json();
            if (response.ok) {
                setReport(data.report);
                setShowReport(true);
                toast.success("Report generated!", { id: 'reporting' });
            } else {
                throw new Error(data.message || "Failed to generate report");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate report. Returning to setup.", { id: 'reporting' });
            setHasStarted(false);
        } finally {
            setIsReporting(false);
        }
    };

    const handleStartInterview = () => {
        if (!resumeText.trim() && !customTopicsText.trim()) {
            toast.error("Please provide your resume or at least one topic to focus on.");
            return;
        }

        if (!isMicTested) {
            toast.error("Please test your microphone before starting the interview.", { icon: "🎤" });
            return;
        }

        // Parse custom topics if provided
        let finalTopics = [...topics];
        if (customTopicsText.trim()) {
            const parsedLines = customTopicsText.split('\n').filter(l => l.trim());
            const parsedTopics = parsedLines.map((line, i) => ({
                id: `user-${i}-${Date.now()}`,
                name: line.trim(),
                type: line.toLowerCase().includes('code') || line.toLowerCase().includes('coding') || line.toLowerCase().includes('problem') ? 'coding' : 'discussion',
                status: 'pending'
            }));

            // Add Intro/Wrap if not manually defined by user
            const hasIntro = parsedLines.some(l => l.toLowerCase().includes('intro'));
            const hasWrap = parsedLines.some(l => l.toLowerCase().includes('wrap') || l.toLowerCase().includes('close'));

            if (!hasIntro) parsedTopics.unshift({ id: 'intro', name: 'Introduction', type: 'discussion', status: 'pending' });
            if (!hasWrap) parsedTopics.push({ id: 'wrap', name: 'Final Wrap-up', type: 'discussion', status: 'pending' });

            finalTopics = parsedTopics;
        } else if (topics.length === 0) {
            // Default topics if nothing provided
            finalTopics = [
                { id: 'intro', name: 'Introduction', type: 'discussion', status: 'pending' },
                { id: 'tech', name: 'Technical Discussion', type: 'discussion', status: 'pending' },
                { id: 'coding', name: 'Coding Challenge', type: 'coding', status: 'pending' },
                { id: 'behavioral', name: 'Behavioral', type: 'discussion', status: 'pending' },
                { id: 'wrap', name: 'Final Wrap-up', type: 'discussion', status: 'pending' }
            ];
        }

        setTopics(finalTopics);
        setIsAnalyzing(true);
        toast.loading("AI is preparing your interview...", { id: "plan-loading" });

        // Step 1: Generate Plan
        generatePlanMutation.mutate({ resumeText, customTopics: finalTopics }, {
            onSuccess: (planData) => {
                toast.success("AI is ready!", { id: "plan-loading" });

                // Mark first topic as active
                const updatedTopics = finalTopics.map((t, i) => i === 0 ? { ...t, status: 'active' } : t);
                setTopics(updatedTopics);
                setCurrentTopicId(updatedTopics[0].id);

                // Step 2: Start Interview Chat with Context
                const initialMessage = {
                    role: "user",
                    content: `MISSION: Start a professional technical interview.
                    
                    RESUME: ${resumeText || "No resume provided. Focus entirely on the custom topics sequence."}
                    INTERVIEW_TOPICS: ${JSON.stringify(updatedTopics)}
                    CURRENT_TOPIC: ${updatedTopics[0].name}
                    
                    INSTRUCTIONS: 
                    1. ${resumeText ? "Acknowledge a specific highlight from the resume." : "Acknowledge the custom topics the candidate wants to focus on."}
                    2. Provide a warm, professional vocal greeting for the "${updatedTopics[0].name}" phase.
                    3. Introduce yourself briefly.
                    4. Start by asking an appropriate opening question for the current topic.
                    5. Keep this first response very concise (under 50 words).`
                };

                chatMutation.mutate({ messages: [initialMessage] }, {
                    onSuccess: (data) => {
                        setHasStarted(true);
                        setIsAnalyzing(false);
                        const aiReply = { role: "assistant", content: data.reply };
                        setMessages([aiReply]);

                        // Auto-play introduction
                        setTimeout(() => speak(data.reply), 800);
                    },
                    onError: () => {
                        toast.error("Failed to start chat session.");
                        setIsAnalyzing(false);
                    }
                });
            },
            onError: (err) => {
                toast.error("Failed to prepare interview.");
                console.error(err);
                setIsAnalyzing(false);
            }
        });
    };

    const handleSendMessage = (messageText, isTopicSwitch = false) => {
        if (!messageText || !messageText.trim()) return;

        const userMsg = { role: "user", content: messageText };
        const newHistory = [...messages, userMsg];

        if (!isTopicSwitch) {
            setMessages(newHistory);
        }
        setEditableTranscript("");
        resetTranscript();

        const activeTopicName = topics.find(t => t.id === currentTopicId)?.name || "";

        chatMutation.mutate({ messages: newHistory, currentTopic: activeTopicName }, {
            onSuccess: (data) => {
                const aiReply = { role: "assistant", content: data.reply };
                setMessages(prev => [...prev, aiReply]);
                setTimeout(() => speak(data.reply), 500);
            },
            onError: (err) => {
                toast.error("AI failed to respond. Please try again.");
                console.error(err);
            }
        });
    };

    const handleMicClick = async () => {
        if (isListening) {
            // User manually stopped speaking
            stopListening();
        } else {
            // START LISTENING
            stopSpeaking(); // Stop AI if speaking
            resetTranscript();
            setEditableTranscript(""); // Clear any previous editable text
            startListening();
        }
    };

    const handleTestMic = async () => {
        if (isTestingMic) {
            const blob = await stopRecording();
            setIsTestingMic(false);
            if (blob) {
                const url = URL.createObjectURL(blob);
                setTestAudioUrl(url);
                const audio = new Audio(url);
                toast.success("Mic verified! Starting playback test...", { id: "mic-test" });
                audio.play();
                setIsMicTested(true);
            }
        } else {
            setTestAudioUrl(null);
            setIsTestingMic(true);
            await startRecording();
            toast.loading("Recording for 3 seconds...", { id: "mic-test" });

            setTimeout(async () => {
                // Auto stop if still recording after 3s
                if (isRecording) { // Check if still recording (user didn't manually stop)
                    const blob = await stopRecording();
                    setIsTestingMic(false);
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        setTestAudioUrl(url);
                        const audio = new Audio(url);
                        toast.success("Mic verified! Starting playback test...", { id: "mic-test" });
                        audio.play();
                        setIsMicTested(true);
                    } else {
                        toast.error("Failed to record audio.", { id: "mic-test" });
                    }
                }
            }, 3000); // Record for 3 seconds
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === "application/pdf") {
            try {
                toast.loading("Parsing PDF...", { id: "pdf-toast" });
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(" ");
                    fullText += pageText + "\n";
                }

                setResumeText(fullText);
                toast.success("PDF Resume parsed successfully!", { id: "pdf-toast" });
            } catch (error) {
                console.error("PDF Parse Error:", error);
                toast.error("Failed to parse PDF", { id: "pdf-toast" });
            }
        } else {
            // Text/MD files
            const reader = new FileReader();
            reader.onload = (event) => {
                setResumeText(event.target.result);
                toast.success("Resume loaded!");
            };
            reader.readAsText(file);
        }
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput(null);

        try {
            const result = await executeCode(language, code);
            setOutput(result);
        } catch (error) {
            setOutput({ success: false, error: "Execution failed" });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-base-300 font-sans">
            <Navbar />

            {!hasStarted ? (
                // SETUP SCREEN
                <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-base-100 to-base-300">
                    <div className="card bg-base-100 shadow-2xl border border-white/5 max-w-4xl w-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-primary via-secondary to-accent animate-gradient-x"></div>
                        <div className="card-body p-10">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="size-20 rounded-2xl bg-base-200 flex items-center justify-center border border-white/5 shadow-inner">
                                    <BotIcon className="size-10 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black text-white tracking-tight">AI Technical Interviewer</h1>
                                    <p className="text-white/50 text-lg font-medium mt-1">
                                        Powered by ElevenLabs & Whisper
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-black uppercase tracking-widest text-xs text-white/40">Upload or Paste Resume</span>
                                        </label>
                                        <textarea
                                            className="textarea textarea-bordered h-64 w-full font-mono text-sm leading-relaxed custom-scrollbar bg-base-300/50 focus:border-primary transition-all"
                                            placeholder="Paste your resume content here..."
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".txt,.md,.pdf"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <button className="btn btn-outline btn-sm gap-2 normal-case font-bold hover:bg-primary/10">
                                                <FileTextIcon className="size-4" /> Upload Document
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">.pdf, .txt, .md</p>
                                    </div>

                                    {/* CUSTOM TOPICS SECTION */}
                                    <div className="pt-8 space-y-4">
                                        <label className="label pt-0">
                                            <span className="label-text font-black uppercase tracking-widest text-xs text-secondary/60">Topics to Focus (Optional)</span>
                                        </label>
                                        <textarea
                                            className="textarea textarea-bordered h-40 w-full font-bold text-xs leading-relaxed custom-scrollbar bg-base-300/40 focus:border-secondary transition-all"
                                            placeholder="Paste topics or questions you want to cover (one per line)...&#10;Example:&#10;System Design Component Selection&#10;React Hooks Deep Dive&#10;Binary Tree Level Order Traversal"
                                            value={customTopicsText}
                                            onChange={(e) => setCustomTopicsText(e.target.value)}
                                        ></textarea>
                                        <p className="text-[10px] text-white/20 italic font-medium px-1">Tip: Type "Coding" or "Problem" in a line to enable the code editor for that topic.</p>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between bg-base-200/30 rounded-2xl p-6 border border-white/5">
                                    <div className="space-y-6">
                                        <div className="flex gap-4">
                                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <SparklesIcon className="size-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">Dynamic AI Guidance</h3>
                                                <p className="text-sm text-white/50">Questions are synthesized from your resume and custom topics.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="size-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                                                <Volume2Icon className="size-5 text-secondary" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">Interactive Voice</h3>
                                                <p className="text-sm text-white/50">Speak naturally. The AI understands and speaks back in real-time.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                                <FileTextIcon className="size-5 text-accent" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">Post-Interview Report</h3>
                                                <p className="text-sm text-white/50">Get a detailed analysis of your performance at the end.</p>
                                            </div>
                                        </div>

                                        {/* MIC TEST */}
                                        <div className="p-4 bg-base-300/50 rounded-xl border border-white/5 flex items-center justify-between group/mic">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-3 rounded-full transition-all duration-500 ${isTestingMic ? 'bg-error animate-ping' : isMicTested ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`}></div>
                                                <div>
                                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${isMicTested ? 'text-success' : 'text-white/30'}`}>
                                                        {isMicTested ? 'Mic Verified' : 'Mic Check Required'}
                                                    </h4>
                                                    <p className="text-xs text-white/50 font-medium">Verify your audio stream.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleTestMic}
                                                className={`btn btn-sm ${isTestingMic ? 'btn-error' : isMicTested ? 'btn-success btn-outline' : 'btn-neutral'} gap-2 rounded-lg font-bold transition-all`}
                                            >
                                                {isTestingMic ? <MicOffIcon className="size-4" /> : isMicTested ? <Volume2Icon className="size-4" /> : <MicIcon className="size-4" />}
                                                {isTestingMic ? "Stop" : isMicTested ? "Retest" : "Test Mic"}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleStartInterview}
                                        disabled={isAnalyzing || (!resumeText.trim() && !customTopicsText.trim())}
                                        className={`btn w-full btn-lg font-black uppercase tracking-widest shadow-xl mt-8 group rounded-xl transition-all ${isMicTested ? 'btn-primary shadow-primary/20' : 'btn-ghost bg-white/5 text-white/20 border-white/5 cursor-not-allowed'}`}
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2Icon className="animate-spin" /> Preparing Room...
                                            </>
                                        ) : !isMicTested ? (
                                            "Verify Audio to Start"
                                        ) : (
                                            <>
                                                Start Mock Interview <PlayIcon className="size-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // INTERVIEW INTERFACE
                <div className="flex-1 overflow-hidden flex animate-in fade-in duration-500 bg-[#0a0a0c]">
                    <PanelGroup direction="horizontal">
                        {/* LEFT: TOPICS SIDEBAR */}
                        <Panel defaultSize={20} minSize={15} className="bg-[#0f0f12] border-r border-white/5 flex flex-col">
                            <div className="p-6 border-b border-white/5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Interview</h3>
                                <h2 className="text-lg font-black text-white">Curriculum</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                                {topics.map((topic, index) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => handleTopicSwitch(topic.id)}
                                        className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all border ${topic.status === 'active'
                                            ? 'bg-secondary/10 border-secondary/30 shadow-lg shadow-secondary/5'
                                            : topic.status === 'completed'
                                                ? 'bg-base-300/30 border-white/5 opacity-60'
                                                : 'bg-transparent border-transparent hover:bg-white/5'
                                            }`}
                                    >
                                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${topic.status === 'active' ? 'bg-secondary text-white' :
                                            topic.status === 'completed' ? 'bg-success/20 text-success' : 'bg-base-300 text-white/20'
                                            }`}>
                                            {topic.status === 'completed' ? "✓" : index + 1}
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className={`text-xs font-bold truncate ${topic.status === 'active' ? 'text-white' : 'text-white/40'}`}>{topic.name}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-white/20 font-black">{topic.type}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Panel>

                        <PanelResizeHandle className="w-1 bg-[#151518] hover:bg-secondary/50 transition-colors cursor-col-resize" />

                        {/* CENTER: VOICE INTERFACE */}
                        <Panel defaultSize={topics.find(t => t.id === currentTopicId)?.type === 'coding' ? 40 : 80} minSize={30}>
                            <div className="h-full flex flex-col bg-base-200/50 relative overflow-hidden">
                                {/* AI Background Glow */}
                                <div className={`absolute inset-0 transition-all duration-1000 opacity-20 ${isPlaying ? 'bg-primary/20 scale-110' : isListening ? 'bg-secondary/20 scale-105' : 'bg-transparent'}`}></div>

                                {/* Header */}
                                <div className="p-6 flex items-center justify-between z-10 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-secondary animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black italic">Active Phase:</span>
                                            <span className="text-xs font-black text-white uppercase tracking-wider">{topics.find(t => t.id === currentTopicId)?.name}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleEndInterview}
                                        className="btn btn-ghost btn-xs text-white/20 hover:text-error font-black uppercase tracking-widest transition-colors scale-90"
                                    >
                                        End Session & Generate Report
                                    </button>
                                </div>

                                {/* Central Vocal Interface */}
                                <div className="flex-1 flex flex-col items-center justify-center p-12 z-10">
                                    {/* AI Avatar / Pulse */}
                                    <div className="relative mb-12">
                                        <div className={`absolute inset-0 rounded-full border border-primary/20 transition-all duration-500 scale-[2.5] ${isPlaying ? 'animate-ping' : 'opacity-0'}`}></div>
                                        <div className={`absolute inset-0 rounded-full border border-primary/10 transition-all duration-700 scale-[3.5] ${isPlaying ? 'animate-ping delay-300' : 'opacity-0'}`}></div>

                                        <div className={`size-48 rounded-full flex items-center justify-center transition-all duration-700 relative z-20 overflow-hidden shadow-2xl ${isPlaying ? 'bg-primary/20 scale-110 border-primary shadow-primary/20' :
                                            isListening ? 'bg-secondary/20 scale-105 border-secondary shadow-secondary/20' :
                                                'bg-base-300 border-white/5'
                                            } border-2`}>
                                            {isPlaying ? (
                                                <div className="flex gap-1 items-end h-12">
                                                    {[...Array(5)].map((_, i) => (
                                                        <div key={i} className="w-2 bg-primary rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 80}%` }}></div>
                                                    ))}
                                                </div>
                                            ) : isListening ? (
                                                <div className="relative">
                                                    <MicIcon className="size-16 text-secondary animate-pulse" />
                                                    <div className="absolute -inset-4 rounded-full border-2 border-secondary/20 animate-ping"></div>
                                                </div>
                                            ) : (
                                                <BotIcon className="size-16 text-white/10" />
                                            )}

                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                        </div>
                                    </div>

                                    {/* Status Messaging & Live Transcript */}
                                    <div className="text-center space-y-6 w-full max-w-md">
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                                                {isPlaying ? "AI is Speaking..." : isListening ? "Listening..." : isTranscribing ? "Processing..." : chatMutation.isPending ? "AI Thinking..." : "Room Active"}
                                            </h2>
                                            <p className="text-white/30 font-bold text-[10px] uppercase tracking-[0.3em]">
                                                Current Segment: {topics.find(t => t.id === currentTopicId)?.name}
                                            </p>
                                        </div>

                                        <div className={`space-y-4 transition-all duration-500 ${isListening || editableTranscript || interimTranscript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                            <div className="relative">
                                                <textarea
                                                    className="w-full min-h-[140px] p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl text-sm font-medium leading-relaxed resize-none focus:outline-none focus:border-secondary/30 custom-scrollbar text-white placeholder:text-white/5 shadow-2xl"
                                                    placeholder="Awaiting your response..."
                                                    spellCheck="false"
                                                    value={isListening ? (editableTranscript + (interimTranscript ? (editableTranscript ? " " : "") + interimTranscript : "")) : editableTranscript}
                                                    onChange={(e) => setEditableTranscript(e.target.value)}
                                                />
                                                {isListening && (
                                                    <div className="absolute top-6 right-6 flex gap-2 items-center">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-80">Live</span>
                                                        <div className="size-1.5 rounded-full bg-secondary animate-pulse"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Control Bar */}
                                <div className="p-12 pt-0 flex items-center justify-center gap-6 z-10">
                                    <button
                                        onClick={handleMicClick}
                                        disabled={isTranscribing || isPlaying || chatMutation.isPending}
                                        className={`size-20 rounded-full flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 border-4 ${isListening ? 'bg-secondary border-secondary/20 shadow-xl shadow-secondary/40 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                                            }`}
                                    >
                                        {isListening ? <MicOffIcon className="size-8" /> : <MicIcon className="size-8" />}
                                    </button>

                                    <button
                                        onClick={() => {
                                            stopListening();
                                            handleSendMessage(editableTranscript || transcript + " " + interimTranscript);
                                        }}
                                        disabled={isPlaying || chatMutation.isPending || (!editableTranscript && !transcript && !interimTranscript)}
                                        className={`h-20 px-10 rounded-full flex items-center gap-5 transition-all duration-500 font-black uppercase tracking-widest border-4 ${(editableTranscript || transcript || interimTranscript) && !isPlaying && !chatMutation.isPending
                                            ? 'bg-primary border-primary/20 shadow-xl shadow-primary/40 text-primary-content hover:scale-105' : 'bg-white/5 border-white/5 text-white/5 cursor-not-allowed'
                                            }`}
                                    >
                                        {chatMutation.isPending ? <Loader2Icon className="size-6 animate-spin" /> : <SendIcon className="size-6" />}
                                        Submit Response
                                    </button>
                                </div>
                            </div>
                        </Panel>

                        {topics.find(t => t.id === currentTopicId)?.type === 'coding' && (
                            <>
                                <PanelResizeHandle className="w-1 bg-[#151518] hover:bg-primary/50 transition-colors cursor-col-resize" />
                                <Panel defaultSize={40} minSize={30}>
                                    <PanelGroup direction="vertical">
                                        <Panel defaultSize={70} minSize={30}>
                                            <CodeEditorPanel
                                                selectedLanguage={language}
                                                code={code}
                                                isRunning={isRunning}
                                                onLanguageChange={(e) => setLanguage(e.target.value)}
                                                onCodeChange={setCode}
                                                onRunCode={handleRunCode}
                                            />
                                        </Panel>
                                        <PanelResizeHandle className="h-1 bg-[#151518] hover:bg-primary/50 transition-colors cursor-row-resize" />
                                        <Panel defaultSize={30} minSize={15}>
                                            <OutputPanel output={output} />
                                        </Panel>
                                    </PanelGroup>
                                </Panel>
                            </>
                        )}
                    </PanelGroup>
                </div>
            )}

            {/* REPORT MODAL */}
            {showReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f0f12] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <SparklesIcon className="size-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Technical Interview Analysis</h2>
                                    <p className="text-white/40 text-xs font-black uppercase tracking-[0.2em] mt-0.5">Comprehensive Feedback Report</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => window.print()}
                                    className="btn btn-ghost btn-sm text-white/40 hover:text-white gap-2 font-bold normal-case"
                                >
                                    <FileTextIcon className="size-4" /> Save as PDF
                                </button>
                                <button
                                    onClick={() => {
                                        setShowReport(false);
                                        setHasStarted(false);
                                        setMessages([]);
                                        setReport(null);
                                    }}
                                    className="btn btn-circle btn-ghost text-white/20 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                            <div className="prose prose-invert prose-blue max-w-none prose-h1:text-4xl prose-h1:font-black prose-h2:text-2xl prose-h2:font-bold prose-h2:text-primary prose-p:text-white/70 prose-li:text-white/70 prose-strong:text-white font-medium">
                                <ReactMarkdown>
                                    {report}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-base-300/30 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BotIcon className="size-5 text-white/20" />
                                <span className="text-xs text-white/20 font-black uppercase tracking-widest">Analysis Engine v2.4</span>
                            </div>
                            <button
                                onClick={() => {
                                    setShowReport(false);
                                    setHasStarted(false);
                                    setMessages([]);
                                    setReport(null);
                                }}
                                className="btn btn-primary px-8 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                            >
                                Start New Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes bounce {
                    0%, 100% { height: 20%; }
                    50% { height: 100%; }
                }
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }
            `}} />
        </div>
    );
}

export default AIInterviewPage;
