
import express from "express";
import multer from "multer";
import { protectRoute } from "../middleware/protectRoute.js";
import { transcribeAudio, generateSpeech } from "../controllers/audioController.js";
import os from "os";

const router = express.Router();

// Storage config to preserve file extension for Groq/Whisper
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = ".webm"; // We know frontend sends webm
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });

// POST /api/audio/transcribe
router.post("/transcribe", protectRoute, upload.single("audio"), transcribeAudio);

// POST /api/audio/speak
router.post("/speak", protectRoute, generateSpeech);

export default router;
