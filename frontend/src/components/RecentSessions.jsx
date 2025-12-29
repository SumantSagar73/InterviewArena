import { Code2, Clock, Users, Trophy, Loader } from "lucide-react";
import { getDifficultyBadgeClass } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";

function RecentSessions({ sessions, isLoading }) {
  return (
    <div className="bg-base-100 border border-white/5 rounded-2xl p-8 lg:col-span-2">
      <div className="flex items-center gap-4 mb-8">
        <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Clock className="size-5 text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Recent Sessions</h2>
          <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest">Your past interview history</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-20">
            <Loader className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : sessions.length > 0 ? (
          sessions.map((session) => (
            <div
              key={session._id}
              className="group relative flex items-center gap-6 p-4 rounded-2xl bg-base-200/50 border border-white/5 hover:border-primary/40 hover:bg-base-200 transition-all duration-300"
            >
              <div className="size-14 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg group-hover:shadow-primary/20 transition-all">
                <Code2 className="size-7 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {session.problem}
                  </h3>
                  <span className={`badge badge-sm font-bold ${getDifficultyBadgeClass(session.difficulty)}`}>
                    {session.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm opacity-50">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span>{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-accent">
                    <Users className="size-3.5" />
                    <span>{session.participant ? "2 Participants" : "Solo Session"}</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Completed</span>
                <span className="text-sm font-mono opacity-60">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-3xl flex items-center justify-center">
              <Trophy className="w-10 h-10 text-accent/50" />
            </div>
            <p className="text-lg font-semibold opacity-70 mb-1">No sessions yet</p>
            <p className="text-sm opacity-50">Start your coding journey today!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecentSessions;
