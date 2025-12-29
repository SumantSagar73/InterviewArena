import Groq from "groq-sdk";
import { ENV } from "../lib/env.js";
import Session from "../models/Session.js";

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
          ]
        }

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
            // Fallback to a simple error match
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
