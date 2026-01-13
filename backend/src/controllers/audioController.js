
import Groq from "groq-sdk";
import { ENV } from "../lib/env.js";
import fs from "fs";
import dotenv from "dotenv";

// Reload env to ensure we have latest values
dotenv.config();

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel Voice

export async function transcribeAudio(req, res) {
    try {
        if (!req.file) {
            console.error("Transcription failed: No file uploaded");
            return res.status(400).json({ message: "No audio file provided" });
        }

        // Use the latest key from process.env to be sure
        const apiKey = ENV.GROQ_API_KEY || process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: "Groq API Key missing" });
        }

        const groq = new Groq({ apiKey });

        // Using whisper-large-v3
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: "whisper-large-v3",
            response_format: "json",
            language: "en",
            temperature: 0.0,
        });

        // Cleanup uploaded file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting temp file:", err);
        });

        res.status(200).json({ text: transcription.text });
    } catch (error) {
        console.error("Error in transcribeAudio detail:", error);
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }

        res.status(500).json({
            message: "Transcription failed",
            error: error.message,
            details: error.response?.data || null
        });
    }
}

export async function generateSpeech(req, res) {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Text is required" });
        }

        let apiKey = ENV.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            console.error("Missing ELEVENLABS_API_KEY");
            return res.status(500).json({ message: "Server Configuration Error: Missing TTS API Key" });
        }

        apiKey = apiKey.trim();

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_flash_v2_5",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("ElevenLabs API Error:", response.status, errorText);
            throw new Error(`ElevenLabs API Error: ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader("Content-Type", "audio/mpeg");
        res.send(buffer);

    } catch (error) {
        console.error("Error in generateSpeech:", error);
        res.status(500).json({ message: "TTS generation failed", details: error.message });
    }
}
