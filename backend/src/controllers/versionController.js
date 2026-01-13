import Version from "../models/Version.js";
import mongoose from "mongoose";

export async function createVersion(req, res) {
    try {
        const { sessionId, problemId, code, language, name } = req.body;
        const userId = req.user._id;

        if (!problemId || !code || !language) {
            return res.status(400).json({ message: "problemId, code, and language are required" });
        }

        const version = await Version.create({
            sessionId: sessionId || null,
            problemId,
            userId,
            code,
            language,
            name: name || "",
        });

        res.status(201).json({ version });
    } catch (error) {
        console.error("Error in createVersion controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getVersions(req, res) {
    try {
        const { targetId } = req.params; // targetId can be sessionId or problemId
        const userId = req.user._id;

        const orConditions = [{ problemId: targetId }];

        if (mongoose.Types.ObjectId.isValid(targetId)) {
            orConditions.push({ sessionId: targetId });
        }

        const query = {
            userId,
            $or: orConditions,
        };

        const versions = await Version.find(query).sort({ createdAt: -1 });

        res.status(200).json({ versions });
    } catch (error) {
        console.error("Error in getVersions controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getVersionById(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const version = await Version.findOne({ _id: id, userId });

        if (!version) {
            return res.status(404).json({ message: "Version not found or unauthorized" });
        }

        res.status(200).json({ version });
    } catch (error) {
        console.error("Error in getVersionById controller:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
