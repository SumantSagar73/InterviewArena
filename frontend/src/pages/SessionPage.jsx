import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useEndSession, useJoinSession, useSessionById } from "../hooks/useSessions";
import {
  Loader2Icon,
  PhoneOffIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SidebarIcon,
  MaximizeIcon,
  FileTextIcon,
  SettingsIcon
} from "lucide-react";
import toast from "react-hot-toast";
import DrawingBoard from "../components/DrawingBoard";
import InterviewQuestionsPanel from "../components/InterviewQuestionsPanel";
import ResumePreviewPanel from "../components/ResumePreviewPanel";

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const [videoPos, setVideoPos] = useState({ x: window.innerWidth - 300, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sidebar States (Floating Panels)
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Auto-open panels on load for Host
  useEffect(() => {
    if (user) {
      setIsResumeOpen(true);
      setIsAIOpen(true);
    }
  }, [user]);


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

  // Fullscreen Detection & Notification
  useEffect(() => {
    if (!call) return;

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        try {
          await call.sendCustomEvent({
            type: 'fullscreen_exit',
            user: user?.fullName || user?.firstName || 'User',
            text: 'exited full screen mode'
          });
        } catch (err) {
          console.error("Failed to send fullscreen event", err);
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [call, user]);

  // Listen for fullscreen Exit events from others
  useEffect(() => {
    if (!call) return;

    const unsubscribe = call.on('custom', (event) => {
      if (event.custom.type === 'fullscreen_exit') {
        const senderName = event.user?.name || event.custom.user || 'Participant';
        if (event.user?.id !== user?.id) {
          toast(`${senderName} ${event.custom.text}`, {
            icon: '⚠️',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
            duration: 5000
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [call, user]);


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

  // auto-join session
  useEffect(() => {
    if (!session || !user || loadingSession) return;
    if (isHost || isParticipant) return;
    joinSessionMutation.mutate(id, { onSuccess: refetch });
  }, [session, user, loadingSession, isHost, isParticipant, id]);

  useEffect(() => {
    if (session?.status === "completed") navigate("/dashboard");
  }, [session, navigate]);

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session?")) {
      endSessionMutation.mutate(id, { onSuccess: () => navigate("/dashboard") });
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden relative font-sans" onMouseDown={handleMouseDown}>

      {/* 1. LAYER 0: Infinite Whiteboard Canvas */}
      <div className="absolute inset-0 z-0">
        <DrawingBoard channel={channel} isHost={isHost} />
      </div>

      {/* 2. LAYER 10: Floating UI Overlay (Header) */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 pointer-events-none flex justify-between items-start">

        {/* Top Left: Back & Info */}
        <div className="flex items-center gap-3 pointer-events-auto bg-white/80 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-sm">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors text-slate-700"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="px-2">
            <div className="text-sm font-bold text-slate-800">
              {session?.host?.name || "Interview Session"}
            </div>
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Room #{session?.sessionCode}
            </div>
          </div>
        </div>

        {/* Top Right: Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Panel Toggles */}
          {isHost && (
            <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-sm flex gap-1 items-center">
              <button
                onClick={() => setIsResumeOpen(!isResumeOpen)}
                className={`p-2 rounded-lg transition-all ${isResumeOpen ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-black/5 text-slate-600'}`}
                title="Toggle Resume"
              >
                <FileTextIcon className="size-5" />
              </button>
              <button
                onClick={() => setIsAIOpen(!isAIOpen)}
                className={`p-2 rounded-lg transition-all ${isAIOpen ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-black/5 text-slate-600'}`}
                title="Toggle AI Assistant"
              >
                <SparklesIcon className="size-5" />
              </button>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-sm flex gap-2 items-center">
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(console.error);
                } else {
                  document.exitFullscreen().catch(console.error);
                }
              }}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors text-slate-700"
              title="Toggle Fullscreen"
            >
              <MaximizeIcon className="size-5" />
            </button>

            {isHost && session?.status === "active" && (
              <button
                onClick={handleEndSession}
                disabled={endSessionMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors"
              >
                {endSessionMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PhoneOffIcon className="size-4" />
                )}
                <span className="hidden sm:inline">End</span>
              </button>
            )}
          </div>
        </div>
      </div>


      {/* 3. LAYER 20: Floating Content Panels */}

      {/* Left Panel: Resume */}
      {isHost && (
        <div
          className={`absolute left-4 top-20 bottom-4 w-[45vw] min-w-[500px] max-w-[800px] z-20 pointer-events-none transition-all duration-300 ease-in-out transform origin-left
            ${isResumeOpen ? 'translate-x-0 opacity-100' : '-translate-x-[500px] opacity-0'}`}
        >
          <div className="w-full h-full bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl flex flex-col pointer-events-auto overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileTextIcon className="size-4 text-indigo-500" />
                Candidate Resume
              </h3>
              <button onClick={() => setIsResumeOpen(false)} className="text-slate-400 hover:text-slate-600">
                <ChevronLeftIcon className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <ResumePreviewPanel sessionId={id} isHost={isHost} />
            </div>
          </div>
        </div>
      )}

      {/* Right Panel: AI Assistant */}
      {isHost && (
        <div
          className={`absolute right-4 top-20 bottom-4 w-[380px] z-20 pointer-events-none transition-all duration-300 ease-in-out transform origin-right
            ${isAIOpen ? 'translate-x-0 opacity-100' : 'translate-x-[400px] opacity-0'}`}
        >
          <div className="w-full h-full bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl flex flex-col pointer-events-auto overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <SparklesIcon className="size-4 text-indigo-500" />
                AI Copilot
              </h3>
              <button onClick={() => setIsAIOpen(false)} className="text-slate-400 hover:text-slate-600">
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <InterviewQuestionsPanel sessionId={id} isHost={isHost} />
            </div>
          </div>
        </div>
      )}


      {/* 4. LAYER 50: Draggable Video Call */}
      {streamClient && call && (
        <div
          className={`fixed z-[50] transition-shadow duration-200 rounded-2xl overflow-hidden ${isDragging ? 'shadow-2xl ring-4 ring-indigo-500/20' : 'shadow-xl'}`}
          style={{
            left: `${videoPos.x}px`,
            top: `${videoPos.y}px`,
            cursor: isDragging ? 'grabbing' : 'auto'
          }}
        >
          <div className="drag-handle w-full h-8 bg-slate-900/90 backdrop-blur flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors border-b border-white/10">
            <div className="flex gap-1.5 opacity-50">
              <span className="size-1.5 rounded-full bg-white"></span>
              <span className="size-1.5 rounded-full bg-white"></span>
              <span className="size-1.5 rounded-full bg-white"></span>
            </div>
          </div>
          <div className="w-72 bg-slate-950 border border-slate-800 border-t-0 relative">
            {isInitializingCall ? (
              <div className="aspect-video flex items-center justify-center bg-slate-900">
                <Loader2Icon className="animate-spin text-indigo-400 opacity-80" />
              </div>
            ) : (
              <div className="aspect-video">
                <StreamVideo client={streamClient}>
                  <StreamCall call={call}>
                    <VideoCallUI isMini={true} />
                  </StreamCall>
                </StreamVideo>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default SessionPage;
