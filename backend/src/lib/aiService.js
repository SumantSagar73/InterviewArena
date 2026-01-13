import Groq from "groq-sdk";
import mammoth from "mammoth";
import { createRequire } from "module";
import { ENV } from "./env.js";

const require = createRequire(import.meta.url);
// Handle potential default export or direct export
let pdfParse = require("pdf-parse");
// For pdf-parse v1.1.1, it should be a function directly. 
// If it's wrapped in default (common in some ESM/CJS interops), unwrap it.
if (typeof pdfParse !== 'function' && pdfParse.default) {
    pdfParse = pdfParse.default;
}

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const MODEL_NAME = "llama-3.3-70b-versatile";

async function getGroqCompletion(systemPrompt, userPrompt) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            model: MODEL_NAME,
            temperature: 0.5,
            response_format: { type: "json_object" },
        });

        return completion.choices[0]?.message?.content || "{}";
    } catch (error) {
        console.error("Groq API Error:", error);
        // Fallback or rethrow
        throw error;
    }
}

export async function analyzeResume(resumeText) {
    const systemPrompt = `
You are an expert interviewer. Analyze the resume provided by the user and generate 15-20 relevant interview questions.
Output the result in strict JSON format.
Ensure the output is valid JSON.
`;

    const userPrompt = `
Resume Content:
${resumeText}

Generate questions in these categories:
1. Technical Skills
2. Project Experience
3. Behavioral/Situational
4. Problem-Solving

Required JSON Structure:
{
  "questions": [
    {
      "question": "Question text",
      "category": "technical|behavioral|project-based|problem-solving",
      "source": "resume"
    }
  ],
  "suggestedTopics": ["topic1", "topic2", "topic3"]
}
`;

    try {
        const jsonString = await getGroqCompletion(systemPrompt, userPrompt);
        // Clean up markdown code blocks if present
        const cleanJson = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Error analyzing resume:", error);
        throw new Error("Failed to analyze resume with AI.");
    }
}

export async function generateTopicQuestions(topics, difficulty = "Mixed") {
    const systemPrompt = `
You are an expert interviewer. Generate 10-15 relevant interview questions based on the provided topics.
The difficulty level should be: ${difficulty}.
Output the result in strict JSON format.
`;

    const userPrompt = `
Topics: ${topics.join(", ")}
Difficulty: ${difficulty}

Generate questions covering:
1. Fundamental concepts
2. Practical applications
3. Problem-solving scenarios
4. Best practices

Required JSON Structure:
{
  "questions": [
    {
      "question": "Question text",
      "category": "technical|conceptual|practical",
      "source": "topic",
      "topic": "related topic name"
    }
  ]
}
`;

    try {
        const jsonString = await getGroqCompletion(systemPrompt, userPrompt);
        const cleanJson = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Error generating topic questions:", error);
        throw new Error("Failed to generate questions with AI.");
    }
}

export async function extractTextFromResume(fileBuffer, mimeType) {
    try {
        if (!fileBuffer || fileBuffer.length === 0) return "";

        if (mimeType === "application/pdf") {
            if (typeof pdfParse !== 'function') {
                console.error("pdf-parse library is not loaded correctly. Type:", typeof pdfParse, "Value:", pdfParse);
                throw new Error("PDF parsing library unavailable");
            }
            // console.log("Using pdf-parse to extract text...");
            const data = await pdfParse(fileBuffer);
            return data.text;
        } else if (
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            return result.value || "";
        } else if (mimeType === "text/plain") {
            return fileBuffer.toString("utf-8");
        }
        return "";
    } catch (error) {
        console.error("Error extracting text from resume:", error);
        return "";
    }
}
