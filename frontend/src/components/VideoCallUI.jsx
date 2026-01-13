import {
  CallingState,
  SpeakerLayout,
  useCallStateHooks,
  ParticipantView,
} from "@stream-io/video-react-sdk";
import { Loader2Icon, UsersIcon } from "lucide-react";
import { useNavigate } from "react-router";

import "@stream-io/video-react-sdk/dist/css/styles.css";

function VideoCallUI({ isMini = false }) {
  const navigate = useNavigate();
  const { useCallCallingState, useParticipantCount, useParticipants, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  if (callingState === CallingState.JOINING) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isMini) {
    // Get remote participant (the other person)
    const remoteParticipant = participants.find(p => p.sessionId !== localParticipant?.sessionId);

    return (
      <div className="h-full w-full bg-base-300 relative overflow-hidden str-video">
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-full border border-white/5 flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-error animate-pulse"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">Live • {participantCount}</span>
        </div>

        {/* Show remote participant as main view, local as pip */}
        <div className="w-full h-full relative">
          {remoteParticipant ? (
            <ParticipantView participant={remoteParticipant} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white/50 text-xs">
              Waiting for other participant...
            </div>
          )}

          {/* Local participant as small picture-in-picture */}
          {localParticipant && (
            <div className="absolute bottom-2 right-2 w-16 h-12 rounded overflow-hidden border border-white/20 shadow-lg">
              <ParticipantView participant={localParticipant} className="w-full h-full" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-3 relative str-video">
      <div className="flex-1 flex flex-col gap-3">
        {/* Participants count badge */}
        <div className="flex items-center justify-between gap-2 bg-base-100 p-3 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {participantCount} {participantCount === 1 ? "participant" : "participants"}
            </span>
          </div>
        </div>

        <div className="flex-1 bg-base-300 rounded-lg overflow-hidden relative">
          <SpeakerLayout />
        </div>
      </div>
    </div>
  );
}
export default VideoCallUI;
