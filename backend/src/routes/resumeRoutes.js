import express from "express";
import multer from "multer";
import { protectRoute } from "../middleware/protectRoute.js";
import { uploadResume, analyzeResumeAndGenerateQuestions, getResume } from "../controllers/resumeController.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only PDF, DOCX, and TXT files are allowed."));
        }
    },
});

router.post("/upload", protectRoute, upload.single("resume"), uploadResume);
router.post("/analyze", protectRoute, analyzeResumeAndGenerateQuestions);
router.get("/:sessionId/file", protectRoute, getResume);

export default router;
