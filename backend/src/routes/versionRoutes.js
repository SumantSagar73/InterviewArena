import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    createVersion,
    getVersionById,
    getVersions,
} from "../controllers/versionController.js";

const router = express.Router();

router.post("/", protectRoute, createVersion);
router.get("/history/:targetId", protectRoute, getVersions);
router.get("/:id", protectRoute, getVersionById);

export default router;
