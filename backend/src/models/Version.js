import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    problemId: {
      type: String, // String ID for solo mode problems (e.g., "two-sum")
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Version = mongoose.model("Version", versionSchema);

export default Version;
