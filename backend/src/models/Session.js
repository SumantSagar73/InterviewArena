import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    // Resume-based interview fields
    resume: {
      url: String,
      fileName: String,
      uploadedBy: String,
      data: String, // Base64 encoded file data
      contentType: String, // MIME type
    },
    topics: {
      type: [String],
      default: [],
    },
    aiGeneratedQuestions: {
      type: [
        {
          question: String,
          category: String, // e.g., 'technical', 'behavioral', 'project-based'
          source: String, // 'resume' or 'topic'
        },
      ],
      default: [],
    },

    // Legacy fields (optional, for backward compatibility)
    problem: {
      type: String,
      required: false,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: false,
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    // stream video call ID
    callId: {
      type: String,
      default: "",
    },
    analyzerVotes: {
      type: [String], // Array of clerkIds who voted for analysis
      default: [],
    },
    isAnalyzerEnabled: {
      type: Boolean,
      default: false,
    },
    hints: {
      type: [String],
      default: [],
    },
    sessionCode: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
