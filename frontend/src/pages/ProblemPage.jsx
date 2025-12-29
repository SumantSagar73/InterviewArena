import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { PROBLEMS } from "../data/problems";
import Navbar from "../components/Navbar";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import ProblemDescription from "../components/ProblemDescription";
import OutputPanel from "../components/OutputPanel";
import CodeEditorPanel from "../components/CodeEditorPanel";
import { executeCode } from "../lib/piston";

import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { useUser } from "@clerk/clerk-react";
import VersionHistoryPanel from "../components/VersionHistoryPanel";
import AIAnalyzerPanel from "../components/AIAnalyzerPanel";
import { HistoryIcon, SparklesIcon, Maximize2Icon, Minimize2Icon, ChevronLeftIcon } from "lucide-react";
import { useCreateVersion } from "../hooks/useVersions";

function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [currentProblemId, setCurrentProblemId] = useState("two-sum");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState(PROBLEMS[currentProblemId].starterCode.javascript);
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedCode, setLastSavedCode] = useState("");

  const createVersionMutation = useCreateVersion();

  const handleRestore = (restoredCode) => {
    if (
      confirm(
        "Are you sure you want to restore this version? Your current unsaved changes will be lost."
      )
    ) {
      setCode(restoredCode);
      setLastSavedCode(restoredCode);
      setShowHistory(false);
    }
  };

  const currentProblem = PROBLEMS[currentProblemId];

  // update problem when URL param changes
  useEffect(() => {
    if (id && PROBLEMS[id]) {
      setCurrentProblemId(id);
      const starter = PROBLEMS[id].starterCode[selectedLanguage];
      setCode(starter);
      setLastSavedCode(starter);
      setOutput(null);
    }
  }, [id, selectedLanguage]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    const starter = currentProblem.starterCode[newLang];
    setCode(starter);
    setLastSavedCode(starter);
    setOutput(null);
  };

  const handleProblemChange = (newProblemId) => navigate(`/problem/${newProblemId}`);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 250,
      origin: { x: 0.2, y: 0.6 },
    });

    confetti({
      particleCount: 80,
      spread: 250,
      origin: { x: 0.8, y: 0.6 },
    });
  };

  const normalizeOutput = (output) => {
    // normalize output for comparison (trim whitespace, handle different spacing)
    return output
      .trim()
      .split("\n")
      .map((line) =>
        line
          .trim()
          // remove spaces after [ and before ]
          .replace(/\[\s+/g, "[")
          .replace(/\s+\]/g, "]")
          // normalize spaces around commas to single space after comma
          .replace(/\s*,\s*/g, ",")
      )
      .filter((line) => line.length > 0)
      .join("\n");
  };

  const checkIfTestsPassed = (actualOutput, expectedOutput) => {
    const normalizedActual = normalizeOutput(actualOutput);
    const normalizedExpected = normalizeOutput(expectedOutput);

    return normalizedActual == normalizedExpected;
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
          problemId: currentProblemId,
          code,
          language: selectedLanguage,
          name: "Auto-save",
        },
        {
          onSuccess: () => setLastSavedCode(code),
        }
      );
    }

    // check if code executed successfully and matches expected output

    if (result.success) {
      const expectedOutput = currentProblem.expectedOutput[selectedLanguage];
      const testsPassed = checkIfTestsPassed(result.output, expectedOutput);

      if (testsPassed) {
        triggerConfetti();
        toast.success("All tests passed! Great job!");
      } else {
        toast.error("Tests failed. Check your output!");
      }
    } else {
      toast.error("Code execution failed!");
    }
  };

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
  }, []);

  return (
    <div className="h-screen bg-base-100 flex flex-col overflow-hidden">
      {/* Navbar hidden for immersive experience */}

      <div className="flex-1 overflow-hidden relative">
        {/* AI Miniscreen for Fullscreen mode */}
        {showAI && (
          <AIAnalyzerPanel
            session={{ problem: currentProblemId }}
            isHost={true}
            currentCode={code}
            language={selectedLanguage}
            userClerkId={user?.id}
            variant="miniscreen"
            mode="solo"
            problemDescription={currentProblem?.description?.text}
            onClose={() => setShowAI(false)}
          />
        )}

        <PanelGroup direction="horizontal">
          <Panel defaultSize={40} minSize={30}>
            <div className="h-full bg-base-200 overflow-y-auto custom-scrollbar">
              <ProblemDescription
                problem={currentProblem}
                currentProblemId={currentProblemId}
                onProblemChange={handleProblemChange}
                allProblems={Object.values(PROBLEMS)}
                onToggleHistory={() => {
                  setShowHistory((s) => !s);
                  setShowAI(false);
                }}
                showHistory={showHistory}
                onToggleAI={() => {
                  setShowAI((s) => !s);
                  setShowHistory(false);
                }}
                showAI={showAI}
                onToggleFullscreen={() => { }} // No-op as we are forced fullscreen
                isFullscreen={true}
                onBack={() => navigate("/problems")}
              />
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
              <PanelResizeHandle className="w-1.5 bg-base-300 hover:bg-primary/50 transition-colors cursor-col-resize" />
              <Panel defaultSize={20} minSize={15}>
                <VersionHistoryPanel
                  targetId={currentProblemId}
                  problemId={currentProblemId}
                  currentCode={code}
                  language={selectedLanguage}
                  onRestore={handleRestore}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}

export default ProblemPage;
