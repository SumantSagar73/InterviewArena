import { useState } from "react";
import {
    BotIcon,
    LightbulbIcon,
    LockIcon,
    SparklesIcon,
    ThumbsUpIcon,
    Loader2Icon,
    ChevronDownIcon,
    ChevronUpIcon
} from "lucide-react";
import {
    useAnalyzeCode,
    useGenerateHint,
    useToggleAIAnalyzerVote,
    useEnableAIAnalyzer
} from "../hooks/useAI";

function AIAnalyzerPanel({
    session,
    isHost,
    currentCode,
    language,
    userClerkId,
    problemDescription,
    mode = "session",
    variant = "panel", // "panel" or "miniscreen"
    onClose
}) {
    const [analysis, setAnalysis] = useState("");
    const [showHints, setShowHints] = useState(true);
    const [soloHints, setSoloHints] = useState([]);
    const [isMinimized, setIsMinimized] = useState(false);

    const isSolo = mode === "solo";
    const isMiniscreen = variant === "miniscreen";

    const analyzeCodeMutation = useAnalyzeCode();
    const generateHintMutation = useGenerateHint(session?._id);
    const toggleVoteMutation = useToggleAIAnalyzerVote(session?._id);
    const enableAnalyzerMutation = useEnableAIAnalyzer(session?._id);

    const hasJoined = !!session?.participant;
    const totalParticipantsNeeded = hasJoined ? 2 : 1;
    const currentVotes = session?.analyzerVotes?.length || 0;
    const hasVoted = session?.analyzerVotes?.includes(userClerkId);
    const isEnabled = isSolo || session?.isAnalyzerEnabled;

    const hints = isSolo ? soloHints : (session?.hints || []);

    const handleAnalyze = () => {
        analyzeCodeMutation.mutate(
            {
                sessionId: isSolo ? null : session?._id,
                code: currentCode,
                language,
                problemTitle: isSolo ? "Solo Practice" : session?.problem,
            },
            {
                onSuccess: (data) => {
                    setAnalysis(data.analysis);
                    if (isMiniscreen) setIsMinimized(false);
                },
            }
        );
    };

    const handleGenerateHint = () => {
        generateHintMutation.mutate(
            {
                sessionId: isSolo ? null : session?._id,
                problemTitle: isSolo ? "Solo Practice" : session?.problem,
                currentHintsCount: hints.length,
                code: currentCode,
                language,
                problemDescription,
                previousHints: hints,
            },
            {
                onSuccess: (data) => {
                    if (isSolo) {
                        setSoloHints(prev => [...prev, data.hint]);
                    }
                    if (isMiniscreen) setIsMinimized(false);
                },
            }
        );
    };

    if (isMiniscreen) {
        return (
            <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isMinimized ? 'w-12 h-12' : 'w-80 max-h-[500px]'}`}>
                <div className={`bg-base-100 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-full ${isMinimized ? 'items-center justify-center' : ''}`}>
                    {/* Compact Header */}
                    <div
                        className={`bg-primary p-3 flex items-center justify-between cursor-pointer ${isMinimized ? 'w-full h-full justify-center rounded-2xl' : ''}`}
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="flex items-center gap-2">
                            <BotIcon className="size-5 text-white" />
                            {!isMinimized && <span className="text-xs font-black text-white uppercase tracking-widest">AI Assistant</span>}
                        </div>
                        {!isMinimized && (
                            <div className="flex items-center gap-2">
                                {isSolo && <span className="badge badge-sm bg-white/20 border-none text-[8px] text-white">SOLO</span>}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose?.();
                                    }}
                                    className="hover:scale-110 transition-transform"
                                >
                                    <ChevronDownIcon className="size-4 text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {!isMinimized && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                            {/* MINI HINTS */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-[10px] text-white/50 uppercase tracking-widest">
                                        <LightbulbIcon className="size-3 text-warning" />
                                        <span>Hints</span>
                                    </div>
                                    <span className="badge badge-xs bg-base-300 border-white/5 text-[8px]">{hints.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {hints.slice(-2).map((hint, i) => (
                                        <div key={i} className="bg-warning/5 text-warning border border-warning/10 rounded-lg p-3 text-xs leading-relaxed font-medium">
                                            {hint}
                                        </div>
                                    ))}
                                    {(isHost || isSolo) && (
                                        <button
                                            onClick={handleGenerateHint}
                                            disabled={generateHintMutation.isPending}
                                            className="btn btn-warning btn-xs btn-outline w-full gap-2 rounded-lg font-bold border-warning/20"
                                        >
                                            {generateHintMutation.isPending ? <Loader2Icon className="size-3 animate-spin" /> : <SparklesIcon className="size-3" />}
                                            Get Hint
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-white/5"></div>

                            {/* MINI ANALYZER */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 font-bold text-[10px] text-white/50 uppercase tracking-widest">
                                    <BotIcon className="size-3 text-primary" />
                                    <span>Analysis</span>
                                </div>
                                {!isEnabled ? (
                                    <div className="bg-base-200/50 rounded-xl p-3 border border-white/5">
                                        <p className="text-[10px] text-white/40 font-bold text-center">Locked: Requires Consensus</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={analyzeCodeMutation.isPending}
                                            className="btn btn-primary btn-sm w-full rounded-lg font-black gap-2"
                                        >
                                            {analyzeCodeMutation.isPending ? <Loader2Icon className="size-3 animate-spin" /> : <SparklesIcon className="size-3" />}
                                            Analyze Code
                                        </button>
                                        {analysis && (
                                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-white/80 leading-relaxed font-medium">
                                                {analysis}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-base-100 flex flex-col border-l border-white/5">
            <div className="px-5 py-4 bg-primary text-white flex items-center justify-between font-black uppercase tracking-widest text-xs">
                <div className="flex items-center gap-2">
                    <BotIcon className="size-4" />
                    <span>AI Assistant</span>
                </div>
                {isSolo && <span className="badge badge-sm bg-white/20 border-none text-[10px]">SOLO MODE</span>}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                {/* HINTS SECTION */}
                <div className="space-y-4">
                    <div
                        className="flex items-center justify-between cursor-pointer group"
                        onClick={() => setShowHints(!showHints)}
                    >
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <LightbulbIcon className="size-4 text-warning" />
                            <span className="text-white">Problem Hints</span>
                            <span className="badge badge-sm bg-base-300 border-white/5 text-[10px]">{hints.length}</span>
                        </div>
                        {showHints ? <ChevronUpIcon className="size-4 opacity-30" /> : <ChevronDownIcon className="size-4 opacity-30" />}
                    </div>

                    {showHints && (
                        <div className="space-y-3">
                            {hints.length === 0 ? (
                                <div className="bg-base-200/50 rounded-xl p-4 border border-white/5 text-center">
                                    <p className="text-xs text-white/30 font-medium">No hints generated yet.</p>
                                </div>
                            ) : (
                                hints.map((hint, i) => (
                                    <div key={i} className="animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="bg-warning/5 text-warning border border-warning/10 rounded-xl p-4 text-sm leading-relaxed font-medium">
                                            {hint}
                                        </div>
                                    </div>
                                ))
                            )}

                            {(isHost || isSolo) && (
                                <button
                                    onClick={handleGenerateHint}
                                    disabled={generateHintMutation.isPending}
                                    className="btn btn-warning btn-sm btn-outline w-full gap-2 rounded-xl font-bold border-warning/20 hover:bg-warning/10"
                                >
                                    {generateHintMutation.isPending ? (
                                        <Loader2Icon className="size-3.5 animate-spin" />
                                    ) : (
                                        <SparklesIcon className="size-3.5" />
                                    )}
                                    Get AI Hint
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-px bg-white/5"></div>

                {/* CODE ANALYZER SECTION */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <BotIcon className="size-4 text-primary" />
                        <span className="text-white">Code Analyzer</span>
                    </div>

                    {!isEnabled ? (
                        <div className="bg-base-200/50 rounded-2xl p-5 border border-white/5 space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-base-300 flex items-center justify-center border border-white/5">
                                    <LockIcon className="size-6 opacity-20" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-white">Analyzer Locked</p>
                                    <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider mt-0.5">Requires Consensus</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                                    <span>Progress</span>
                                    <span>{currentVotes}/{totalParticipantsNeeded} votes</span>
                                </div>
                                <progress
                                    className="progress progress-primary w-full h-1.5 rounded-full"
                                    value={currentVotes}
                                    max={totalParticipantsNeeded}
                                ></progress>

                                <button
                                    onClick={() => toggleVoteMutation.mutate()}
                                    disabled={toggleVoteMutation.isPending}
                                    className={`btn btn-sm w-full gap-2 rounded-xl font-bold transition-all ${hasVoted ? 'btn-success text-white' : 'btn-outline border-white/10'}`}
                                >
                                    <ThumbsUpIcon className={`size-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                                    {hasVoted ? 'Ready' : 'Vote to Enable AI'}
                                </button>

                                {isHost && currentVotes >= totalParticipantsNeeded && (
                                    <button
                                        onClick={() => enableAnalyzerMutation.mutate()}
                                        disabled={enableAnalyzerMutation.isPending}
                                        className="btn btn-primary btn-sm w-full rounded-xl font-black animate-pulse shadow-lg shadow-primary/20"
                                    >
                                        {enableAnalyzerMutation.isPending ? (
                                            <Loader2Icon className="size-3.5 animate-spin" />
                                        ) : (
                                            <SparklesIcon className="size-3.5" />
                                        )}
                                        Activate Analyzer
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzeCodeMutation.isPending}
                                className="btn btn-primary w-full h-12 rounded-xl font-black gap-2 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {analyzeCodeMutation.isPending ? (
                                    <Loader2Icon className="size-5 animate-spin" />
                                ) : (
                                    <SparklesIcon className="size-5" />
                                )}
                                Analyze My Code
                            </button>

                            {analysis && (
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center gap-2">
                                        <div className="size-1.5 bg-primary rounded-full animate-pulse"></div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">AI Observation</p>
                                    </div>
                                    <div className="text-sm text-white/80 leading-relaxed font-medium whitespace-pre-wrap">
                                        {analysis}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AIAnalyzerPanel;
