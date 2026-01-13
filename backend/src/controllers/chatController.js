import { chatClient } from "../lib/stream.js";

export async function getStreamToken(req, res) {
  try {
    // Ensure the Stream user exists/upsert before issuing a token
    const streamUser = {
      id: req.user.clerkId,
      name: req.user.name,
      image: req.user.image,
    };

    try {
      await chatClient.upsertUser(streamUser);
    } catch (err) {
      console.error("Failed to upsert Stream user:", err?.message || err);
    }

    // create a token for the Stream user
    const token = chatClient.createToken(req.user.clerkId);

    res.status(200).json({
      token,
      userId: req.user.clerkId,
      userName: req.user.name,
      userImage: req.user.image,
    });
  } catch (error) {
    console.error("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
