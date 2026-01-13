import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    analyzeCode,
    analyzeResume,
    enableAnalyzer,
    generateHint,
    toggleAnalyzerVote,
    chatAIInterview,
    generateInterviewPlan,
    generateInterviewReport,
    generateQuestionSuggestions,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/analyze", protectRoute, analyzeCode);
router.post("/hint", protectRoute, generateHint);
router.post("/resume", protectRoute, analyzeResume);
router.post("/:sessionId/vote", protectRoute, toggleAnalyzerVote);
router.post("/:sessionId/enable", protectRoute, enableAnalyzer);
router.post("/interview/chat", protectRoute, chatAIInterview);
router.post("/interview/plan", protectRoute, generateInterviewPlan);
router.post("/interview/report", protectRoute, generateInterviewReport);
router.post("/interview/suggest", protectRoute, generateQuestionSuggestions);


export default router;
