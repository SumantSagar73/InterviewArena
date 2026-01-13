import Groq from "groq-sdk";
import { ENV } from "../lib/env.js";
import Session from "../models/Session.js";
import { AI_INTERVIEWER_PROMPT, AI_PREPARATION_PROMPT, AI_REPORT_PROMPT, AI_INTERVIEW_ASSISTANT_PROMPT } from "../lib/prompts.js";

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function analyzeCode(req, res) {
    try {
        const { sessionId, code, language, problemTitle } = req.body;

        if (sessionId) {
            const session = await Session.findById(sessionId);
            if (!session) return res.status(404).json({ message: "Session not found" });

            if (!session.isAnalyzerEnabled) {
                return res.status(403).json({ message: "Code analyzer is not enabled for this session" });
            }
        }

        const prompt = `
      You are an expert technical interviewer. 
      Analyze the following ${language} code for the problem "${problemTitle}".
      Provide 2-3 concise, helpful hints or observations without giving away the full solution.
      Focus on time/space complexity or edge cases.
      
      Code:
      ${code}
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: DEFAULT_MODEL,
        });

        const text = chatCompletion.choices[0]?.message?.content || "";

        res.status(200).json({ analysis: text });
    } catch (error) {
        console.error("Error in analyzeCode:", error.message);
        res.status(500).json({ message: "AI analysis failed" });
    }
}

export async function generateHint(req, res) {
    try {
        const { sessionId, problemTitle, currentHintsCount, code, language, problemDescription, previousHints } = req.body;
        const userId = req.user._id;

        let session = null;
        if (sessionId) {
            session = await Session.findById(sessionId);
            if (!session) return res.status(404).json({ message: "Session not found" });

            // Only host can generate hints (organizer)
            if (session.host.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Only the session host can generate hints" });
            }
        }

        const prompt = `
      You are an expert technical interviewer helping a candidate.
      Problem: ${problemTitle}
      Description: ${problemDescription || "No description provided."}
      
      The candidate is using ${language || "the current"} language.
      Current code progress:
      \`\`\`${language || ""}
      ${code || "/* No code yet */"}
      \`\`\`

      Current hints count: ${currentHintsCount}
      Previous hints provided (DO NOT REPEAT THESE):
      ${previousHints && previousHints.length > 0 ? previousHints.map((h, i) => `${i + 1}. ${h}`).join("\n") : "None yet."}
      
      Provide ONE NEW specific, helpful hint or critical code observation. 
      Instructions:
      1. CRITICAL: Do NOT repeat or rephrase the previous hints listed above.
      2. Analyze the candidate's code deeply for logic errors, missing edge cases, or incorrect assumptions relative to the problem.
      3. If you find a bug, point it out CLEARLY but without giving the exact fix. For example: "You are currently only checking 'a', but consider what happens when..."
      4. If the code is correct so far, suggest a next step or an optimization (Time/Space complexity).
      5. Keep it short (2-3 sentences max) and technically focused.
      6. If they have written no code yet, suggest an initial mental model or data structure to use.
    `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: DEFAULT_MODEL,
        });

        const hint = chatCompletion.choices[0]?.message?.content || "";

        if (session) {
            session.hints.push(hint);
            await session.save();
        }

        res.status(200).json({ hint });
    } catch (error) {
        console.error("Error in generateHint:", error.message);
        res.status(500).json({ message: "Failed to generate hint" });
    }
}

export async function analyzeResume(req, res) {
    try {
        const { resumeText, jobDescription } = req.body;

        const prompt = `
        You are an expert Career Coach and HR Specialist.
        Analyze the provided Resume ${jobDescription ? 'against the Job Description' : ''}.
        
        Return the analysis as a RAW JSON OBJECT. Do NOT include any markdown formatting like \`\`\`json.
        Return ONLY the JSON.

        JSON structure:
        {
          "score": number (0-100),
          "summary": "A brief 2-3 sentence overview",
          "matches": ["skill/experience match 1", "match 2", "match 3"],
          "gaps": ["missing skill/weak area 1", "gap 2", "gap 3"],
          "advice": ["strategic advice 1", "advice 2"],
          "questions": [
            { "type": "Technical", "question": "..." },
            { "type": "Behavioral", "question": "..." },
            { "type": "Technical", "question": "..." }
          ],
          "missingSkills": [
            {
              "skill": "Name of the missing skill (e.g., Docker, Kubernetes, TypeScript)",
              "importance": "High" | "Medium" | "Low",
              "chatgptPrompt": "A ready-to-paste ChatGPT prompt that helps the candidate learn this skill step-by-step. Include: learning objectives, recommended timeline (1-4 weeks), hands-on projects, and key concepts to master. Make it specific and actionable.",
              "readinessGuideline": "A specific milestone or project that indicates when the candidate can confidently add this skill to their resume. Be concrete (e.g., 'After deploying a containerized application to production' rather than 'After learning the basics')."
            }
          ]
        }

        For the missingSkills array:
        1. Identify 3-5 key skills that are missing from the resume ${jobDescription ? 'but required/preferred in the job description' : 'but are in-demand for their apparent career path'}.
        2. Prioritize skills by their importance (High = critical for the role, Medium = beneficial, Low = nice-to-have).
        3. The chatgptPrompt should be self-contained and ready to paste directly into ChatGPT.
        4. The readinessGuideline should specify a concrete achievement (project, certification, or measurable outcome) that proves competency.

        RESUME:
        ${resumeText}

        ${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : ''}
      `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: DEFAULT_MODEL,
            response_format: { type: "json_object" }
        });

        const analysisText = chatCompletion.choices[0]?.message?.content || "{}";
        let analysis = {};
        try {
            analysis = JSON.parse(analysisText);
        } catch (e) {
            console.error("Failed to parse AI JSON:", analysisText);
            analysis = { error: "Failed to parse analysis" };
        }

        res.status(200).json({ analysis });
    } catch (error) {
        console.error("Error in analyzeResume:", error.message);
        res.status(500).json({ message: "Resume analysis failed" });
    }
}

export async function toggleAnalyzerVote(req, res) {
    try {
        const { sessionId } = req.params;
        const clerkId = req.user.clerkId;

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        const voteIndex = session.analyzerVotes.indexOf(clerkId);
        if (voteIndex > -1) {
            session.analyzerVotes.splice(voteIndex, 1);
        } else {
            session.analyzerVotes.push(clerkId);
        }

        await session.save();
        res.status(200).json({ analyzerVotes: session.analyzerVotes });
    } catch (error) {
        console.error("Error in toggleAnalyzerVote:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function enableAnalyzer(req, res) {
    try {
        const { sessionId } = req.params;
        const userId = req.user._id;

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        if (session.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Only host can enable the analyzer" });
        }

        session.isAnalyzerEnabled = true;
        await session.save();

        res.status(200).json({ isAnalyzerEnabled: true });
    } catch (error) {
        console.error("Error in enableAnalyzer:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


export async function chatAIInterview(req, res) {
    try {
        const { messages, currentTopic } = req.body; // Expects an array of { role: "user" | "assistant", content: string }

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: "Invalid messages format" });
        }

        const topicHint = currentTopic ? `\n\nCURRENT INTERVIEW TOPIC: ${currentTopic}. Ensure your questions and responses are strictly focused on this segment.` : "";
        const systemMessage = { role: "system", content: AI_INTERVIEWER_PROMPT + topicHint };
        const conversation = [systemMessage, ...messages];

        const chatCompletion = await groq.chat.completions.create({
            messages: conversation,
            model: DEFAULT_MODEL,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "";

        res.status(200).json({ reply });
    } catch (error) {
        console.error("Error in chatAIInterview:", error.message);
        res.status(500).json({ message: "Interview chat failed" });
    }
}

export async function generateInterviewPlan(req, res) {
    try {
        const { resumeText, customTopics } = req.body;

        if (!resumeText && (!customTopics || customTopics.length === 0)) {
            return res.status(400).json({ message: "Resume text or custom topics are required" });
        }

        const prompt = `
        ${AI_PREPARATION_PROMPT}

        RESUME TEXT:
        ${resumeText}

        ${customTopics ? `CUSTOM INTERVIEW TOPICS/SEQUENCE:
        ${JSON.stringify(customTopics, null, 2)}` : ""}

        INSTRUCTIONS:
        1. If custom topics are provided, ensure your plan reflects those topics.
        2. Assign difficulty levels and key questions for each topic.
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: DEFAULT_MODEL,
            response_format: { type: "json_object" }
        });

        const planText = chatCompletion.choices[0]?.message?.content || "{}";
        let plan = {};
        try {
            plan = JSON.parse(planText);
        } catch (e) {
            console.error("Failed to parse Interview Plan JSON:", planText);
            return res.status(500).json({ message: "Failed to parse interview plan" });
        }

        res.status(200).json({ plan });
    } catch (error) {
        console.error("Error in generateInterviewPlan:", error.message);
        res.status(500).json({ message: "Interview preparation failed" });
    }
}

export async function generateInterviewReport(req, res) {
    try {
        const { messages, topics, resumeText, code } = req.body;

        if (!messages || messages.length === 0) {
            return res.status(400).json({ message: "No interview messages found" });
        }

        const prompt = `
        ${AI_REPORT_PROMPT}

        RESUME:
        ${resumeText || "N/A"}

        TOPICS:
        ${JSON.stringify(topics, null, 2)}

        TRANSCRIPT:
        ${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")}

        FINAL CODE:
        ${code || "N/A"}
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: DEFAULT_MODEL,
        });

        const report = chatCompletion.choices[0]?.message?.content || "";

        res.status(200).json({ report });
    } catch (error) {
        console.error("Error in generateInterviewReport:", error.message);
        res.status(500).json({ message: "Failed to generate interview report" });
    }
}

export async function generateQuestionSuggestions(req, res) {
    try {
        const { resumeText, config, codingProblemLink, currentPhase } = req.body;

        const prompt = `
        ${AI_INTERVIEW_ASSISTANT_PROMPT}

        ---------------------------------------
        LIVE INPUT FOR THIS CALL
        ---------------------------------------

        RESUME:
        ${resumeText || "No resume provided."}

        CONFIGURATION:
        - Target Role: ${config?.role || "Software Engineer"}
        - Difficulty: ${config?.difficulty || "Medium"}
        - Allowed Topics: ${config?.topics?.join(", ") || "General Technical"}

        CODING CONTEXT:
        ${codingProblemLink ? `Problem Link: ${codingProblemLink}` : "No specific coding problem linked."}

        CURRENT PHASE:
        ${currentPhase || "Technical Discussion"}

        ---------------------------------------
        ACTION: Generate ONE suggested question in JSON format.
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: DEFAULT_MODEL,
            response_format: { type: "json_object" }
        });

        const content = chatCompletion.choices[0]?.message?.content || "{}";
        let suggestion;
        try {
            suggestion = JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse AI JSON response:", content);
            suggestion = {
                suggested_question: "Could you tell me about a challenging technical project you've worked on recently?",
                question_type: "practical",
                related_topic: "Experience",
                recommended_next_step: "continue_discussion"
            };
        }

        res.status(200).json(suggestion);
    } catch (error) {
        console.error("Error in generateQuestionSuggestions:", error.message);
        res.status(500).json({ message: "Failed to generate question suggestion" });
    }
}


