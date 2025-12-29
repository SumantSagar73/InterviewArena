import { TrophyIcon, UsersIcon } from "lucide-react";

function StatsCards({ activeSessionsCount, recentSessionsCount }) {
  return (
    <div className="lg:col-span-1 grid grid-cols-1 gap-4">
      {/* Active Count */}
      <div className="bg-base-100 border border-white/5 rounded-2xl p-6 hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UsersIcon className="size-5 text-primary" />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">
            <div className="size-1.5 bg-primary rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
        <div className="text-3xl font-black mb-1 text-white">{activeSessionsCount}</div>
        <div className="text-xs font-bold opacity-30 uppercase tracking-widest">Active Sessions</div>
      </div>

      {/* Recent Count */}
      <div className="bg-base-100 border border-white/5 rounded-2xl p-6 hover:border-secondary/40 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <TrophyIcon className="size-5 text-secondary" />
          </div>
        </div>
        <div className="text-3xl font-black mb-1 text-white">{recentSessionsCount}</div>
        <div className="text-xs font-bold opacity-30 uppercase tracking-widest">Total Completed</div>
      </div>
    </div>
  );
}

export default StatsCards;
