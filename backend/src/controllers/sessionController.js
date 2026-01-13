import { chatClient, streamClient } from "../lib/stream.js";
import Session from "../models/Session.js";

const generateSessionCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export async function createSession(req, res) {
  try {
    const { problem, difficulty, topics, resumeText } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    // New workflow: Can create session without problem/difficulty
    // Either with resume/topics OR legacy problem/difficulty

    // generate a unique call id for stream video
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Generate a unique room code
    let sessionCode;
    let isUnique = false;
    while (!isUnique) {
      sessionCode = generateSessionCode();
      const existing = await Session.findOne({ sessionCode });
      if (!existing) isUnique = true;
    }

    // create session in db
    const sessionData = {
      host: userId,
      callId,
      sessionCode,
    };

    // Add legacy fields if provided
    if (problem) sessionData.problem = problem;
    if (difficulty) sessionData.difficulty = difficulty;

    // Add new fields if provided
    if (topics) sessionData.topics = topics;

    const session = await Session.create(sessionData);

    // create stream video call
    const customData = { sessionId: session._id.toString() };
    if (problem) customData.problem = problem;
    if (difficulty) customData.difficulty = difficulty;
    if (topics) customData.topics = topics;

    const createdCall = await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: customData,
      },
    });



    // chat messaging
    const channelName = problem ? `${problem} Session` : "Interview Session";
    const channel = chatClient.channel("messaging", callId, {
      name: channelName,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();


    res.status(201).json({ session });
  } catch (error) {
    console.error("Error in createSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSessionByCode(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!code) return res.status(400).json({ message: "Session code is required" });

    const session = await Session.findOne({ sessionCode: code.toUpperCase(), status: "active" });

    if (!session) return res.status(404).json({ message: "Active session with this code not found" });

    if (session.host.toString() === userId.toString()) {
      return res.status(200).json({ session, message: "Host rejoining" });
    }

    // check if session is already full - has a participant
    if (session.participant && session.participant.toString() !== userId.toString()) {
      return res.status(409).json({ message: "Session is full" });
    }

    if (!session.participant) {
      session.participant = userId;
      await session.save();

      const channel = chatClient.channel("messaging", session.callId);
      await channel.addMembers([clerkId]);
    }

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in joinSessionByCode controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId")
      .populate("participant", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    // get sessions where user is either host or participant
    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.error("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(200).json({ session });
    }

    // check if session is already full - has a participant
    if (session.participant) return res.status(409).json({ message: "Session is full" });

    session.participant = userId;
    await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.error("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    // delete stream chat channel
    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.error("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Add topics to session
export async function addTopics(req, res) {
  try {
    const { id } = req.params;
    const { topics } = req.body;
    const userId = req.user._id;

    console.log("addTopics called with:", { id, topics, userId });

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: "Topics array is required" });
    }

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Only host can add topics
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can add topics" });
    }

    // Initialize topics array if it doesn't exist
    if (!session.topics) {
      session.topics = [];
    }

    session.topics = [...new Set([...session.topics, ...topics])]; // Avoid duplicates
    await session.save();

    res.json({ message: "Topics added successfully", topics: session.topics });
  } catch (error) {
    console.error("Error in addTopics controller:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

// Get session questions
export async function getSessionQuestions(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({ questions: session.aiGeneratedQuestions });
  } catch (error) {
    console.error("Error in getSessionQuestions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
