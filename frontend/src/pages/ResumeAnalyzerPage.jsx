import { useState } from "react";
import Navbar from "../components/Navbar";
import { useAnalyzeResume } from "../hooks/useAI";
import {
    FileTextIcon,
    Loader2Icon,
    SparklesIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    UploadIcon,
    FlameIcon,
    LightbulbIcon,
    TargetIcon,
    MessageSquareIcon,
    BookOpenIcon,
    CopyIcon,
    ClockIcon
} from "lucide-react";
import toast from "react-hot-toast";
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function ResumeAnalyzerPage() {
    const [resumeText, setResumeText] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const analyzeResumeMutation = useAnalyzeResume();

    const handleAnalyze = () => {
        if (!resumeText.trim()) return;
        analyzeResumeMutation.mutate(
            { resumeText, jobDescription },
            {
                onSuccess: (data) => setAnalysis(data.analysis),
            }
        );
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

    return (
        <div className="min-h-screen bg-base-300">
            <Navbar />

            <div className="container mx-auto px-6 py-12 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl transform -rotate-3 border border-white/10">
                            <FileTextIcon className="size-9 text-white" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter text-white">Arena Resume <span className="text-primary italic">Insight</span></h1>
                            <p className="text-base-content/60 font-medium text-lg">AI-powered career matching & gap analysis</p>
                        </div>
                    </div>
                    {analysis && (
                        <button
                            onClick={() => { setAnalysis(null); setResumeText(""); setJobDescription(""); }}
                            className="btn btn-ghost btn-sm text-white/40 hover:text-white font-bold uppercase tracking-widest"
                        >
                            Reset Analysis
                        </button>
                    )}
                </div>

                {!analysis ? (
                    <div className="grid lg:grid-cols-5 gap-10">
                        {/* LEFT: INPUT AREA (2/5 columns) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card bg-base-100 shadow-2xl border border-white/5 overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-primary to-secondary"></div>
                                <div className="card-body p-8">
                                    <h2 className="text-sm font-black uppercase text-primary tracking-[0.2em] mb-6 flex items-center gap-3">
                                        <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                                        Your Resume
                                    </h2>
                                    <textarea
                                        className="textarea textarea-bordered h-[350px] w-full font-mono text-sm focus:border-primary transition-all bg-base-300/30 border-white/10 custom-scrollbar leading-relaxed"
                                        placeholder="Paste your resume text here (Markdown or Plain Text)..."
                                        value={resumeText}
                                        onChange={(e) => setResumeText(e.target.value)}
                                    ></textarea>

                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".txt,.md,.pdf"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <button className="btn btn-outline btn-sm gap-2 normal-case font-bold">
                                                <FileTextIcon className="size-4" /> Upload PDF/Text
                                            </button>
                                        </div>
                                        <p className="text-xs text-white/30 italic">Supports .pdf, .txt, .md</p>
                                    </div>

                                    <div className="divider my-8 text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">Job Matching</div>

                                    <h2 className="text-sm font-black uppercase text-secondary tracking-[0.2em] mb-6 flex items-center gap-3">
                                        <span className="size-2 bg-secondary rounded-full"></span>
                                        Job Description
                                    </h2>
                                    <textarea
                                        className="textarea textarea-bordered h-[250px] w-full font-mono text-sm focus:border-secondary transition-all bg-base-300/30 border-white/10 custom-scrollbar leading-relaxed"
                                        placeholder="Paste the job requirements to see how you match (Optional)..."
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                    ></textarea>

                                    <button
                                        className="btn btn-primary btn-lg gap-3 mt-8 font-black uppercase text-sm shadow-xl shadow-primary/20 group translate-y-0 active:translate-y-1 transition-all"
                                        onClick={handleAnalyze}
                                        disabled={analyzeResumeMutation.isPending || !resumeText.trim()}
                                    >
                                        {analyzeResumeMutation.isPending ? (
                                            <Loader2Icon className="size-5 animate-spin" />
                                        ) : (
                                            <SparklesIcon className="size-5 group-hover:rotate-12 transition-transform" />
                                        )}
                                        {analyzeResumeMutation.isPending ? "Arena AI is Thinking..." : "Generate Analysis Report"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: LOADING / PLACEHOLDER */}
                        <div className="lg:col-span-3">
                            <div className="card bg-base-100/50 shadow-2xl border border-white/5 h-full min-h-[600px] flex items-center justify-center p-12 text-center border-dashed border-2">
                                {analyzeResumeMutation.isPending ? (
                                    <div className="flex flex-col items-center space-y-8 max-w-sm">
                                        <div className="relative">
                                            <div className="size-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                                            <SparklesIcon className="size-10 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white mb-2">Analyzing Profile...</h3>
                                            <p className="text-white/40 font-medium">Llama 3.3 is comparing your skills against market standards and requirements.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center space-y-6 opacity-30">
                                        <UploadIcon className="size-24 mb-4 text-white/50" />
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black uppercase tracking-tight">Report Pending</h3>
                                            <p className="text-sm font-bold uppercase tracking-widest max-w-xs mx-auto">Upload your resume on the left to generate comprehensive arena insights</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ANALYSIS RESULTS VIEW */
                    <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                        {/* LEFT COLUMN: SCORE & OVERVIEW */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="card bg-base-100 shadow-2xl border border-white/5 overflow-hidden">
                                <div className="card-body p-8 items-center text-center">
                                    <h2 className="text-xs font-black uppercase text-white/40 tracking-[0.3em] mb-6">Suitability Match</h2>
                                    <div className="relative size-48 flex items-center justify-center">
                                        <svg className="size-48 transform -rotate-90">
                                            <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                                            <circle
                                                cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent"
                                                strokeDasharray={552.92}
                                                strokeDashoffset={552.92 - (552.92 * (analysis.score || 0)) / 100}
                                                strokeLinecap="round"
                                                className="text-primary transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-6xl font-black text-white">{analysis.score || 0}</span>
                                            <span className="text-xs font-black text-primary uppercase tracking-widest">% Match</span>
                                        </div>
                                    </div>
                                    <p className="mt-8 text-white/60 font-medium leading-relaxed italic text-sm">
                                        "{analysis.summary}"
                                    </p>
                                </div>
                            </div>

                            <div className="card bg-base-100 shadow-2xl border border-white/5 p-8">
                                <h2 className="text-xs font-black uppercase text-white/40 tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <FlameIcon className="size-4 text-orange-500" /> Key Strengths
                                </h2>
                                <div className="space-y-3">
                                    {analysis.matches?.map((match, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-success/5 border border-success/10 group hover:border-success/30 transition-colors">
                                            <CheckCircleIcon className="size-4 text-success shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-bold text-white/80 leading-tight">{match}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: GAPS, ADVICE & QUESTIONS */}
                        <div className="lg:col-span-8 space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="card bg-base-100 shadow-2xl border border-white/5 p-8">
                                    <h2 className="text-xs font-black uppercase text-white/40 tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <TargetIcon className="size-4 text-error" /> Critical Gaps
                                    </h2>
                                    <div className="space-y-3">
                                        {analysis.gaps?.map((gap, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-error/5 border border-error/10">
                                                <AlertCircleIcon className="size-4 text-error shrink-0 mt-0.5" />
                                                <span className="text-sm font-bold text-white/80 leading-tight">{gap}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card bg-base-100 shadow-2xl border border-white/5 p-8">
                                    <h2 className="text-xs font-black uppercase text-white/40 tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <LightbulbIcon className="size-4 text-warning" /> Tailored Advice
                                    </h2>
                                    <div className="space-y-3">
                                        {analysis.advice?.map((adv, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-warning/5 border border-warning/10">
                                                <div className="size-1.5 bg-warning rounded-full shrink-0 mt-2"></div>
                                                <span className="text-sm font-bold text-white/80 leading-tight">{adv}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-base-100 shadow-2xl border border-white/5 overflow-hidden">
                                <div className="card-body p-8">
                                    <h2 className="text-xs font-black uppercase text-white/40 tracking-[0.3em] mb-8 flex items-center gap-2">
                                        <MessageSquareIcon className="size-4 text-primary" /> Target Interview Probes
                                    </h2>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        {analysis.questions?.map((q, i) => (
                                            <div key={i} className="bg-base-200/50 rounded-2xl p-6 border border-white/5 relative group hover:bg-primary/5 transition-all duration-300">
                                                <div className="absolute -top-3 left-6 px-3 py-1 bg-base-100 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-lg">
                                                    {q.type}
                                                </div>
                                                <p className="text-sm font-bold text-white italic leading-relaxed pt-2">
                                                    "{q.question}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* MISSING SKILLS & LEARNING PATH */}
                            {analysis.missingSkills && analysis.missingSkills.length > 0 && (
                                <div className="card bg-base-100 shadow-2xl border border-white/5 overflow-hidden">
                                    <div className="h-2 bg-gradient-to-r from-info to-primary"></div>
                                    <div className="card-body p-8">
                                        <h2 className="text-xs font-black uppercase text-white/40 tracking-[0.3em] mb-8 flex items-center gap-2">
                                            <BookOpenIcon className="size-4 text-info" /> Missing Skills & Learning Path
                                        </h2>
                                        <div className="space-y-6">
                                            {analysis.missingSkills.map((skillItem, i) => (
                                                <div key={i} className="bg-base-200/50 rounded-2xl p-6 border border-white/5 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-black text-white">{skillItem.skill}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${skillItem.importance === 'High' ? 'bg-error/20 text-error' :
                                                                    skillItem.importance === 'Medium' ? 'bg-warning/20 text-warning' :
                                                                        'bg-info/20 text-info'
                                                                }`}>
                                                                {skillItem.importance} Priority
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* ChatGPT Prompt */}
                                                    <div className="bg-base-300/50 rounded-xl p-4 border border-white/5">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">ChatGPT Learning Prompt</span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(skillItem.chatgptPrompt);
                                                                    toast.success(`Copied prompt for ${skillItem.skill}!`);
                                                                }}
                                                                className="btn btn-ghost btn-xs gap-1 text-white/40 hover:text-white"
                                                            >
                                                                <CopyIcon className="size-3" /> Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-sm text-white/70 leading-relaxed font-mono">
                                                            {skillItem.chatgptPrompt}
                                                        </p>
                                                    </div>

                                                    {/* Resume Readiness */}
                                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-success/5 border border-success/10">
                                                        <ClockIcon className="size-4 text-success shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase text-success/80 tracking-widest">Add to Resume When</span>
                                                            <p className="text-sm font-bold text-white/80 leading-tight mt-1">
                                                                {skillItem.readinessGuideline}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* INFO FOOTER */}
                {!analysis && (
                    <div className="mt-20 grid md:grid-cols-3 gap-8">
                        {[
                            { icon: CheckCircleIcon, color: "text-success", title: "Score Matching", desc: "Scientific match percentage based on tech stack and seniority." },
                            { icon: AlertCircleIcon, color: "text-warning", title: "Keyword Gaps", desc: "Instantly find out what recruitment filters (ATS) are looking for." },
                            { icon: SparklesIcon, color: "text-info", title: "AI Coaching", desc: "Personalized advice to pivot your resume for high-demand roles." }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-5 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-default group">
                                <item.icon className={`size-10 ${item.color} shrink-0 opacity-40 group-hover:opacity-100 transition-opacity`} />
                                <div>
                                    <h3 className="font-black text-white uppercase text-xs tracking-widest mb-1">{item.title}</h3>
                                    <p className="text-sm text-white/40 font-medium leading-snug">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}} />
        </div>
    );
}

export default ResumeAnalyzerPage;
