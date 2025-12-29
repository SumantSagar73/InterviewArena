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

import Navbar from "../components/Navbar";
import WelcomeSection from "../components/WelcomeSection";
import StatsCards from "../components/StatsCards";
import ActiveSessions from "../components/ActiveSessions";
import RecentSessions from "../components/RecentSessions";
import CreateSessionModal from "../components/CreateSessionModal";

function DashboardPage() {
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({ problem: "", difficulty: "" });
  const [joinCode, setJoinCode] = useState("");
  const navigate = useNavigate();

  const createSessionMutation = useCreateSession();
  const joinSessionByCodeMutation = useJoinSessionByCode();

  const handleJoinByCode = () => {
    if (!joinCode.trim()) return;
    joinSessionByCodeMutation.mutate(joinCode, {
      onSuccess: (data) => {
        navigate(`/session/${data.session._id}`);
      },
    });
  };

  const { data: activeSessionsData, isLoading: loadingActiveSessions } = useActiveSessions();
  const { data: recentSessionsData, isLoading: loadingRecentSessions } = useMyRecentSessions();

  const handleCreateRoom = () => {
    if (!roomConfig.problem || !roomConfig.difficulty) return;

    createSessionMutation.mutate(
      {
        problem: roomConfig.problem,
        difficulty: roomConfig.difficulty.toLowerCase(),
      },
      {
        onSuccess: (data) => {
          setShowCreateModal(false);
          navigate(`/session/${data.session._id}`);
        },
      }
    );
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
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ENTER ROOM CODE"
                      className="input input-bordered w-full font-mono font-black uppercase text-center text-lg tracking-[0.2em] focus:border-primary transition-all bg-base-300/50 h-14 rounded-xl border-white/5"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    className="btn btn-primary w-full h-14 rounded-xl font-black text-lg gap-2 shadow-lg shadow-primary/10"
                    onClick={handleJoinByCode}
                    disabled={joinSessionByCodeMutation.isPending || !joinCode}
                  >
                    {joinSessionByCodeMutation.isPending ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <>
                        <UsersIcon className="size-5" />
                        <span>Join Now</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] opacity-30 mt-4 text-center font-bold uppercase tracking-widest">
                  Secure & Private Collaborative Coding
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
    </>
  );
}

export default DashboardPage;
