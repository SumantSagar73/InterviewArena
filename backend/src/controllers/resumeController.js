import { analyzeResume, extractTextFromResume, generateTopicQuestions } from "../lib/aiService.js";
import Session from "../models/Session.js";

export async function uploadResume(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ message: "Session ID is required" });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Save file to session
        session.resume = {
            fileName: req.file.originalname,
            uploadedBy: "host", // Todo: use auth user role
            data: req.file.buffer.toString('base64'),
            contentType: req.file.mimetype
        };

        await session.save();

        res.json({
            message: "Resume uploaded successfully",
            fileName: req.file.originalname,
            fileSize: req.file.size,
        });
    } catch (error) {
        console.error("Error in uploadResume controller:", error);
        res.status(500).json({ message: "Error uploading resume" });
    }
}

export async function analyzeResumeAndGenerateQuestions(req, res) {
    try {
        const { resumeText, sessionId, topics, difficulty = "Mixed" } = req.body;

        if (!sessionId) {
            return res.status(400).json({ message: "Session ID is required" });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // STRATEGY CHANGE: Strictly separate Topic Generation from Resume Analysis

        // 1. If topics are provided, ONLY generate for topics (or add to session)
        if (topics && topics.length > 0) {
            console.log(`Generating questions for topics: ${topics.join(", ")} | Difficulty: ${difficulty}`);
            const topicQuestions = await generateTopicQuestions(topics, difficulty);

            // Tag these as 'Topic' source
            const taggedQuestions = (topicQuestions.questions || []).map(q => ({
                ...q,
                source: "topic",
                context: topics.join(", ")
            }));

            // Merge new topics with existing ones (avoid duplicates)
            const existingTopics = session.topics || [];
            const allTopics = [...new Set([...existingTopics, ...topics])];
            session.topics = allTopics;

            // Merge questions (append)
            const existingQuestions = session.aiGeneratedQuestions || [];
            session.aiGeneratedQuestions = [...existingQuestions, ...taggedQuestions];

            await session.save();

            return res.json({
                message: "Topic questions generated successfully",
                questions: taggedQuestions,
                suggestedTopics: [],
            });
        }

        // 2. If NO topics, proceed with Resume Analysis (Standard Flow)
        let extractedText = "";
        let questions = []; // Initialize for resume analysis path
        let suggestedTopics = []; // Initialize for resume analysis path

        if (resumeText) {
            extractedText = resumeText;
        } else if (session.resume && session.resume.data) {
            // Extract text from stored resume
            console.log("Extracting text from stored resume...");
            extractedText = await extractTextFromResume(
                Buffer.from(session.resume.data, 'base64'),
                session.resume.contentType
            );
            console.log("Extracted text length:", extractedText?.length);
        }

        if (extractedText && extractedText.trim().length > 50) {
            console.log("Analyzing resume text...");
            const resumeAnalysis = await analyzeResume(extractedText, difficulty); // Pass difficulty if supported
            questions = (resumeAnalysis.questions || []).map(q => ({ ...q, source: "resume" }));
            suggestedTopics = resumeAnalysis.suggestedTopics || [];
        } else {
            console.log("Resume text too short or empty.");
        }

        // Merge logic for Resume Questions
        const existingQuestions = session.aiGeneratedQuestions || [];
        // Filter out old "resume" source questions if we are re-analyzing? 
        // For now, let's just append but check duplicates

        const existingQuestionTexts = new Set(
            existingQuestions.map(q => q.question?.toLowerCase().trim())
        );

        const uniqueNewQuestions = questions.filter(
            q => !existingQuestionTexts.has(q.question?.toLowerCase().trim())
        );

        session.aiGeneratedQuestions = [...existingQuestions, ...uniqueNewQuestions];
        await session.save();

        res.json({
            message: "Resume questions generated successfully",
            questions: uniqueNewQuestions,
            suggestedTopics,
        });
    } catch (error) {
        console.error("Error in analyzeResumeAndGenerateQuestions controller:", error);
        res.status(500).json({ message: "Error generating questions" });
    }
}

export async function getResume(req, res) {
    try {
        const { sessionId } = req.params;
        const session = await Session.findById(sessionId);

        if (!session || !session.resume || !session.resume.data) {
            return res.status(404).json({ message: "Resume not found" });
        }

        const fileBuffer = Buffer.from(session.resume.data, 'base64');

        res.setHeader('Content-Type', session.resume.contentType);
        res.setHeader('Content-Disposition', `inline; filename="${session.resume.fileName}"`);
        res.send(fileBuffer);

    } catch (error) {
        console.error("Error retrieving resume:", error);
        res.status(500).json({ message: "Error retrieving resume" });
    }
}
