import { useUser } from "@clerk/clerk-react";
import { ArrowRightIcon, SparklesIcon, ZapIcon } from "lucide-react";

function WelcomeSection({ onCreateSession }) {
  const { user } = useUser();

  return (
    <div className="bg-base-100 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <SparklesIcon className="size-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Welcome back, <span className="text-primary">{user?.firstName || "Candidate"}</span>
              </h1>
              <p className="text-base text-white/50 font-medium">
                Collaborate and code in real-time. The ultimate platform for technical interviews.
              </p>
            </div>
          </div>

          <button
            onClick={onCreateSession}
            className="btn btn-primary btn-lg gap-3 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
          >
            <ZapIcon className="size-5" />
            <span>Create Session</span>
            <ArrowRightIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeSection;
