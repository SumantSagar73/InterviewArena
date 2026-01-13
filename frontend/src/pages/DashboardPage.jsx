import { useNavigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import {
  useActiveSessions,
  useCreateSession,
  useJoinSessionByCode,
  useMyRecentSessions
} from "../hooks/useSessions";
import { ZapIcon, UsersIcon } from "lucide-react";
import { analyzeResumeAndGenerateQuestions, uploadResume } from "../api/resume";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import WelcomeSection from "../components/WelcomeSection";
import StatsCards from "../components/StatsCards";
import ActiveSessions from "../components/ActiveSessions";
import RecentSessions from "../components/RecentSessions";
import CreateSessionModal from "../components/CreateSessionModal";
import JoinSessionModal from "../components/JoinSessionModal";

function DashboardPage() {
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({ topics: [], resumeFile: null });
  const navigate = useNavigate();

  const createSessionMutation = useCreateSession();
  const joinSessionByCodeMutation = useJoinSessionByCode();

  const handleJoinByCode = async ({ code, resumeFile, topics }) => {
    try {
      // First join the session
      const sessionData = await joinSessionByCodeMutation.mutateAsync(code);
      const sessionId = sessionData.session._id;

      // Process the resume (mandatory for participants)
      if (resumeFile) {
        try {
          // 1. Upload resume to server
          await uploadResume(resumeFile, sessionId);
          toast.success("Resume uploaded successfully");

          // 2. Trigger analysis (backend will handle text extraction)
          await analyzeResumeAndGenerateQuestions(null, sessionId, topics || []);
          toast.success("AI is analyzing your resume...");
        } catch (error) {
          console.error("Error processing resume:", error);
          toast.error("Failed to process resume");
        }
      }

      setShowJoinModal(false);
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error("Failed to join session");
    }
  };

  const { data: activeSessionsData, isLoading: loadingActiveSessions } = useActiveSessions();
  const { data: recentSessionsData, isLoading: loadingRecentSessions } = useMyRecentSessions();

  const handleCreateRoom = async () => {
    const { topics, resumeFile } = roomConfig;

    try {
      // Create session (topics and resume are optional for host)
      const sessionData = await createSessionMutation.mutateAsync({ topics: topics || [] });
      const sessionId = sessionData.session._id;

      // If resume is uploaded, process it
      if (resumeFile) {
        try {
          // 1. Upload resume
          await uploadResume(resumeFile, sessionId);
          toast.success("Resume uploaded! AI is analyzing...");

          // 2. Trigger analysis
          await analyzeResumeAndGenerateQuestions(null, sessionId, topics || []);
        } catch (error) {
          console.error("Error processing resume:", error);
          toast.error("Resume upload failed, but session created");
        }
      } else if (topics?.length > 0) {
        // Generate questions from topics only
        await analyzeResumeAndGenerateQuestions(null, sessionId, topics);
        toast.success("Session created! AI is generating questions...");
      } else {
        toast.success("Session created! You can add topics during the interview.");
      }

      setShowCreateModal(false);
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    }
  };

  const activeSessions = activeSessionsData?.sessions || [];
  const recentSessions = recentSessionsData?.sessions || [];

  const isUserInSession = (session) => {
    if (!user.id) return false;

    return session.host?.clerkId === user.id || session.participant?.clerkId === user.id;
  };

  return (
    <>
      <div className="min-h-screen bg-base-300">
        <Navbar />
        <WelcomeSection onCreateSession={() => setShowCreateModal(true)} />

        {/* Grid layout */}
        <div className="container mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <StatsCards
                activeSessionsCount={activeSessions.length}
                recentSessionsCount={recentSessions.length}
              />

              {/* JOIN BY CODE CARD */}
              <div className="bg-base-100 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ZapIcon className="size-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-black text-white">Join Session</h2>
                </div>

                <div className="space-y-4">
                  <button
                    className="btn btn-primary w-full h-14 rounded-xl font-black text-lg gap-2 shadow-lg shadow-primary/10"
                    onClick={() => setShowJoinModal(true)}
                  >
                    <UsersIcon className="size-5" />
                    <span>Join with Code</span>
                  </button>
                </div>
                <p className="text-[10px] opacity-30 mt-4 text-center font-bold uppercase tracking-widest">
                  Upload resume required to join
                </p>
              </div>
            </div>

            <RecentSessions sessions={recentSessions} isLoading={loadingRecentSessions} />
          </div>
        </div>
      </div>

      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        roomConfig={roomConfig}
        setRoomConfig={setRoomConfig}
        onCreateRoom={handleCreateRoom}
        isCreating={createSessionMutation.isPending}
      />

      <JoinSessionModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinByCode}
        isJoining={joinSessionByCodeMutation.isPending}
      />
    </>
  );
}

export default DashboardPage;
