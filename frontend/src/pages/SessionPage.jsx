import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useEndSession, useJoinSession, useSessionById } from "../hooks/useSessions";
import { PROBLEMS } from "../data/problems";
import { executeCode } from "../lib/piston";
import Navbar from "../components/Navbar";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { getDifficultyBadgeClass } from "../lib/utils";
import {
  Loader2Icon,
  LogOutIcon,
  PhoneOffIcon,
  Maximize2Icon,
  Minimize2Icon,
  HistoryIcon,
  SparklesIcon,
  ChevronLeftIcon,
} from "lucide-react";
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";
import VersionHistoryPanel from "../components/VersionHistoryPanel";
import AIAnalyzerPanel from "../components/AIAnalyzerPanel";

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";
import { useCreateVersion } from "../hooks/useVersions";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastSavedCode, setLastSavedCode] = useState("");

  const [videoPos, setVideoPos] = useState({ x: 30, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const createVersionMutation = useCreateVersion();

  const { data: sessionData, isLoading: loadingSession, refetch } = useSessionById(id);

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();

  const session = sessionData?.session;
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participant?.clerkId === user?.id;

  const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant
  );

  // find the problem data based on session problem title
  const problemData = session?.problem
    ? Object.values(PROBLEMS).find((p) => p.title === session.problem)
    : null;

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState(problemData?.starterCode?.[selectedLanguage] || "");
  const [showHistory, setShowHistory] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Auto-fullscreen
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Auto-fullscreen failed", err);
      }
    };
    enterFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    };
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest(".drag-handle")) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - videoPos.x,
        y: e.clientY - videoPos.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setVideoPos({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleRestore = (restoredCode) => {
    if (confirm("Are you sure you want to restore this version?")) {
      setCode(restoredCode);
      setLastSavedCode(restoredCode);
      setShowHistory(false);
    }
  };

  // auto-join session if user is not already a participant and not the host
  useEffect(() => {
    if (!session || !user || loadingSession) return;
    if (isHost || isParticipant) return;

    joinSessionMutation.mutate(id, { onSuccess: refetch });

    // remove the joinSessionMutation, refetch from dependencies to avoid infinite loop
  }, [session, user, loadingSession, isHost, isParticipant, id]);

  // redirect the "participant" when session ends
  useEffect(() => {
    if (session?.status === "completed") navigate("/dashboard");
  }, [session, navigate]);

  // update code when problem loads or changes
  useEffect(() => {
    if (problemData?.starterCode?.[selectedLanguage] && !code) {
      const starter = problemData.starterCode[selectedLanguage];
      setCode(starter);
      setLastSavedCode(starter);
    }
  }, [problemData, selectedLanguage, code]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    // use problem-specific starter code
    const starterCode = problemData?.starterCode?.[newLang] || "";
    setCode(starterCode);
    setLastSavedCode(starterCode);
    setOutput(null);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);

    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);

    // Auto-save version if code changed
    if (code !== lastSavedCode) {
      createVersionMutation.mutate(
        {
          sessionId: id,
          problemId: problemData?.title || "unknown",
          code,
          language: selectedLanguage,
          name: "Auto-save",
        },
        {
          onSuccess: () => setLastSavedCode(code),
        }
      );
    }
  };

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session?")) {
      // this will navigate the HOST to dashboard
      endSessionMutation.mutate(id, { onSuccess: () => navigate("/dashboard") });
    }
  };

  return (
    <div className="h-screen bg-base-100 flex flex-col overflow-hidden relative" onMouseDown={handleMouseDown}>
      {/* Navbar hidden for immersive experience */}

      <div className="flex-1 overflow-hidden relative">
        {/* Floating Draggable Video Call */}
        {streamClient && call && (
          <div
            className={`fixed z-[100] transition-shadow duration-200 ${isDragging ? 'shadow-2xl ring-2 ring-primary/50' : 'shadow-xl'}`}
            style={{
              left: `${videoPos.x}px`,
              top: `${videoPos.y}px`,
              cursor: isDragging ? 'grabbing' : 'auto'
            }}
          >
            <div className="drag-handle w-full h-8 bg-base-300 rounded-t-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-base-200 transition-colors border-x border-t border-white/5">
              <div className="flex gap-1.5">
                <span className="size-1 rounded-full bg-white/10"></span>
                <span className="size-1 rounded-full bg-white/10"></span>
                <span className="size-1 rounded-full bg-white/10"></span>
              </div>
            </div>
            <div className="w-72 bg-base-100 rounded-b-2xl overflow-hidden border border-white/5 border-t-0 shadow-inner">
              {isInitializingCall ? (
                <div className="aspect-video flex items-center justify-center bg-base-300">
                  <Loader2Icon className="animate-spin text-primary opacity-50" />
                </div>
              ) : (
                <div className="aspect-video">
                  <StreamVideo client={streamClient}>
                    <StreamCall call={call}>
                      <VideoCallUI chatClient={chatClient} channel={channel} isMini={true} />
                    </StreamCall>
                  </StreamVideo>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Miniscreen Overlay */}
        {showAI && session && (
          <AIAnalyzerPanel
            session={session}
            isHost={isHost}
            currentCode={code}
            language={selectedLanguage}
            userClerkId={user.id}
            variant="miniscreen"
            mode="session"
            problemDescription={problemData?.description?.text}
            onClose={() => setShowAI(false)}
          />
        )}

        <PanelGroup direction="horizontal">
          {/* MAIN CONTENT AREA */}
          <Panel defaultSize={40} minSize={30}>
            <div className="h-full overflow-y-auto bg-base-200 custom-scrollbar">
              {/* HEADER SECTION */}
              <div className="p-6 bg-base-100 border-b border-white/5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="btn btn-ghost btn-xs btn-square hover:bg-white/10"
                      >
                        <ChevronLeftIcon className="size-4" />
                      </button>
                      {session?.problem || "Loading..."}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 uppercase text-[10px] font-bold tracking-widest text-white/30">
                      {problemData?.category && <span className="text-primary">{problemData.category}</span>}
                      <span>{session?.host?.name || "..."} • Room #{session?.sessionCode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isHost && session?.status === "active" && (
                      <button
                        onClick={handleEndSession}
                        disabled={endSessionMutation.isPending}
                        className="btn btn-error btn-xs rounded-xl font-bold px-3"
                      >
                        {endSessionMutation.isPending ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : (
                          "End"
                        )}
                      </button>
                    )}

                    <button
                      className={`btn btn-sm btn-ghost rounded-xl ${showAI ? 'text-primary' : 'text-white/40'}`}
                      title="AI Assistant"
                      onClick={() => {
                        setShowAI((s) => !s);
                        setShowHistory(false);
                      }}
                    >
                      <SparklesIcon className="size-4" />
                    </button>

                    <button
                      className={`btn btn-sm btn-ghost rounded-xl ${showHistory ? 'text-primary' : 'text-white/40'}`}
                      title="Version History"
                      onClick={() => {
                        setShowHistory((s) => !s);
                        setShowAI(false);
                      }}
                    >
                      <HistoryIcon className="size-4" />
                    </button>

                    <span className={`badge badge-sm font-bold border-none py-3 px-3 uppercase text-[10px] ${getDifficultyBadgeClass(session?.difficulty)}`}>
                      {session?.difficulty || "easy"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* problem desc */}
                {problemData?.description && (
                  <div className="bg-base-100 rounded-2xl p-5 border border-white/5 space-y-4">
                    <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <span className="size-1.5 bg-primary rounded-full"></span>
                      Description
                    </h2>
                    <div className="text-sm leading-relaxed text-white/70 font-medium whitespace-pre-wrap">
                      {problemData.description.text}
                    </div>
                  </div>
                )}

                {/* examples section */}
                {problemData?.examples && problemData.examples.length > 0 && (
                  <>
                    {problemData.examples.map((ex, idx) => (
                      <div key={idx} className="bg-base-100 rounded-2xl p-5 border border-white/5 space-y-3">
                        <h2 className="text-[10px] font-black text-white/30 uppercase">Example {idx + 1}</h2>
                        <div className="bg-base-300 rounded-xl p-4 font-mono text-xs space-y-2 border border-white/5">
                          <div className="flex gap-2">
                            <span className="text-primary font-bold">In:</span>
                            <span className="text-white/80">{ex.input}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-secondary font-bold">Out:</span>
                            <span className="text-white/80">{ex.output}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-base-300 hover:bg-primary/50 transition-colors cursor-col-resize" />

          <Panel defaultSize={60} minSize={40}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} minSize={30}>
                <CodeEditorPanel
                  selectedLanguage={selectedLanguage}
                  code={code}
                  isRunning={isRunning}
                  onLanguageChange={handleLanguageChange}
                  onCodeChange={(value) => setCode(value)}
                  onRunCode={handleRunCode}
                />
              </Panel>

              <PanelResizeHandle className="h-1.5 bg-base-300 hover:bg-primary/50 transition-colors cursor-row-resize" />

              <Panel defaultSize={30} minSize={15}>
                <OutputPanel output={output} />
              </Panel>
            </PanelGroup>
          </Panel>

          {showHistory && (
            <>
              <PanelResizeHandle className="w-1.5 bg-base-300 hover:bg-primary/50 transition-colors" />
              <Panel defaultSize={20} minSize={15}>
                <VersionHistoryPanel
                  targetId={id}
                  problemId={problemData?.title || "unknown"}
                  currentCode={code}
                  language={selectedLanguage}
                  onRestore={handleRestore}
                  isSession={true}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}

export default SessionPage;
