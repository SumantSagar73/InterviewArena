import express from "express";
import path from "path";
import cors from "cors";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";
import versionRoutes from "./routes/versionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import audioRoutes from "./routes/audioRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";

const app = express();

const __dirname = path.resolve();

// middleware
app.use(express.json({ limit: "10mb" })); // Increase JSON body limit for resume text
app.use(express.urlencoded({ limit: "10mb", extended: true }));
// credentials:true meaning?? => server allows a browser to include cookies on request
// Support multiple origins (comma-separated) or '*' in CLIENT_URL for local dev
const rawClientUrl = ENV.CLIENT_URL || "";
const allowedOrigins = rawClientUrl.split(",").map((s) => s.trim()).filter(Boolean);

app.use((req, res, next) => {
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser tools (curl, server-to-server) which have no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS policy: origin not allowed"));
    },
    credentials: true,
  })
);
app.use(clerkMiddleware({
  publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  secretKey: ENV.CLERK_SECRET_KEY,
})); // this adds auth field to request object: req.auth()

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/versions", versionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/resume", resumeRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// make our app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const startServer = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => console.log("Server is running on port:", ENV.PORT));
  } catch (error) {
    console.error("💥 Error starting the server", error);
  }
};

startServer();
