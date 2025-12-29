import { HistoryIcon, SparklesIcon, Maximize2Icon, Minimize2Icon, ChevronLeftIcon } from "lucide-react";
import { getDifficultyBadgeClass } from "../lib/utils";
function ProblemDescription({
  problem,
  currentProblemId,
  onProblemChange,
  allProblems,
  onToggleHistory,
  showHistory,
  onToggleAI,
  showAI,
  onToggleFullscreen,
  isFullscreen,
  onBack,
}) {
  return (
    <div className="h-full overflow-y-auto bg-base-200">
      {/* HEADER SECTION */}
      <div className="p-6 bg-base-100 border-b border-white/5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="btn btn-ghost btn-sm btn-square hover:bg-white/10 mt-1"
                title="Back"
              >
                <ChevronLeftIcon className="size-5 text-white/50 hover:text-white transition-colors" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black text-white">{problem.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{problem.category}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`btn btn-sm btn-ghost rounded-xl ${showAI ? 'bg-primary/10 text-primary' : 'text-white/40'}`}
              title="AI Assistant"
              onClick={onToggleAI}
            >
              <SparklesIcon className="size-4" />
            </button>
            <button
              className={`btn btn-sm btn-ghost rounded-xl ${showHistory ? 'bg-primary/10 text-primary' : 'text-white/40'}`}
              title="Version History"
              onClick={onToggleHistory}
            >
              <HistoryIcon className="size-4" />
            </button>
            <button
              className="btn btn-sm btn-ghost rounded-xl text-white/40"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2Icon className="size-4" />
              ) : (
                <Maximize2Icon className="size-4" />
              )}
            </button>
            <span className={`badge badge-sm font-bold border-none py-3 px-3 uppercase text-[10px] ${getDifficultyBadgeClass(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
          </div>
        </div>
        <p className="text-base-content/60">{problem.category}</p>

        {/* Problem selector */}
        <div className="mt-4">
          <select
            className="select select-sm w-full bg-base-300 border-white/5 rounded-xl font-bold text-xs"
            value={currentProblemId}
            onChange={(e) => onProblemChange(e.target.value)}
          >
            {allProblems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} - {p.difficulty}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* PROBLEM DESC */}
        <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
          <h2 className="text-xl font-bold text-base-content">Description</h2>

          <div className="space-y-3 text-base leading-relaxed">
            <p className="text-base-content/90">{problem.description.text}</p>
            {problem.description.notes.map((note, idx) => (
              <p key={idx} className="text-base-content/90">
                {note}
              </p>
            ))}
          </div>
        </div>

        {/* EXAMPLES SECTION */}
        <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
          <h2 className="text-xl font-bold mb-4 text-base-content">Examples</h2>
          <div className="space-y-4">
            {problem.examples.map((example, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-sm">{idx + 1}</span>
                  <p className="font-semibold text-base-content">Example {idx + 1}</p>
                </div>
                <div className="bg-base-200 rounded-lg p-4 font-mono text-sm space-y-1.5">
                  <div className="flex gap-2">
                    <span className="text-primary font-bold min-w-[70px]">Input:</span>
                    <span>{example.input}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-secondary font-bold min-w-[70px]">Output:</span>
                    <span>{example.output}</span>
                  </div>
                  {example.explanation && (
                    <div className="pt-2 border-t border-base-300 mt-2">
                      <span className="text-base-content/60 font-sans text-xs">
                        <span className="font-semibold">Explanation:</span> {example.explanation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONSTRAINTS */}
        <div className="bg-base-100 rounded-xl shadow-sm p-5 border border-base-300">
          <h2 className="text-xl font-bold mb-4 text-base-content">Constraints</h2>
          <ul className="space-y-2 text-base-content/90">
            {problem.constraints.map((constraint, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-primary">•</span>
                <code className="text-sm">{constraint}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ProblemDescription;
